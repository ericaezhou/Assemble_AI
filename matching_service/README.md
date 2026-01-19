# Matching Service

Smart attendee matching engine for Assemble AI.

## Three Matching Scenarios

| Scenario | Method | Description |
|----------|--------|-------------|
| **Host → Users** | `host_match()` | Find best attendees for an event |
| **User ↔ User (Experience)** | `match_experience()` | Match users by background, interests, goals |
| **User ↔ User (Needs)** | `match_needs()` | Match users by what they're looking for |

## Architecture

```
engine.py      →  Entry point (MatchingEngine)
    ↓
algos.py       →  Core algorithms (scoring, MMR, matching)
    ↓
adapters.py    →  Pluggable components (Embedder, Retriever)
    ↓
types.py       →  Data models (UserProfile, MatchingParams)
```

## Quick Start

```python
from matching.types import MatchingParams, UserProfile
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

### User ↔ User (Experience)
```python
engine.match_experience(users, params, top_k=5) → Dict[UserId, List[RankedUser]]
```

### User ↔ User (Needs)
```python
engine.match_needs(users, params, mode=NeedMatchMode.RECIPROCAL) → Dict[UserId, List[RankedUser]]
```

## Core Algorithms

**Multi-dimensional Scoring:**
```
score = 0.5 × cos(exp) + 0.3 × cos(interest) + 0.2 × cos(goal)
```

**MMR Diversity Selection:**
```
MMR = λ × relevance - (1-λ) × similarity_to_selected
```

## Installation

```bash
pip install numpy scikit-learn pydantic sentence-transformers torch
```

## Run Demo

```bash
python scripts/demo_qwen3.py
```
