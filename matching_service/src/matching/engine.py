from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from .matching_pojo import (
    MatchingParams,
    RankedUser,
    UserId,
    UserProfile,
)
from .adapters import Embedder, Retriever, Reranker, build_user_vectors
from .algos import (
    calculate_similarity_score,
    cosine_sim,
    mmr_select,
)


# =========================
# Matching Engine
# =========================

@dataclass
class MatchingEngine:
    """
    Simplified matching engine with two scenarios:
      1. host_match: Host text -> recommended users
      2. match_users: User <-> User experience matching
    """
    embedder: Embedder
    retriever: Retriever
    reranker: Optional[Reranker] = None

    def __post_init__(self) -> None:
        if self.reranker is None:
            from .adapters import NoOpReranker
            self.reranker = NoOpReranker()

    # =========================
    # 1) Host -> Users
    # =========================

    def host_match(
            self,
            host_text: str,
            users: Sequence[UserProfile],
            params: MatchingParams,
            *,
            use_mmr: bool = True,
            mmr_lambda: float = 0.7,
    ) -> List[RankedUser]:
        """
        Host matching: recommend users for an event.

        Simplified flow:
          1. Embed host_text
          2. Recall top_n candidates by profile similarity
          3. Score candidates
          4. Optional MMR diversity selection
          5. Return top_k results

        Args:
            host_text: Event description
            users: All users
            params: Matching parameters
            use_mmr: Whether to apply MMR diversity
            mmr_lambda: MMR diversity parameter (0.7 = more relevance)
        """
        params.validate_logic()

        # Ensure user vectors exist
        build_user_vectors(users, self.embedder, build_profile=True, overwrite=False)

        # 1) Query embedding
        q_vec = self.embedder.encode_one(host_text)

        # 2) Recall candidates
        recalled = self.retriever.recall_candidates(
            query_vector=q_vec,
            users=users,
            top_n=params.host_recall_top_n,
        )

        # 3) Score candidates
        ranked: List[RankedUser] = []
        for u, recall_sim in recalled:
            # Use recall similarity as the score
            score = float(recall_sim)
            ranked.append(
                RankedUser(
                    user_id=u.user_id,
                    score=score,
                    debug_info={
                        "recall_sim": round(float(recall_sim), 4),
                    },
                )
            )

        # Sort by score
        ranked.sort(key=lambda x: x.score, reverse=True)

        # 4) MMR diversity selection (optional)
        if use_mmr and len(ranked) > params.host_return_top_k:
            user_by_id: Dict[UserId, UserProfile] = {u.user_id: u for u in users}

            def _get_rel(x: RankedUser) -> float:
                return x.score

            def _get_vec(x: RankedUser):
                up = user_by_id.get(x.user_id)
                return up.v_profile if up is not None else None

            ranked = mmr_select(
                items=ranked,
                k=params.host_return_top_k,
                lam=mmr_lambda,
                get_relevance=_get_rel,
                get_vector=_get_vec,
            )
        else:
            ranked = ranked[:params.host_return_top_k]

        # 5) Optional rerank (can add LLM rationale here)
        ranked = self.reranker.rerank_host(host_text, ranked, params)

        return ranked

    # =========================
    # 2) User <-> User Matching
    # =========================

    def match_users(
            self,
            users: Sequence[UserProfile],
            params: MatchingParams,
            *,
            top_k: Optional[int] = None,
            apply_mmr: bool = True,
            mmr_lambda: float = 0.5,
            min_score: Optional[float] = None,
            past_pair_counts: Optional[Dict[Tuple[UserId, UserId], int]] = None,
    ) -> Dict[UserId, List[RankedUser]]:
        """
        User-to-user matching based on experience and interests.

        Returns: For each user, a list of top-K recommended matches

        Args:
            users: All users
            params: Matching parameters
            top_k: Number of recommendations per user (default: params.user_top_k)
            apply_mmr: Whether to apply diversity
            mmr_lambda: MMR parameter (0.5 = balance)
            min_score: Minimum score threshold (default: params.min_score)
            past_pair_counts: History of past matches for penalty
        """
        params.validate_logic()

        top_k = top_k or params.user_top_k
        min_score = min_score if min_score is not None else params.min_score
        past_pair_counts = past_pair_counts or {}

        # Ensure vectors exist
        build_user_vectors(users, self.embedder, build_profile=True, overwrite=False)

        user_list = list(users)
        user_by_id = {u.user_id: u for u in user_list}

        # Helper: apply history penalty
        def apply_history(score: float, a: UserId, b: UserId) -> float:
            key = (a, b) if a < b else (b, a)
            cnt = int(past_pair_counts.get(key, 0))
            if cnt <= 0:
                return score
            return score * (params.history_penalty ** cnt)

        results: Dict[UserId, List[RankedUser]] = {}

        for u in user_list:
            candidates: List[RankedUser] = []

            for v in user_list:
                if v.user_id == u.user_id:
                    continue

                # Calculate similarity score
                score, dbg = calculate_similarity_score(u, v, params)

                candidates.append(
                    RankedUser(
                        user_id=v.user_id,
                        score=score,
                        debug_info=dbg,
                    )
                )

            # Sort by score
            candidates.sort(key=lambda x: x.score, reverse=True)

            # Apply MMR diversity (optional)
            if apply_mmr and candidates:
                def _get_rel(x: RankedUser) -> float:
                    return x.score

                def _get_vec(x: RankedUser):
                    up = user_by_id.get(x.user_id)
                    return up.v_profile if up is not None else None

                candidates = mmr_select(
                    items=candidates,
                    k=min(top_k, len(candidates)),
                    lam=mmr_lambda,
                    get_relevance=_get_rel,
                    get_vector=_get_vec,
                )
            else:
                candidates = candidates[:top_k]

            results[u.user_id] = candidates

        return results