import numpy as np
from sentence_transformers import SentenceTransformer

DEFAULT_WEIGHTS = {
    "research_areas": 3.0,
    "interests": 2.0,
    "bio": 1.0
}

MODEL_NAME = "BAAI/bge-m3"
_MODEL = SentenceTransformer(MODEL_NAME)


def _normalize(vec):
    norm = np.linalg.norm(vec)
    if norm == 0.0:
        return vec
    return vec / norm


def _field_text(profile, field):
    return profile.get(field, "") or ""


def _weighted_embedding(profile, weights):
    fields = list(weights.keys())
    texts = [_field_text(profile, field) for field in fields]
    embeddings = _MODEL.encode(texts, normalize_embeddings=False)

    weighted = np.zeros_like(embeddings[0], dtype=np.float32)
    for emb, field in zip(embeddings, fields):
        weighted += emb * float(weights[field])
    return _normalize(weighted)


def match_profiles(user, candidates, k, weights=None):
    if not candidates:
        return []

    weights = weights or DEFAULT_WEIGHTS
    max_k = len(candidates)
    k = min(max(k, 0), max_k)
    user_vec = _weighted_embedding(user, weights)

    matches = []
    for candidate in candidates:
        candidate_vec = _weighted_embedding(candidate, weights)
        score = float(np.dot(user_vec, candidate_vec))
        match = dict(candidate)
        match["score"] = round(score, 6)
        matches.append(match)

    matches.sort(key=lambda item: item["score"], reverse=True)
    return matches[:k]
