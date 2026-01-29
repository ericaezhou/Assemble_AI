"""
Matching Service Package
"""

from .matching_pojo import UserProfile, MatchingParams, RankedUser
from .engine import MatchingEngine
from .adapters import (
    BgeM3Embedder,
    Qwen3Embedder,
    InMemoryRetriever,
    build_user_vectors,
)
from .algos import calculate_similarity_score, mmr_select

__all__ = [
    "UserProfile",
    "MatchingParams",
    "RankedUser",
    "MatchingEngine",
    "BgeM3Embedder",
    "Qwen3Embedder",
    "InMemoryRetriever",
    "build_user_vectors",
    "calculate_similarity_score",
    "mmr_select",
]