# Baseline Matching Algorithm (Service Version)

## Goal
Return top-K researcher recommendations for a user, while enforcing hard
constraints:
- Same conference (shared conference participation)
- Different institution
- Not the user

Constraints are enforced in the Node backend before calling the matching service.

## Profile Encoding
Each profile is encoded into a fixed-length embedding vector built from:
- `research_areas`
- `interests`
- `bio`

We use the multilingual `BAAI/bge-m3` embedding model. Field weights are applied
to reflect importance:
- `research_areas`: 3
- `interests`: 2
- `bio`: 1

This yields a semantic baseline with multilingual support and a stable starting
point for later upgrades (e.g., RAG).

## Similarity Function
We use cosine similarity between embedding vectors:

```
sim(u, v) = (u · v) / (||u|| * ||v||)
```

The score is in `[0, 1]` and is robust to different profile lengths.

## Hard Constraints (Filtering)
Before scoring, we filter candidate researchers to enforce:
- Shared conference membership with the user
- Different institution (if the user has an institution)
- Excluding the user

This is done in the Node backend via SQL queries to reduce service load.

## Matching Procedure
Given filtered candidates:
1. Compute similarity scores.
2. Sort in descending order.
3. Return top-K results.

This greedy top-K is fast, deterministic, and easy to explain. If the project
later needs strict 1:1 pairing, this can be replaced with bipartite matching
without changing the service interface.
