from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np

from .matching_pojo import UserId, UserProfile, Vector, MatchingParams


# =========================
# 1) Data Structures & Basic Tools
# =========================

@dataclass(frozen=True)
class Edge:
    """Edge in matching graph"""
    user_a: UserId
    user_b: UserId
    score: float
    debug_info: Dict[str, Any] = field(default_factory=dict)

    @property
    def sorted_ids(self) -> Tuple[UserId, UserId]:
        return (self.user_a, self.user_b) if self.user_a < self.user_b else (self.user_b, self.user_a)


def cosine_sim(u: Vector, v: Vector) -> float:
    """Basic cosine similarity"""
    a = np.asarray(u, dtype=np.float32)
    b = np.asarray(v, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
    if denom <= 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def safe_cosine_sim(u: Optional[Vector], v: Optional[Vector]) -> float:
    """Safe cosine similarity handling None vectors"""
    if u is None or v is None:
        return 0.0
    return cosine_sim(u, v)


# =========================
# 2) Core Scoring Logic (Simplified: exp + interest only)
# =========================

def calculate_similarity_score(
        u1: UserProfile,
        u2: UserProfile,
        params: MatchingParams
) -> Tuple[float, Dict[str, Any]]:
    """
    Simplified multi-dimension score using only exp and interest.

    Returns: (total_score, debug_info)
    """
    s_exp = safe_cosine_sim(u1.v_exp, u2.v_exp)
    s_interest = safe_cosine_sim(u1.v_interest, u2.v_interest)

    # Weighted sum (params should ensure weights sum to 1.0)
    total_score = (
            s_exp * params.w_exp +
            s_interest * params.w_interest
    )

    debug_info = {
        "exp_sim": round(s_exp, 4),
        "interest_sim": round(s_interest, 4),
        "weighted_total": round(total_score, 4),
    }

    return float(total_score), debug_info


# =========================
# 3) MMR Diversity Selection
# =========================

def mmr_select(
        items: Sequence[Any],
        k: int,
        lam: float,
        *,
        get_relevance: Callable[[Any], float],
        get_vector: Callable[[Any], Optional[Vector]],
) -> List[Any]:
    """
    MMR (Maximal Marginal Relevance) selection for diversity.

    Formula: MMR = λ × relevance - (1-λ) × max_similarity_to_selected

    Args:
        items: Candidate items
        k: Number of items to select
        lam: Trade-off parameter (0 < λ <= 1)
             λ=1.0: pure relevance
             λ=0.5: balance relevance and diversity
        get_relevance: Function to get relevance score
        get_vector: Function to get vector for similarity
    """
    if k <= 0 or not items:
        return []
    if not (0.0 < lam <= 1.0):
        raise ValueError("lam must be in (0, 1].")

    items = list(items)
    k = min(k, len(items))

    selected: List[Any] = []
    remaining = items.copy()

    # Get vectors upfront for selected items
    selected_vecs: List[Optional[Vector]] = []

    for _ in range(k):
        if not remaining:
            break

        best_item = None
        best_mmr = float('-inf')

        for item in remaining:
            rel = get_relevance(item)

            # Diversity penalty (similarity to already selected)
            diversity_penalty = 0.0
            item_vec = get_vector(item)

            if item_vec is not None and selected_vecs:
                # Max similarity to any selected item
                sims = []
                for sel_vec in selected_vecs:
                    if sel_vec is not None:
                        sims.append(cosine_sim(item_vec, sel_vec))

                if sims:
                    diversity_penalty = max(sims)

            # MMR score
            mmr_score = lam * rel - (1.0 - lam) * diversity_penalty

            if mmr_score > best_mmr:
                best_mmr = mmr_score
                best_item = item

        if best_item is not None:
            selected.append(best_item)
            remaining.remove(best_item)
            selected_vecs.append(get_vector(best_item))

    return selected


# =========================
# 4) Graph Construction (Optional - for future use)
# =========================

def build_top_l_edges(
        users: Sequence[UserProfile],
        params: MatchingParams,
        top_l: int,
        *,
        past_pair_counts: Optional[Dict[Tuple[UserId, UserId], int]] = None,
) -> List[Edge]:
    """
    Build graph edges: for each user, keep only top L neighbors.
    Simplified version without goal and needs.
    """
    past_pair_counts = past_pair_counts or {}
    user_list = list(users)
    edges: List[Edge] = []

    for u in user_list:
        neighbors: List[Tuple[UserProfile, float, Dict]] = []

        for v in user_list:
            if v.user_id == u.user_id:
                continue

            score, dbg = calculate_similarity_score(u, v, params)

            # Apply history penalty
            key = (u.user_id, v.user_id) if u.user_id < v.user_id else (v.user_id, u.user_id)
            cnt = past_pair_counts.get(key, 0)
            if cnt > 0:
                score = score * (params.history_penalty ** cnt)
                dbg["after_history"] = round(score, 4)

            neighbors.append((v, float(score), dbg))

        # Sort by score and take top L
        neighbors.sort(key=lambda x: x[1], reverse=True)
        top_neighbors = neighbors[:top_l]

        # Create edges
        for v, score, dbg in top_neighbors:
            edges.append(Edge(
                user_a=u.user_id,
                user_b=v.user_id,
                score=score,
                debug_info=dbg
            ))

    return edges


def greedy_max_weight_matching(edges: List[Edge]) -> List[Edge]:
    """
    Greedy algorithm for maximum weight matching.

    Returns: List of selected edges (1v1 pairs)
    """
    if not edges:
        return []

    # Sort edges by score (descending)
    sorted_edges = sorted(edges, key=lambda e: e.score, reverse=True)

    matched: List[Edge] = []
    used_users: set = set()

    for edge in sorted_edges:
        if edge.user_a not in used_users and edge.user_b not in used_users:
            matched.append(edge)
            used_users.add(edge.user_a)
            used_users.add(edge.user_b)

    return matched