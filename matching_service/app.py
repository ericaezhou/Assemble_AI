# app.py
from __future__ import annotations

import os
from uuid import UUID
from typing import Any

from flask import Flask, request, jsonify
from dotenv import load_dotenv

from service.u2u_service import MatchingService

load_dotenv()

app = Flask(__name__)

TOP_K_MIN = 1
TOP_K_MAX = 50
MMR_LAMBDA_MIN_EXCLUSIVE = 0.0
MMR_LAMBDA_MAX_INCLUSIVE = 1.0

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


def parse_bool_strict(value: Any, *, field_name: str, default: bool) -> bool:
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, (int, float)):
        if value in (0, 1):
            return bool(value)
        raise ValueError(f"Invalid boolean for {field_name}: expected true/false (or 1/0)")

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n"}:
            return False

    raise ValueError(f"Invalid boolean for {field_name}: expected true/false (or 1/0)")


def parse_int_bounded(value: Any, *, field_name: str, default: int, min_value: int, max_value: int) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid integer for {field_name}")

    if parsed < min_value or parsed > max_value:
        raise ValueError(f"{field_name} must be between {min_value} and {max_value}")
    return parsed


def parse_float_bounded(value: Any, *, field_name: str, default: float, min_value: float, max_value: float, min_exclusive: bool = False) -> float:
    if value is None:
        return default
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid number for {field_name}")

    lower_ok = parsed > min_value if min_exclusive else parsed >= min_value
    upper_ok = parsed <= max_value
    if not (lower_ok and upper_ok):
        if min_exclusive:
            raise ValueError(f"{field_name} must be > {min_value} and <= {max_value}")
        raise ValueError(f"{field_name} must be between {min_value} and {max_value}")
    return parsed


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

    try:
        top_k = parse_int_bounded(
            data.get("top_k"),
            field_name="top_k",
            default=5,
            min_value=TOP_K_MIN,
            max_value=TOP_K_MAX,
        )
        min_score = parse_float_bounded(
            data.get("min_score"),
            field_name="min_score",
            default=0.0,
            min_value=0.0,
            max_value=1.0,
        )
        apply_mmr = parse_bool_strict(
            data.get("apply_mmr"),
            field_name="apply_mmr",
            default=True,
        )
        mmr_lambda = parse_float_bounded(
            data.get("mmr_lambda"),
            field_name="mmr_lambda",
            default=0.5,
            min_value=MMR_LAMBDA_MIN_EXCLUSIVE,
            max_value=MMR_LAMBDA_MAX_INCLUSIVE,
            min_exclusive=True,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    print(
        "[matching-service] /api/u2u/matches",
        {
            "target_id": str(target_id),
            "top_k": top_k,
            "min_score": min_score,
            "apply_mmr": apply_mmr,
            "mmr_lambda": mmr_lambda,
        },
    )

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
    port = int(os.getenv("PORT", "5200"))
    debug = os.getenv("DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)
