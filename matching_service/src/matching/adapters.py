from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Protocol, Sequence, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer

from .matching_pojo import MatchRationale, MatchingParams, RankedUser, UserProfile, Vector


# =========================
# 1) Adapter Interfaces
# =========================

class Embedder(Protocol):
    """Text to vector encoding interface"""

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        """Batch encode. Returns list of vectors aligned with texts."""
        ...

    def encode_one(self, text: str) -> Vector:
        """Single text encoding convenience method."""
        ...


class Retriever(Protocol):
    """Candidate recall interface (simplified - no language filtering)"""

    def recall_candidates(
            self,
            query_vector: Vector,
            users: Sequence[UserProfile],
            top_n: int,
    ) -> List[Tuple[UserProfile, float]]:
        """
        Return top_n candidates with recall similarity scores.

        Returns: List of (UserProfile, similarity_score)
        """
        ...


class Reranker(Protocol):
    """Optional reranking interface"""

    def rerank_host(
            self,
            host_text: str,
            candidates: Sequence[RankedUser],
            params: MatchingParams,
    ) -> List[RankedUser]:
        ...

    def rationale_for_pair(
            self,
            user_a: UserProfile,
            user_b: UserProfile,
            params: MatchingParams,
    ) -> Optional[MatchRationale]:
        ...


# =========================
# 2) Utility Functions
# =========================

def _l2_normalize_rows(mat: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    """Normalize each row to unit norm."""
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    return mat / np.clip(norms, eps, None)


def cosine_sim(u: Vector, v: Vector) -> float:
    """Cosine similarity for generic sequences."""
    a = np.asarray(u, dtype=np.float32)
    b = np.asarray(v, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
    if denom <= 0:
        return 0.0
    return float(np.dot(a, b) / denom)


# =========================
# 3) TF-IDF Embedder
# =========================

@dataclass
class TfidfEmbedder:
    """
    TF-IDF based embedder (good for MVP/testing).
    Needs to be fitted on corpus before use.
    """
    max_features: int = 50000
    ngram_range: Tuple[int, int] = (1, 2)
    min_df: int = 1

    _vectorizer: Optional[TfidfVectorizer] = None

    def fit(self, corpus_texts: Sequence[str]) -> None:
        vec = TfidfVectorizer(
            max_features=self.max_features,
            ngram_range=self.ngram_range,
            min_df=self.min_df,
        )
        vec.fit(list(corpus_texts))
        self._vectorizer = vec

    def _ensure_fitted(self) -> TfidfVectorizer:
        if self._vectorizer is None:
            raise RuntimeError("TfidfEmbedder not fitted. Call fit(corpus_texts) first.")
        return self._vectorizer

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        vec = self._ensure_fitted()
        X = vec.transform(list(texts)).astype(np.float32)
        dense = X.toarray()
        dense = _l2_normalize_rows(dense)
        return [dense[i].tolist() for i in range(dense.shape[0])]

    def encode_one(self, text: str) -> Vector:
        return self.encode([text])[0]


# =========================
# 4) Qwen3 Embedder
# =========================

@dataclass
class Qwen3Embedder:
    """
    Qwen3-Embedding-0.6B embedder.
    Supports 100+ languages, 600M parameters, local inference.
    """
    model_name: str = "Qwen/Qwen3-Embedding-0.6B"
    device: str = "cpu"
    normalize: bool = True
    truncate_dim: Optional[int] = None  # MRL: optional dimension truncation

    _model: Optional[object] = field(default=None, repr=False)

    def _load_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name, device=self.device)

            if self.truncate_dim is not None:
                self._model.truncate_dim = self.truncate_dim

        return self._model

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        model = self._load_model()
        embeddings = model.encode(
            list(texts),
            normalize_embeddings=self.normalize,
            show_progress_bar=False,
        )
        return [emb.tolist() for emb in embeddings]

    def encode_one(self, text: str) -> Vector:
        return self.encode([text])[0]


# =========================
# 5) Generic SentenceTransformer Embedder
# =========================

@dataclass
class SentenceTransformerEmbedder:
    """
    Generic SentenceTransformer embedder.

    Recommended models:
      - BAAI/bge-small-en-v1.5 (384d, English)
      - BAAI/bge-m3 (1024d, multilingual)
      - sentence-transformers/all-MiniLM-L6-v2 (384d, fast)
    """
    model_name: str = "BAAI/bge-small-en-v1.5"
    device: str = "cpu"
    normalize: bool = True

    _model: Optional[object] = field(default=None, repr=False)

    def _load_model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name, device=self.device)
        return self._model

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        model = self._load_model()
        embeddings = model.encode(
            list(texts),
            normalize_embeddings=self.normalize,
            show_progress_bar=False,
        )
        return [emb.tolist() for emb in embeddings]

    def encode_one(self, text: str) -> Vector:
        return self.encode([text])[0]


# =========================
# 6) In-Memory Retriever (Simplified)
# =========================

@dataclass
class InMemoryRetriever:
    """
    Simple in-memory brute-force retriever.
    Uses pre-computed user.v_profile vectors.
    """

    def recall_candidates(
            self,
            query_vector: Vector,
            users: Sequence[UserProfile],
            top_n: int,
    ) -> List[Tuple[UserProfile, float]]:
        q = np.asarray(query_vector, dtype=np.float32)
        qn = np.linalg.norm(q) + 1e-12

        scored: List[Tuple[UserProfile, float]] = []

        for u in users:
            if u.v_profile is None:
                continue

            v = np.asarray(u.v_profile, dtype=np.float32)
            vn = np.linalg.norm(v) + 1e-12

            # Cosine similarity
            sim = float(np.dot(q, v) / (qn * vn))
            scored.append((u, sim))

        # Sort by similarity descending
        scored.sort(key=lambda x: x[1], reverse=True)

        return scored[:top_n]


# =========================
# 7) No-Op Reranker
# =========================

@dataclass
class NoOpReranker:
    """No-operation reranker (just returns input as-is)"""

    def rerank_host(
            self,
            host_text: str,
            candidates: Sequence[RankedUser],
            params: MatchingParams,
    ) -> List[RankedUser]:
        return list(candidates)

    def rationale_for_pair(
            self,
            user_a: UserProfile,
            user_b: UserProfile,
            params: MatchingParams,
    ) -> Optional[MatchRationale]:
        return None


# =========================
# 8) Helper: Build User Vectors
# =========================

def build_user_vectors(
        users: Sequence[UserProfile],
        embedder: Embedder,
        build_profile: bool = True,
        overwrite: bool = False,
) -> None:
    """
    Batch generate vectors for users.
    Simplified to only handle exp and interest (no goal, no need).

    Args:
        users: List of users to process
        embedder: Embedder instance
        build_profile: Whether to build combined v_profile
        overwrite: Whether to overwrite existing vectors
    """

    # Collect texts that need encoding
    exp_texts = []
    interest_texts = []
    profile_texts = []

    exp_indices = []
    interest_indices = []
    profile_indices = []

    for i, u in enumerate(users):
        if overwrite or u.v_exp is None:
            if u.exp_text.strip():
                exp_texts.append(u.exp_text)
                exp_indices.append(i)

        if overwrite or u.v_interest is None:
            if u.interest_text.strip():
                interest_texts.append(u.interest_text)
                interest_indices.append(i)

        if build_profile and (overwrite or u.v_profile is None):
            profile_text = u.build_profile_text()
            if profile_text.strip():
                profile_texts.append(profile_text)
                profile_indices.append(i)

    # Encode in batches
    if exp_texts:
        exp_vecs = embedder.encode(exp_texts)
        for idx, vec in zip(exp_indices, exp_vecs):
            users[idx].v_exp = vec

    if interest_texts:
        interest_vecs = embedder.encode(interest_texts)
        for idx, vec in zip(interest_indices, interest_vecs):
            users[idx].v_interest = vec

    if profile_texts:
        profile_vecs = embedder.encode(profile_texts)
        for idx, vec in zip(profile_indices, profile_vecs):
            users[idx].v_profile = vec