from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np

from .types import UserId, UserProfile, Vector, MatchingParams


# =========================
# 1) 数据结构与基础工具
# =========================

@dataclass(frozen=True)
class Edge:
    """图匹配中的一条边（无向）"""
    user_a: UserId
    user_b: UserId
    score: float
    debug_info: Dict[str, Any] = field(default_factory=dict)

    @property
    def sorted_ids(self) -> Tuple[UserId, UserId]:
        return (self.user_a, self.user_b) if self.user_a < self.user_b else (self.user_b, self.user_a)


def cosine_sim(u: Vector, v: Vector) -> float:
    """基础余弦相似度（算法层自包含：不依赖 adapters）"""
    a = np.asarray(u, dtype=np.float32)
    b = np.asarray(v, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) + 1e-12
    if denom <= 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def safe_cosine_sim(u: Optional[Vector], v: Optional[Vector]) -> float:
    """安全的余弦相似度：处理 None 向量情况"""
    if u is None or v is None:
        return 0.0
    return cosine_sim(u, v)


# =========================
# 2) 核心评分逻辑 (融合多维度)
# =========================

def calculate_multi_dim_score(
    u1: UserProfile,
    u2: UserProfile,
    params: MatchingParams
) -> Tuple[float, Dict[str, Any]]:
    """
    结合 UserProfile 多个向量字段计算加权分。
    返回: (综合得分, 调试信息字典)
    """
    s_exp = safe_cosine_sim(u1.v_exp, u2.v_exp)
    s_int = safe_cosine_sim(u1.v_interest, u2.v_interest)
    s_goal = safe_cosine_sim(u1.v_goal, u2.v_goal)

    # 这里假设 params 的权重和大致为 1.0（建议在 service 初始化时 params.validate_logic()）
    total_score = (
        s_exp * params.w_exp +
        s_int * params.w_interest +
        s_goal * params.w_goal
    )

    debug_info = {
        "exp_sim": round(s_exp, 4),
        "int_sim": round(s_int, 4),
        "goal_sim": round(s_goal, 4),
        "weighted_total": round(total_score, 4),
    }
    return float(total_score), debug_info


# =========================
# 3) MMR 多样性选择 (Host->Users)
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
    MMR 选择算法：在相关性和多样性之间平衡。
    - 不要求 items 已按相关性排序
    - 缺向量 -> 退化为纯 relevance（不会被惩罚）
    """
    if k <= 0 or not items:
        return []
    if not (0.0 < lam <= 1.0):
        raise ValueError("lam must be in (0, 1].")

    items = list(items)
    if len(items) <= k:
        return items

    rel_scores = [float(get_relevance(x)) for x in items]
    remaining_idx = list(range(len(items)))
    selected_idx: List[int] = []

    # 1) 选第一个：relevance 最大
    first = int(np.argmax(np.asarray(rel_scores, dtype=np.float32)))
    selected_idx.append(first)
    remaining_idx.remove(first)

    # 2) 迭代选
    while len(selected_idx) < k and remaining_idx:
        best_i = None
        best_score = -1e18
        best_rel = -1e18

        for i in remaining_idx:
            relevance = rel_scores[i]
            vi = get_vector(items[i])

            if vi is None:
                mmr_score = relevance
            else:
                max_sim = 0.0
                for sj in selected_idx:
                    vj = get_vector(items[sj])
                    if vj is not None:
                        max_sim = max(max_sim, cosine_sim(vi, vj))
                mmr_score = lam * relevance - (1.0 - lam) * max_sim

            # tie-break：mmr_score -> relevance -> index（保证稳定）
            if (mmr_score > best_score) or (
                mmr_score == best_score and (relevance > best_rel or (relevance == best_rel and (best_i is None or i < best_i)))
            ):
                best_score = mmr_score
                best_rel = relevance
                best_i = i

        if best_i is None:
            break
        selected_idx.append(best_i)
        remaining_idx.remove(best_i)

    return [items[i] for i in selected_idx]


# =========================
# 4) 用户配对逻辑 (User<->User)
# =========================

def build_top_l_edges(
    users: Sequence[UserProfile],
    l: int,
    params: MatchingParams,
    weight_fn: Callable[[UserProfile, UserProfile, MatchingParams], Tuple[float, Dict[str, Any]]],
    *,
    min_score: float = 0.0,
) -> List[Edge]:
    """
    构图：为每个用户寻找 Top-L 个最匹配的邻居（无向去重）。
    """
    users = list(users)
    n = len(users)
    if n < 2 or l <= 0:
        return []

    edge_map: Dict[Tuple[UserId, UserId], Edge] = {}

    for i in range(n):
        ui = users[i]
        candidates: List[Tuple[float, UserId, Dict[str, Any]]] = []

        for j in range(n):
            if i == j:
                continue
            score, dbg = weight_fn(ui, users[j], params)
            if score < min_score:
                continue
            candidates.append((float(score), users[j].user_id, dbg or {}))

        candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
        for score, vid, dbg in candidates[:l]:
            a, b = (ui.user_id, vid) if ui.user_id < vid else (vid, ui.user_id)
            key = (a, b)
            if key not in edge_map or score > edge_map[key].score:
                edge_map[key] = Edge(user_a=a, user_b=b, score=score, debug_info=dbg)

    return list(edge_map.values())


def greedy_max_weight_matching(edges: Sequence[Edge]) -> List[Edge]:
    """
    贪心最大权重匹配：按分数从高到低配对，确保每个人只出现一次。
    """
    sorted_edges = sorted(
        edges,
        key=lambda e: (e.score, e.sorted_ids[0], e.sorted_ids[1]),
        reverse=True,
    )

    matched: set[UserId] = set()
    result: List[Edge] = []

    for e in sorted_edges:
        if e.user_a in matched or e.user_b in matched:
            continue
        matched.add(e.user_a)
        matched.add(e.user_b)
        result.append(e)

    # 稳定排序（便于测试）
    result.sort(key=lambda e: e.sorted_ids)
    return result
