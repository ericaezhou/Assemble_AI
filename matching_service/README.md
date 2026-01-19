# Assemble AI Matching Service

Lightweight Python service that computes top-K researcher matches using weighted
embeddings from the multilingual `BAAI/bge-m3` model. The Node backend calls this
service for recommendations while enforcing hard constraints (same conference,
different institution, not self).

## Quick Start

```bash
cd matching_service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

Health check:

```bash
curl http://localhost:8001/health
```

## Local Matching (No Server)

Run the matching logic directly with a custom `k`:

```bash
python examples/run_match.py --k 3
```

Provide your own input file:

```bash
python examples/run_match.py --k 5 --input path/to/your_input.json
```

## Request Schema

`POST /match`

```json
{
  "user": {
    "id": 1,
    "institution": "Stanford",
    "research_areas": "vision, robotics",
    "interests": "neural networks, perception",
    "bio": "..."
  },
  "candidates": [
    {
      "id": 2,
      "institution": "MIT",
      "research_areas": "robotics",
      "interests": "control",
      "bio": "..."
    }
  ],
  "k": 10,
  "weights": {
    "research_areas": 3,
    "interests": 2,
    "bio": 1
  }
}
```

Note: if `k` exceeds the number of candidates, all candidates are returned.

Response:

```json
{
  "matches": [
    {
      "id": 2,
      "institution": "MIT",
      "research_areas": "robotics",
      "interests": "control",
      "bio": "...",
      "score": 0.4215
    }
  ]
}
```
