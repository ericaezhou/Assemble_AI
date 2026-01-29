# Matching Service

Smart attendee matching engine for Assemble AI.

## Matching Scenarios

| Scenario | Method | Description |
|----------|--------|-------------|
| **Host → Users** | `host_match()` | Find best attendees for an event |
| **User ↔ User** | `match_users()` | Match users by experience + interests |

## Architecture

```
engine.py      →  Entry point (MatchingEngine)
    ↓
algos.py       →  Core algorithms (scoring, MMR, matching)
    ↓
adapters.py    →  Pluggable components (Embedder, Retriever)
    ↓
matching_pojo.py →  Data models (UserProfile, MatchingParams)
```

## Quick Start

```python
from matching.matching_pojo import MatchingParams, UserProfile
from matching.adapters import Qwen3Embedder, InMemoryRetriever, build_user_vectors
from matching.engine import MatchingEngine

# 1. Setup
embedder = Qwen3Embedder(device="cpu")
engine = MatchingEngine(embedder=embedder, retriever=InMemoryRetriever())
params = MatchingParams()

# 2. Prepare users
users = [
    UserProfile(user_id="u1", name="Alice", exp_text="ML engineer...", ...),
    UserProfile(user_id="u2", name="Bob", exp_text="Product manager...", ...),
]
build_user_vectors(users, embedder)

# 3. Match
results = engine.host_match("AI agents meetup", users, params)
```

## Entry Points

### Host → Users
```python
engine.host_match(host_text, users, params) → List[RankedUser]
```

### User ↔ User
```python
engine.match_users(users, params, top_k=5) → Dict[UserId, List[RankedUser]]
```

## Core Algorithms

**Multi-dimensional Scoring:**
```
score = w_exp × cos(exp) + w_interest × cos(interest)
```

**MMR Diversity Selection:**
```
MMR = λ × relevance - (1-λ) × similarity_to_selected
```

## Installation

```bash
pip install numpy scikit-learn pydantic sentence-transformers torch
```

## Service API

Start the service (default embedder is `qwen` if not set):

```bash
python app.py
```

## Step-by-step (local)

1) Create and activate a virtual environment (once):

```bash
cd matching_service
python -m venv .venv
.\.venv\Scripts\activate
```

2) Install dependencies:

```bash
python -m pip install -r requirements.txt
```

3) Configure Supabase credentials (create `matching_service/.env`):

```
SUPABASE_URL=...
SUPABASE_KEY=...
```

4) (Optional) Select embedder model via env vars (set these **before** running `app.py`):

```bash
set EMBEDDER_TYPE=bge-m3
set EMBEDDER_MODEL=BAAI/bge-m3
set DEVICE=cpu
```

Example: use Qwen explicitly (optional):

```bash
set EMBEDDER_TYPE=qwen
set EMBEDDER_MODEL=Qwen/Qwen3-Embedding-0.6B
set DEVICE=cpu
```

5) Start the service:

```bash
python app.py
```

6) Test the API (example):

```bash
python .\test\test_app.py
```

API endpoint:

`POST /api/u2u/matches`
