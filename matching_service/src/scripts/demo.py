# scripts/demo.py
from __future__ import annotations

import os
import sys
from typing import List

# 让脚本可以直接运行：python scripts/demo.py
# 假设你的工程结构是：
# matching_service/
#   src/matching/...
#   scripts/demo.py
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from matching.types import MatchingParams, UserProfile, NeedMatchMode  # noqa: E402
from matching.adapters import TfidfEmbedder, InMemoryRetriever, NoOpReranker, build_user_vectors  # noqa: E402
from matching.engine import MatchingEngine  # noqa: E402


def make_mock_users() -> List[UserProfile]:
    """构造一组可读的 mock 用户数据（尽量覆盖：背景/兴趣/目标/需求）"""
    return [
        UserProfile(
            user_id="u01",
            name="Alice",
            tags=["LLM", "Python", "RAG"],
            exp_text="2 years as ML engineer, built retrieval systems for e-commerce search.",
            interest_text="LLM agents, retrieval-augmented generation, evaluation.",
            goal_text="Meet builders working on agent products and RAG systems.",
            need_query="Looking for someone experienced in vector databases and eval metrics.",
        ),
        UserProfile(
            user_id="u02",
            name="Bob",
            tags=["Startup", "Product", "Growth"],
            exp_text="Product manager at a startup, led go-to-market and user growth.",
            interest_text="AI products, UX, growth experiments.",
            goal_text="Find a technical cofounder to prototype AI features.",
            need_query="Want to meet ML engineers who can build fast MVPs.",
        ),
        UserProfile(
            user_id="u03",
            name="Cathy",
            tags=["PhD", "NLP", "Evaluation"],
            exp_text="PhD student researching LLM evaluation and alignment.",
            interest_text="Evaluation benchmarks, RLHF, safety.",
            goal_text="Discuss research ideas and potential collaborations.",
            need_query="Looking for product folks who can share real-world eval pain points.",
        ),
        UserProfile(
            user_id="u04",
            name="David",
            tags=["Backend", "FastAPI", "VectorDB"],
            exp_text="Backend engineer, built FastAPI services and integrated pgvector.",
            interest_text="Distributed systems, search infra, embeddings.",
            goal_text="Meet people building matching / recommendation systems.",
            need_query="Want to connect with anyone doing recommendation or matching algorithms.",
        ),
        UserProfile(
            user_id="u05",
            name="Eva",
            tags=["Design", "UX", "Community"],
            exp_text="UX designer for community products, designed onboarding flows.",
            interest_text="Community, networking design, social graph products.",
            goal_text="Help improve event experiences and networking UX.",
            need_query="Want to meet engineers who care about product UX and experiments.",
        ),
        UserProfile(
            user_id="u06",
            name="Frank",
            tags=["Recruiting", "Mentor", "Career"],
            exp_text="Mentor for early-career engineers, ran interview prep sessions.",
            interest_text="Career growth, mentorship, hiring pipelines.",
            goal_text="Offer mentorship and connect with organizers.",
            need_query="Looking for students or juniors seeking mentorship.",
        ),
        UserProfile(
            user_id="u07",
            name="Grace",
            tags=["Data", "Causal", "A/B"],
            exp_text="Data scientist working on A/B testing and causal inference.",
            interest_text="Causal inference, experimentation platform, metrics.",
            goal_text="Exchange ideas on evaluation and experimental design.",
            need_query="Want to meet researchers working on evaluation or measurement.",
        ),
        UserProfile(
            user_id="u08",
            name="Henry",
            tags=["Security", "Infra", "Scaling"],
            exp_text="Infra engineer focused on security and scaling API services.",
            interest_text="Security, infra reliability, monitoring.",
            goal_text="Meet engineers building production AI services.",
            need_query="",  # 没有需求文本
        ),
        UserProfile(
            user_id="u09",
            name="Ivy",
            tags=["Frontend", "React", "Product"],
            exp_text="Frontend engineer building fancy dashboards and UIs for data apps.",
            interest_text="Product analytics, UI/UX, visualization.",
            goal_text="Find collaborators for an AI-powered event app.",
            need_query="Want to meet backend engineers with FastAPI + database experience.",
        ),
        UserProfile(
            user_id="u10",
            name="Jack",
            tags=["Research", "Agents", "Tooling"],
            exp_text="Research engineer building agent tooling and multi-step reasoning systems.",
            interest_text="Agents, tool-use, RAG, eval harnesses.",
            goal_text="Meet people building agents and matching systems.",
            need_query="Looking for PMs or designers to shape agent product experiences.",
        ),
    ]


def main() -> None:
    users = make_mock_users()

    # 1) 初始化 params（可以随便调）
    params = MatchingParams(
        host_recall_top_n=50,
        host_return_top_k=5,
        host_mmr_lambda=0.6,
        w_exp=0.5,
        w_interest=0.3,
        w_goal=0.2,
        user_top_l=4,
        history_penalty=0.8,
    )
    params.validate_logic()

    # 2) 准备 embedder & fit（TF-IDF 必须 fit）
    embedder = TfidfEmbedder(max_features=20000, ngram_range=(1, 2), min_df=1)

    # corpus：把用户 profile_text + need_text 都丢进去，更稳
    corpus = []
    for u in users:
        corpus.append(u.build_profile_text())
        if u.has_need():
            corpus.append(u.need_text)

    # host_text 也可以加进 corpus（避免 OOV）
    host_text = "We are hosting an AI agents + RAG meetup. We want builders with RAG/search infra and evaluation experience."
    corpus.append(host_text)

    embedder.fit(corpus)

    # 3) 填用户向量（v_profile 等）
    build_user_vectors(users, embedder, build_profile=True, overwrite=True)

    # 4) 初始化 engine（MVP：InMemoryRetriever + NoOpReranker）
    retriever = InMemoryRetriever()
    reranker = NoOpReranker()
    engine = MatchingEngine(embedder=embedder, retriever=retriever, reranker=reranker)

    # -------------------------
    # A) Host -> Users
    # -------------------------
    print("\n====================")
    print("A) Host -> Users")
    print("====================")
    host_ranked = engine.host_match(
        host_text=host_text,
        users=users,
        params=params,
        query_language="en",
        require_same_language=False,
    )
    for i, r in enumerate(host_ranked, 1):
        print(f"{i:02d}. user_id={r.user_id}  score={r.score:.4f}  debug={r.debug_info}")

    # -------------------------
    # B) User <-> User (Experience)
    # -------------------------
    print("\n====================")
    print("\nB) User -> TopK (Experience)")
    print("\n====================")
    rec = engine.match_experience(users=users, params=params, top_k=3, min_score=0.02)
    for uid, lst in rec.items():
        print(f"- {uid}: " + ", ".join([f"{r.user_id}({r.score:.3f})" for r in lst]))

    # -------------------------
    # C) User <-> User (Needs: Reciprocal)
    # -------------------------
    print("\n====================")
    print("C) User -> TopK (Needs: Reciprocal)")
    print("====================")
    need_rec = engine.match_needs(
        users=users,
        params=params,
        mode=NeedMatchMode.RECIPROCAL,
        top_k=3,
        min_score=0.02,
        apply_mmr=False,
    )
    for uid, lst in need_rec.items():
        if not lst:
            continue
        print(f"- {uid}: " + ", ".join([f"{r.user_id}({r.score:.3f})" for r in lst]))


if __name__ == "__main__":
    main()
