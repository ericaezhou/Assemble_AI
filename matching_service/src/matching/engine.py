# src/matching/engine.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from .types import (
    MatchRationale,
    MatchingParams,
    NeedMatchMode,
    RankedUser,
    UserId,
    UserPair,
    UserProfile,
)
from .adapters import Embedder, Retriever, Reranker, build_user_vectors
from .algos import (
    Edge,
    calculate_multi_dim_score,  # 你已放在 algos.py 里（按你最新实现）
    cosine_sim,
    mmr_select,
    build_top_l_edges,
    greedy_max_weight_matching,
)


# =========================
# 0) Matching Engine
# =========================

@dataclass
class MatchingEngine:
    """
    ⭐纯算法入口（不依赖外部服务）：
      - host_match: 主办方文本 -> 推荐参会用户列表
      - match_experience: 用户间「经历/兴趣/目标」综合匹配
      - match_needs: 用户间「需求」匹配（reciprocal/bipartite）
    """
    embedder: Embedder
    retriever: Retriever
    reranker: Optional[Reranker] = None

    def __post_init__(self) -> None:
        if self.reranker is None:
            # 延迟导入避免循环依赖
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
        query_language: Optional[str] = None,
        require_same_language: bool = False,
    ) -> List[RankedUser]:
        """
        主办方匹配用户：
          1) embed host_text
          2) recall top_n candidates (by v_profile)
          3) compute final score (multi-dim)
          4) MMR select top_k
          5) optional rerank + rationale
        """
        params.validate_logic()

        # 0) 确保用户向量存在（MVP：engine 内部可以帮你补齐）
        # 生产里你也可以把这步放到 service 初始化阶段
        build_user_vectors(users, self.embedder, build_profile=True, overwrite=False)

        # 1) Query embedding
        q_vec = self.embedder.encode_one(host_text)

        # 2) Recall
        recalled = self.retriever.recall_host_candidates(
            query_vector=q_vec,
            users=users,
            top_n=params.host_recall_top_n,
            require_same_language=require_same_language,
            query_language=query_language,
        )

        # recalled: List[(UserProfile, recall_sim)]
        # 3) Rerank scoring（这里用 multi-dim：exp/interest/goal）
        ranked: List[RankedUser] = []
        for u, recall_sim in recalled:
            # host_text 没有 exp/goal 等拆分字段，因此 host->user 的多维打分我们用 profile 向量召回相似度为主，
            # 再用 u 的 exp/interest/goal 做补充（MVP：直接用 recall_sim 作为 relevance）
            # 你想更强：可以把 host_text embed 成 “host_profile_vec”，再分别对 exp/interest/goal 做 cosine 并加权。
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

        # 4) MMR select Top-K（需要向量：用 user.v_profile）
        # 为了 MMR 的多样性选择，我们把 RankedUser 映射回对应 UserProfile 的 v_profile
        user_by_id: Dict[UserId, UserProfile] = {u.user_id: u for u in users}

        def _get_rel(x: RankedUser) -> float:
            return x.score

        def _get_vec(x: RankedUser):
            up = user_by_id.get(x.user_id)
            return up.v_profile if up is not None else None

        mmr_selected = mmr_select(
            items=ranked,
            k=params.host_return_top_k,
            lam=params.host_mmr_lambda,
            get_relevance=_get_rel,
            get_vector=_get_vec,
        )

        # 5) Optional rerank (and rationale)
        reranked = self.reranker.rerank_host(host_text, mmr_selected, params)

        return reranked

    # =========================
    # 2) User <-> User (Experience)
    # =========================

    def match_experience(
            self,
            users: Sequence[UserProfile],
            params: MatchingParams,
            *,
            top_k: int = 5,
            apply_mmr: bool = True,
            mmr_lambda: Optional[float] = None,
            min_score: float = 0.02,
            past_pair_counts: Optional[Dict[Tuple[UserId, UserId], int]] = None,
    ) -> Dict[UserId, List[RankedUser]]:
        """
        ✅ 体验匹配（推荐列表版，不是 1v1 配对）
        输出：每个用户的 Top-K 推荐对象列表（允许一个人出现在很多人的列表里）

        - top_k：每人推荐几位
        - min_score：过滤掉低相关（避免“硬凑”）
        - apply_mmr：是否做多样性（避免全推荐同一类人）
        """
        params.validate_logic()
        past_pair_counts = past_pair_counts or {}

        # 确保向量存在
        build_user_vectors(users, self.embedder, build_profile=True, overwrite=False)

        user_list = list(users)
        user_by_id = {u.user_id: u for u in user_list}

        # 小工具：历史惩罚（可选）
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

                score, dbg = calculate_multi_dim_score(u, v, params)

                # 历史惩罚
                score2 = apply_history(float(score), u.user_id, v.user_id)
                if score2 != score:
                    dbg["after_history"] = round(float(score2), 4)

                # 过滤低分，避免“硬凑”
                if score2 < min_score:
                    continue

                candidates.append(
                    RankedUser(
                        user_id=v.user_id,
                        score=float(score2),
                        debug_info=dbg,
                    )
                )

            # 先按相关性排序
            candidates.sort(key=lambda x: x.score, reverse=True)

            # 多样性（可选）
            if apply_mmr and candidates:
                lam = mmr_lambda if mmr_lambda is not None else params.host_mmr_lambda

                # 用 v_profile 做多样性向量
                def _get_rel(x: RankedUser) -> float:
                    return x.score

                def _get_vec(x: RankedUser):
                    up = user_by_id.get(x.user_id)
                    return up.v_profile if up is not None else None

                candidates = mmr_select(
                    items=candidates,
                    k=min(top_k, len(candidates)),
                    lam=lam,
                    get_relevance=_get_rel,
                    get_vector=_get_vec,
                )
            else:
                candidates = candidates[:top_k]

            results[u.user_id] = candidates

        return results

    # =========================
    # 3) User <-> User (Needs)
    # =========================

    def match_needs(
            self,
            users: Sequence[UserProfile],
            params: MatchingParams,
            *,
            mode: NeedMatchMode = NeedMatchMode.RECIPROCAL,
            top_k: int = 5,
            apply_mmr: bool = False,  # needs 一般不强调多样性，默认 False
            mmr_lambda: Optional[float] = None,
            min_score: float = 0.02,
            past_pair_counts: Optional[Dict[Tuple[UserId, UserId], int]] = None,
    ) -> Dict[UserId, List[RankedUser]]:
        """
        ✅ 需求匹配（Top-K 推荐版，不做 1v1 配对）
        返回：每个用户的 Top-K 推荐对象列表（允许同一个人被很多人推荐）

        mode:
          - RECIPROCAL: 互惠（考虑双方 need）
          - BIPARTITE: 先占位（后续可做供需角色拆分）
        """
        params.validate_logic()
        past_pair_counts = past_pair_counts or {}

        build_user_vectors(users, self.embedder, build_profile=True, overwrite=False)

        user_list = list(users)
        user_by_id: Dict[UserId, UserProfile] = {u.user_id: u for u in user_list}

        # 历史惩罚（可选）
        def apply_history(score: float, a: UserId, b: UserId) -> float:
            key = (a, b) if a < b else (b, a)
            cnt = int(past_pair_counts.get(key, 0))
            if cnt <= 0:
                return score
            return score * (params.history_penalty ** cnt)

        results: Dict[UserId, List[RankedUser]] = {}

        for u in user_list:
            # needs 匹配：一般只对“有 need_text 的用户”输出推荐
            if not u.has_need():
                results[u.user_id] = []
                continue

            strong: List[RankedUser] = []
            weak: List[RankedUser] = []

            for v in user_list:
                if v.user_id == u.user_id:
                    continue

                # 1) 单向满足度：u 的 need -> v 的 profile
                u_need_v = 0.0
                if u.v_need is not None and v.v_profile is not None:
                    u_need_v = cosine_sim(u.v_need, v.v_profile)

                if mode == NeedMatchMode.RECIPROCAL:
                    # 2) 互惠：v 的 need -> u 的 profile（如果 v 没 need，就为 0）
                    v_need_u = 0.0
                    if v.v_need is not None and u.v_profile is not None:
                        v_need_u = cosine_sim(v.v_need, u.v_profile)

                    # 3) base：多维相似（可选，能提升“聊得来”）
                    base, dbg_base = calculate_multi_dim_score(u, v, params)

                    # MVP：soft reciprocal（你现在的配方）
                    score = 0.5 * base + 0.25 * u_need_v + 0.25 * v_need_u
                    dbg = {
                        **(dbg_base or {}),
                        "u_need_v": round(float(u_need_v), 4),
                        "v_need_u": round(float(v_need_u), 4),
                        "base": round(float(base), 4),
                        "needs_total": round(float(score), 4),
                    }
                else:
                    # BIPARTITE 先做一个单向版占位（后续再做供需拆分）
                    score = u_need_v
                    dbg = {"u_need_v": round(float(u_need_v), 4), "needs_total": round(float(score), 4)}

                score2 = apply_history(float(score), u.user_id, v.user_id)
                if score2 != score:
                    dbg["after_history"] = round(float(score2), 4)

                # 过滤：避免硬凑
                if score2 >= min_score:
                    strong.append(RankedUser(user_id=v.user_id, score=float(score2), debug_info=dbg))
                else:
                    weak.append(
                        RankedUser(user_id=v.user_id, score=float(score2), debug_info={**dbg, "fallback": True}))

            strong.sort(key=lambda x: x.score, reverse=True)
            weak.sort(key=lambda x: x.score, reverse=True)

            candidates = strong
            # 不足 top_k 就用弱相关补齐（可选：如果你不想补齐就删掉这段）
            if len(candidates) < top_k:
                candidates = candidates + weak[: (top_k - len(candidates))]

            # 多样性（可选）
            if apply_mmr and candidates:
                lam = mmr_lambda if mmr_lambda is not None else params.host_mmr_lambda

                def _get_rel(x: RankedUser) -> float:
                    return x.score

                def _get_vec(x: RankedUser):
                    up = user_by_id.get(x.user_id)
                    return up.v_profile if up is not None else None

                candidates = mmr_select(
                    items=candidates,
                    k=min(top_k, len(candidates)),
                    lam=lam,
                    get_relevance=_get_rel,
                    get_vector=_get_vec,
                )
            else:
                candidates = candidates[:top_k]

            results[u.user_id] = candidates

        return results
