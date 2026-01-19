# src/matching/adapters.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Protocol, Sequence, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import SentenceTransformer

from .types import MatchRationale, MatchingParams, RankedUser, UserProfile, Vector


# =========================
# 1) Adapter Interfaces
# =========================

class Embedder(Protocol):
    """把文本编码成向量的可替换接口"""

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        """Batch encode. Returns a list of vectors aligned with texts."""
        ...

    def encode_one(self, text: str) -> Vector:
        """Single encode convenience."""
        ...


class Retriever(Protocol):
    """召回候选的可替换接口（MVP 用内存 brute-force；后续可换向量库/混合检索）"""

    def recall_host_candidates(
            self,
            query_vector: Vector,
            users: Sequence[UserProfile],
            top_n: int,
            *,
            require_same_language: bool = False,
            query_language: Optional[str] = None,
    ) -> List[Tuple[UserProfile, float]]:
        """
        Return top_n candidates along with recall similarity score.
        Similarity score is for recall only; rerank happens later.
        """
        ...


class Reranker(Protocol):
    """可选：对召回/初排结果做更精细 rerank，并生成理由（建议接收 MatchingParams）"""

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
# 3) TF-IDF Embedder (MVP)
# =========================

@dataclass
class TfidfEmbedder:
    """
    一个非常适合 MVP / 单元测试的 Embedder。
    特点：
      - 不需要下载大模型
      - 输出向量可直接用于 cosine
      - 需要先 fit（可在服务启动时或每次批量用户更新时 fit）
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
            raise RuntimeError("TfidfEmbedder is not fitted. Call fit(corpus_texts) first.")
        return self._vectorizer

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        vec = self._ensure_fitted()
        X = vec.transform(list(texts)).astype(np.float32)

        # TF-IDF 输出为稀疏矩阵；MVP 简化转 dense
        dense = X.toarray()
        dense = _l2_normalize_rows(dense)
        return [dense[i].tolist() for i in range(dense.shape[0])]

    def encode_one(self, text: str) -> Vector:
        return self.encode([text])[0]


# =========================
# 4) OpenAI Embedder (Placeholder)
# =========================

@dataclass
class OpenAIEmbedder:
    """
    OpenAIEmbedder 占位符（课程项目后续接入大模型 embedding 用）。
    - 目前不做真实 API 调用，避免强依赖 openai 包 / API key。
    - 你接入时只需要在 encode() 内部实现真实调用，并返回 List[Vector]。
    """
    model: str = "text-embedding-3-small"
    api_key: Optional[str] = None

    def encode(self, texts: Sequence[str]) -> List[Vector]:
        raise NotImplementedError(
            "OpenAIEmbedder is a placeholder. "
            "Implement encode() with OpenAI SDK and set API key via env or constructor."
        )

    def encode_one(self, text: str) -> Vector:
        return self.encode([text])[0]


# =========================
# 5) Qwen3 Embedding (NEW)
# =========================

@dataclass
class Qwen3Embedder:
    """
    基于 Qwen/Qwen3-Embedding-0.6B 的 Embedder。

    特点：
      - 支持 100+ 语言（中英文都很好）
      - 600M 参数，本地可跑
      - 支持 MRL（可自定义输出维度 32-1024）
      - MTEB 多语言榜单表现优秀

    依赖：
      - pip install sentence-transformers>=2.7.0
      - pip install transformers>=4.51.0
    """
    model_name: str = "Qwen/Qwen3-Embedding-0.6B"
    device: str = "cpu"  # "cpu" / "cuda" / "mps"
    normalize: bool = True
    truncate_dim: Optional[int] = None  # MRL: 可截断到更小维度 (32-1024)
    use_flash_attention: bool = False  # 需要 GPU + flash_attn 库

    _model: Optional[object] = field(default=None, repr=False)

    def _load_model(self):
        if self._model is None:

            model_kwargs = {}
            tokenizer_kwargs = {}

            if self.use_flash_attention:
                model_kwargs["attn_implementation"] = "flash_attention_2"
                model_kwargs["device_map"] = "auto"
                tokenizer_kwargs["padding_side"] = "left"

            if model_kwargs:
                self._model = SentenceTransformer(
                    self.model_name,
                    device=self.device,
                    model_kwargs=model_kwargs,
                    tokenizer_kwargs=tokenizer_kwargs,
                )
            else:
                self._model = SentenceTransformer(
                    self.model_name,
                    device=self.device,
                )

            # 设置 MRL 截断维度
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
# 6) SentenceTransformer Embedder (通用)
# =========================

@dataclass
class SentenceTransformerEmbedder:
    """
    通用 SentenceTransformer Embedder，支持 HuggingFace 上的各种模型。

    推荐模型：
      - BAAI/bge-small-en-v1.5 (384d, 英文)
      - BAAI/bge-m3 (1024d, 多语言)
      - sentence-transformers/all-MiniLM-L6-v2 (384d, 快速)
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
# 7) In-Memory Retriever (MVP)
# =========================

@dataclass
class InMemoryRetriever:
    """
    简单内存召回（brute-force cosine）。
    只依赖 users 里预先填好的 user.v_profile。
    """

    def recall_host_candidates(
            self,
            query_vector: Vector,
            users: Sequence[UserProfile],
            top_n: int,
            *,
            require_same_language: bool = False,
            query_language: Optional[str] = None,
    ) -> List[Tuple[UserProfile, float]]:
        q = np.asarray(query_vector, dtype=np.float32)
        qn = np.linalg.norm(q) + 1e-12

        scored: List[Tuple[UserProfile, float]] = []
        for u in users:
            if require_same_language and query_language:
                if (u.language or "").lower() != query_language.lower():
                    continue

            if u.v_profile is None:
                # 用户没有向量：跳过
                continue

            v = np.asarray(u.v_profile, dtype=np.float32)
            denom = (np.linalg.norm(v) * qn) + 1e-12
            sim = float(np.dot(v, q) / denom) if denom > 0 else 0.0
            scored.append((u, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_n]


# =========================
# 8) No-Op Reranker (Default)
# =========================

class NoOpReranker:
    """
    默认不做 rerank，也不生成理由（理由通常在 host_to_user/user_to_user 里用规则生成，或后续用 LLM）。
    """

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
# 9) Helper: fill user vectors
# =========================

def build_user_vectors(
        users: Sequence[UserProfile],
        embedder: Embedder,
        *,
        build_profile: bool = True,
        overwrite: bool = False,
) -> None:
    """
    给用户批量填充向量缓存（v_exp/v_interest/v_goal/v_profile/v_need）。
    设计成 in-place，方便 service 在内存里维护 users。

    - build_profile=True：会使用 user.build_profile_text() 填 v_profile（推荐）
    - overwrite=False：已有向量就不重复算（适合多次调用）
    """
    profile_texts: List[str] = []
    profile_users: List[UserProfile] = []

    exp_texts: List[str] = []
    exp_users: List[UserProfile] = []

    interest_texts: List[str] = []
    interest_users: List[UserProfile] = []

    goal_texts: List[str] = []
    goal_users: List[UserProfile] = []

    need_texts: List[str] = []
    need_users: List[UserProfile] = []

    for u in users:
        if build_profile:
            if overwrite or u.v_profile is None:
                profile_texts.append(u.build_profile_text())
                profile_users.append(u)

        if overwrite or u.v_exp is None:
            exp_texts.append(u.exp_text or "")
            exp_users.append(u)

        if overwrite or u.v_interest is None:
            interest_texts.append(u.interest_text or "")
            interest_users.append(u)

        if overwrite or u.v_goal is None:
            goal_texts.append(u.goal_text or "")
            goal_users.append(u)

        if u.has_need() and (overwrite or u.v_need is None):
            need_texts.append(u.need_text or "")
            need_users.append(u)

    # Batch encode and write back
    if profile_users:
        vecs = embedder.encode(profile_texts)
        for u, v in zip(profile_users, vecs):
            u.v_profile = v

    if exp_users:
        vecs = embedder.encode(exp_texts)
        for u, v in zip(exp_users, vecs):
            u.v_exp = v

    if interest_users:
        vecs = embedder.encode(interest_texts)
        for u, v in zip(interest_users, vecs):
            u.v_interest = v

    if goal_users:
        vecs = embedder.encode(goal_texts)
        for u, v in zip(goal_users, vecs):
            u.v_goal = v

    if need_users:
        vecs = embedder.encode(need_texts)
        for u, v in zip(need_users, vecs):
            u.v_need = v