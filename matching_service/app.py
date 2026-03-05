# app.py
from __future__ import annotations

import os
from uuid import UUID
from typing import Any

from flask import Flask, request, jsonify
from dotenv import load_dotenv

from service.u2u_service import MatchingService

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

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
        matches = SERVICE.find_matches_without_reasons(
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


@app.post("/api/u2u/event-matches")
def u2u_event_matches():
    """
    Event-scoped user-to-user matching.

    Request JSON:
      {
        "target_id": "<uuid-string>",
        "event_id": "<event-id>",
        "top_k": 5,                 # optional
        "min_score": 0.0,           # optional
        "apply_mmr": true,          # optional
        "mmr_lambda": 0.5           # optional
      }
    """
    data = request.get_json(silent=True) or {}

    target_id_str = data.get("target_id")
    event_id = (data.get("event_id") or "").strip()
    if not target_id_str:
        return jsonify({"error": "Missing field: target_id"}), 400
    if not event_id:
        return jsonify({"error": "Missing field: event_id"}), 400

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

    try:
        matches = SERVICE.find_matches_in_event_without_reasons(
            user_id=target_id,
            event_id=event_id,
            top_k=top_k,
            min_score=min_score,
            apply_mmr=apply_mmr,
            mmr_lambda=mmr_lambda,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Internal error: {e}"}), 500

    return jsonify(
        to_jsonable({
            "target_id": target_id,
            "event_id": event_id,
            "matches": matches,
        })
    )


@app.post("/api/u2u/match-reason")
def u2u_match_reason():
    """
    Generate one match reason on demand.

    Request JSON:
      {
        "target_id": "<uuid-string>",
        "matched_user_id": "<uuid-string>",
        "score": 0.42,                # optional
        "exp_similarity": 0.31,       # optional
        "interest_similarity": 0.55   # optional
      }
    """
    data = request.get_json(silent=True) or {}

    target_id_str = data.get("target_id")
    matched_user_id_str = data.get("matched_user_id")
    if not target_id_str:
        return jsonify({"error": "Missing field: target_id"}), 400
    if not matched_user_id_str:
        return jsonify({"error": "Missing field: matched_user_id"}), 400

    try:
        target_id = UUID(str(target_id_str))
    except Exception:
        return jsonify({"error": "Invalid UUID format for target_id"}), 400

    try:
        matched_user_id = UUID(str(matched_user_id_str))
    except Exception:
        return jsonify({"error": "Invalid UUID format for matched_user_id"}), 400

    try:
        score = parse_float_bounded(
            data.get("score"),
            field_name="score",
            default=0.1,
            min_value=0.0,
            max_value=1.0,
        )
        exp_similarity = parse_float_bounded(
            data.get("exp_similarity"),
            field_name="exp_similarity",
            default=0.1,
            min_value=0.0,
            max_value=1.0,
        )
        interest_similarity = parse_float_bounded(
            data.get("interest_similarity"),
            field_name="interest_similarity",
            default=0.1,
            min_value=0.0,
            max_value=1.0,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        result = SERVICE.generate_reason_for_pair(
            user_id=target_id,
            matched_user_id=matched_user_id,
            score=score,
            exp_similarity=exp_similarity,
            interest_similarity=interest_similarity,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Internal error: {e}"}), 500

    return jsonify(to_jsonable(result))


@app.post("/api/u2u/embeddings/rebuild")
def rebuild_embedding():
    """
    Rebuild and persist user_embedding for one user.
    Request JSON:
      { "user_id": "<uuid-string>" }
    """
    data = request.get_json(silent=True) or {}
    user_id_str = data.get("user_id")
    if not user_id_str:
        return jsonify({"error": "Missing field: user_id"}), 400

    try:
        user_id = UUID(str(user_id_str))
    except Exception:
        return jsonify({"error": "Invalid UUID format for user_id"}), 400

    try:
        result = SERVICE.rebuild_user_embedding(user_id)
        return jsonify(to_jsonable(result))
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Internal error: {e}"}), 500


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("MATCHING_PORT", "5000"))
    debug = os.getenv("DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)
