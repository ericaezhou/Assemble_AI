# Matching Service

Smart matching service module for Assemble AI, supporting host-to-attendee matching, experience-based matching, and needs-based matching between attendees.

## Project Structure

```
matching_service/
├── src/matching/
│   ├── types.py      # Data structure definitions
│   ├── adapters.py   # Pluggable components (Embedder, Retriever, Reranker)
│   ├── algos.py      # Core algorithm implementations
│   └── engine.py     # Business logic orchestration
├── scripts/
│   ├── demo.py       # TF-IDF basic demo
│   └── demo_qwen3.py # Qwen3 Embedding comparison test
└── tests/
```

---

## File Descriptions

### 1. `types.py` - Data Structures

Defines all core data models.

| Class | Description |
|---|---|
| `UserProfile` | User profile with structured fields and text fields |
| `MatchingParams` | Algorithm hyperparameter configuration |
| `RankedUser` | Match result (user_id + score + rationale) |
| `UserPair` | Pair result (for 1v1 matching scenarios) |
| `NeedMatchMode` | Enum: `RECIPROCAL` (mutual) / `BIPARTITE` (supply-demand) |

**UserProfile Main Fields:**

```python
UserProfile(
    user_id="u01",
    name="Alice",
    language="en",                    # Language (for filtering)
    tags=["LLM", "RAG"],              # Tags (for hard filtering)
    exp_text="ML engineer...",        # Background experience
    interest_text="LLM agents...",    # Interest areas
    goal_text="Meet builders...",     # Event goals
    need_query="Looking for...",      # Need description (for needs matching)
    # Vector cache (auto-filled by Embedder)
    v_profile=None,                   # Combined profile vector
    v_exp=None, v_interest=None, v_goal=None, v_need=None,
)
```

**MatchingParams Main Parameters:**

```python
MatchingParams(
    # Host -> Users
    host_recall_top_n=1000,   # Recall count
    host_return_top_k=100,    # Final return count
    host_mmr_lambda=0.6,      # MMR diversity factor (1.0 = pure relevance)
    
    # Multi-dimensional weights (sum to 1.0)
    w_exp=0.5,                # Experience similarity weight
    w_interest=0.3,           # Interest similarity weight
    w_goal=0.2,               # Goal similarity weight
    
    # User <-> User
    user_top_l=20,            # Top-L neighbors per user
    history_penalty=0.8,      # Historical match penalty coefficient
)
```

---

### 2. `adapters.py` - Pluggable Components

Defines interfaces and MVP implementations for easy replacement.

**Embedder (Text Encoder):**

| Class | Description | Requires fit |
|---|---|---|
| `TfidfEmbedder` | TF-IDF vectors, suitable for MVP testing |  Yes |
| `Qwen3Embedder` | Qwen3-Embedding-0.6B, multilingual support | No |
| `SentenceTransformerEmbedder` | Generic HuggingFace models | No |
| `OpenAIEmbedder` | OpenAI API (placeholder) | No |

**Retriever:**

| Class | Description |
|---|---|
| `InMemoryRetriever` | In-memory brute-force search (for MVP) |

**Reranker:**

| Class | Description |
|---|---|
| `NoOpReranker` | No reranking (default) |

**Utility Functions:**

```python
# Batch fill user vectors
build_user_vectors(users, embedder, build_profile=True, overwrite=False)
```

---

### 3. `algos.py` - Core Algorithms

Algorithm implementations independent of external services.

| Function | Description |
|---|---|
| `cosine_sim(u, v)` | Cosine similarity |
| `calculate_multi_dim_score(u1, u2, params)` | Multi-dimensional weighted scoring |
| `mmr_select(items, k, lam, ...)` | MMR diversity selection |
| `build_top_l_edges(users, l, params, weight_fn)` | Build Top-L neighbor graph |
| `greedy_max_weight_matching(edges)` | Greedy maximum weight matching |

**Core Formulas:**

```
Multi-dim Score = w_exp × cos(exp_A, exp_B) + w_interest × cos(int_A, int_B) + w_goal × cos(goal_A, goal_B)

Needs Reciprocal = 0.5 × base + 0.25 × cos(need_A, profile_B) + 0.25 × cos(need_B, profile_A)

History Penalty = score × (0.8)^n
```

---

### 4. `engine.py` - Business Orchestration

Unified entry point, combining adapters and algos.

| Method | Scenario | Output |
|---|---|---|
| `host_match()` | Host finds attendees | `List[RankedUser]` |
| `match_experience()` | User-to-user experience matching | `Dict[UserId, List[RankedUser]]` |
| `match_needs()` | User-to-user needs matching | `Dict[UserId, List[RankedUser]]` |

---

## Quick Start

### Install Dependencies

```bash
# Basic dependencies
pip install numpy scikit-learn pydantic

# For Qwen3 Embedding (recommended)
pip install sentence-transformers>=2.7.0 transformers>=4.51.0 torch
```

### Basic Usage

```python
from matching.types import MatchingParams, UserProfile
from matching.adapters import Qwen3Embedder, InMemoryRetriever, build_user_vectors
from matching.engine import MatchingEngine

# 1. Prepare user data
users = [
    UserProfile(
        user_id="u01",
        name="Alice",
        exp_text="ML engineer, built RAG systems",
        interest_text="LLM agents, evaluation",
        goal_text="Meet agent builders",
    ),
    UserProfile(
        user_id="u02",
        name="Bob",
        exp_text="Product manager at startup",
        interest_text="AI products, growth",
        goal_text="Find technical cofounder",
    ),
    # ...
]

# 2. Initialize components
embedder = Qwen3Embedder(device="cpu")  # or "cuda"
retriever = InMemoryRetriever()

# 3. Fill user vectors
build_user_vectors(users, embedder, build_profile=True)

# 4. Create engine
engine = MatchingEngine(embedder=embedder, retriever=retriever)

# 5. Configure parameters
params = MatchingParams(
    host_recall_top_n=50,
    host_return_top_k=10,
    host_mmr_lambda=0.7,
)
```

### Host → Users (Host Finds Attendees)

```python
host_text = "AI agents meetup, looking for RAG builders"

results = engine.host_match(
    host_text=host_text,
    users=users,
    params=params,
    apply_mmr=True,       # Whether to use MMR diversity
    sort_by_score=True,   # Sort by score descending
)

for r in results:
    print(f"{r.user_id}: {r.score:.4f}")
```

### User ↔ User (Experience Matching)

```python
results = engine.match_experience(
    users=users,
    params=params,
    top_k=5,              # Recommend 5 per user
    min_score=0.1,        # Filter low scores
    apply_mmr=True,       # Diversity selection
)

for uid, matches in results.items():
    print(f"{uid}: {[m.user_id for m in matches]}")
```

### User ↔ User (Needs Matching)

```python
from matching.types import NeedMatchMode

results = engine.match_needs(
    users=users,
    params=params,
    mode=NeedMatchMode.RECIPROCAL,  # Reciprocal mode
    top_k=3,
    min_score=0.1,
)

for uid, matches in results.items():
    if matches:
        print(f"{uid}: {[m.user_id for m in matches]}")
```

---

## Run Demo

```bash
cd matching_service

# TF-IDF basic version
python scripts/demo.py

# Qwen3 Embedding comparison test (first run downloads model)
python scripts/demo_qwen3.py
```

---

## Embedder Selection Guide

| Scenario | Recommended Embedder | Notes |
|---|---|---|
| Quick local testing | `TfidfEmbedder` | No model download needed |
| English production | `SentenceTransformerEmbedder("BAAI/bge-small-en-v1.5")` | 384 dims, fast |
| Bilingual (EN/ZH) | `Qwen3Embedder` | 100+ languages, good quality |
| Highest quality | `OpenAIEmbedder` | Requires API Key |

---

## Parameter Tuning Guide

| Parameter | Increase Effect | Decrease Effect |
|---|---|---|
| `host_mmr_lambda` | More relevance-focused | More diversity-focused |
| `w_exp` | More weight on background | Less weight on background |
| `w_interest` | More weight on interests | Less weight on interests |
| `w_goal` | More weight on goals | Less weight on goals |
| `history_penalty` | Lighter penalty | Heavier penalty |
| `min_score` | Stricter filtering | More lenient |

---

## Future Extensions

- [ ] Implement `LLMReranker`: Generate match rationales with LLM
- [ ] Implement vector database Retriever (Pinecone / Milvus / pgvector)
- [ ] Add 1v1 pairing API (using `greedy_max_weight_matching`)
- [ ] Support real-time user vector updates
