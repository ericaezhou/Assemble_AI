import asyncio
import os

from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

import linkedin

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/api/linkedin/scrape")
def scrape_profiles():
    body = request.get_json(silent=True) or {}
    urls = body.get("urls", [])

    if not urls or not isinstance(urls, list):
        return jsonify({"error": "Request body must include a 'urls' array"}), 400

    try:
        data = asyncio.run(linkedin.scrape_profile(urls))
        return jsonify({"profiles": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("LINKEDIN_PORT", "5200"))
    debug = bool(os.environ.get("DEBUG", True))

    app.run(host="0.0.0.0", port=port, debug=True)
