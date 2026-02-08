from __future__ import annotations

import os
from uuid import UUID
from typing import Any

from flask import Flask, request, jsonify

from service.parsing.parsing_service import ParsingService

app = Flask(__name__)

PARSING_SERVICE = ParsingService()


def to_jsonable(x: Any) -> Any:
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


@app.post("/api/parsing/upload")
def parsing_upload():
    user_id = request.form.get("user_id")
    file = request.files.get("file")

    if not user_id:
        return jsonify({"error": "Missing field: user_id"}), 400
    if not file:
        return jsonify({"error": "Missing file upload"}), 400

    try:
        job_id = PARSING_SERVICE.create_job(UUID(str(user_id)), file)
        PARSING_SERVICE.start_job(job_id)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"job_id": str(job_id), "status": "pending"})


@app.get("/api/parsing/status")
def parsing_status():
    job_id = request.args.get("job_id")
    if not job_id:
        return jsonify({"error": "Missing query param: job_id"}), 400

    try:
        job = PARSING_SERVICE.get_job(UUID(str(job_id)))
        if not job:
            return jsonify({"error": "Job not found"}), 404
        return jsonify(to_jsonable(job.to_dict()))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.get("/api/parsing/result")
def parsing_result():
    job_id = request.args.get("job_id")
    if not job_id:
        return jsonify({"error": "Missing query param: job_id"}), 400

    try:
        job = PARSING_SERVICE.get_job(UUID(str(job_id)))
        if not job:
            return jsonify({"error": "Job not found"}), 404
        if not job.parsed_data:
            return jsonify({"error": f"No parsed data available. status={job.status}"}), 409
        return jsonify(to_jsonable({"job_id": job_id, "parsed_data": job.parsed_data}))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.post("/api/parsing/confirm")
def parsing_confirm():
    data = request.get_json(silent=True) or {}
    job_id = data.get("job_id")
    overrides = data.get("overrides")

    if not job_id:
        return jsonify({"error": "Missing field: job_id"}), 400

    try:
        final_data = PARSING_SERVICE.confirm_job(UUID(str(job_id)), overrides=overrides)
        return jsonify(to_jsonable({"job_id": job_id, "status": "confirmed", "parsed_data": final_data}))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5100"))
    debug = os.getenv("DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)
