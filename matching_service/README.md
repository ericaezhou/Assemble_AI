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

Start the service:

```bash
python app.py
```

Select embedder model via env vars:

```bash
set EMBEDDER_TYPE=bge-m3
set EMBEDDER_MODEL=BAAI/bge-m3
set DEVICE=cpu
```

API endpoint:

`POST /api/u2u/matches`
