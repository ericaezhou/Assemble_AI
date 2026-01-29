# app.py
from __future__ import annotations

import os
from uuid import UUID
from typing import Any

from flask import Flask, request, jsonify

from service.u2u_service import MatchingService

app = Flask(__name__)

# ---- Initialize once (important for performance) ----
SERVICE = MatchingService(
    embedder_type=os.getenv("EMBEDDER_TYPE", "qwen"),
    embedder_model=os.getenv("EMBEDDER_MODEL"),
    device=os.getenv("DEVICE", "cpu"),
    cache_vectors=True,
)


def to_jsonable(x: Any) -> Any:
    """Recursively convert objects (UUID, etc.) into JSON-serializable types."""
    if isinstance(x, UUID):
        return str(x)
    if isinstance(x, dict):
        return {k: to_jsonable(v) for k, v in x.items()}
    if isinstance(x, list):
        return [to_jsonable(v) for v in x]
    if isinstance(x, tuple):
        return [to_jsonable(v) for v in x]
    return x


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/u2u/matches")
def u2u_matches():
    """
    Request JSON:
      {
        "target_id": "<uuid-string>",
        "top_k": 5,                 # optional
        "min_score": 0.0,           # optional
        "apply_mmr": true,          # optional
        "mmr_lambda": 0.5           # optional
      }

    Response JSON:
      {
        "target_id": "<uuid-string>",
        "matches": [
          { "user_id": "...", "name": "...", "role": "...", "score": 0.12, "reason": "...", ... }
        ]
      }
    """
    data = request.get_json(silent=True) or {}

    target_id_str = data.get("target_id")
    if not target_id_str:
        return jsonify({"error": "Missing field: target_id"}), 400

    try:
        target_id = UUID(str(target_id_str))
    except Exception:
        return jsonify({"error": "Invalid UUID format for target_id"}), 400

    top_k = int(data.get("top_k", 5))
    min_score = float(data.get("min_score", 0.0))
    apply_mmr = bool(data.get("apply_mmr", True))
    mmr_lambda = float(data.get("mmr_lambda", 0.5))

    try:
        matches = SERVICE.find_matches_with_reasons(
            user_id=target_id,
            top_k=top_k,
            min_score=min_score,
            apply_mmr=apply_mmr,
            mmr_lambda=mmr_lambda,
        )
    except ValueError as e:
        # e.g. user not found
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Internal error: {e}"}), 500

    return jsonify(
        to_jsonable({
            "target_id": target_id,
            "matches": matches,
        })
    )


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)
