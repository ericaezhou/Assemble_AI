from __future__ import annotations

import os
import sys
import time
from typing import List

# Allow script to run directly
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "src")

if SRC not in sys.path:
    sys.path.insert(0, SRC)

from matching.matching_pojo import MatchingParams, UserProfile
from matching.adapters import (
    Qwen3Embedder,
    TfidfEmbedder,
    InMemoryRetriever,
    NoOpReranker,
    build_user_vectors,
)
from matching.engine import MatchingEngine


def make_mock_users() -> List[UserProfile]:
    """
    Create mock users with simplified schema (no language, goal, need).

    Note: exp_text and interest_text are composed from multiple database fields.
    """
    return [
        UserProfile(
            user_id="u01",
            name="Alice",
            role="ML Engineer",
            tags=["LLM", "Python", "RAG"],
            exp_text="2 years as ML engineer at tech company. Built retrieval systems for e-commerce search. Experience with vector databases and embeddings.",
            interest_text="LLM agents, retrieval-augmented generation (RAG), evaluation benchmarks, and AI product development.",
        ),
        UserProfile(
            user_id="u02",
            name="小明",
            role="Product Manager",
            tags=["创业", "产品", "增长"],
            exp_text="创业公司产品经理，5年B2B SaaS经验。负责用户增长和市场推广策略，有成功的MVP经验。",
            interest_text="AI 产品、用户体验设计、增长黑客、创业生态。",
        ),
        UserProfile(
            user_id="u03",
            name="Cathy",
            role="PhD Student",
            tags=["PhD", "NLP", "Evaluation"],
            exp_text="PhD student at Stanford researching LLM evaluation and alignment. Published papers on RLHF and safety benchmarks.",
            interest_text="Evaluation benchmarks, RLHF (Reinforcement Learning from Human Feedback), AI safety, and alignment research.",
        ),
        UserProfile(
            user_id="u04",
            name="大卫",
            role="Backend Engineer",
            tags=["后端", "FastAPI", "向量数据库"],
            exp_text="后端工程师，5年开发经验。熟悉 FastAPI 服务开发，有 pgvector、Pinecone 集成经验。构建过推荐系统后端。",
            interest_text="分布式系统、搜索基础设施、向量嵌入、推荐算法、API设计。",
        ),
        UserProfile(
            user_id="u05",
            name="Eva",
            role="UX Designer",
            tags=["Design", "UX", "Community"],
            exp_text="UX designer for community products at social media company. Designed onboarding flows that increased user retention by 40%.",
            interest_text="Community building, networking design, social graph products, user research, and design systems.",
        ),
        UserProfile(
            user_id="u06",
            name="老王",
            role="Tech Mentor",
            tags=["投资", "导师", "职业发展"],
            exp_text="资深技术导师和天使投资人。15年大厂经验，帮助50+工程师做职业规划和面试准备。",
            interest_text="职业成长、技术领导力、团队管理、创业投资、人才培养。",
        ),
        UserProfile(
            user_id="u07",
            name="Grace",
            role="Data Scientist",
            tags=["Data", "Causal", "A/B"],
            exp_text="Data scientist at experimentation platform company. Expert in A/B testing, causal inference, and metrics design. Built experimentation frameworks.",
            interest_text="Causal inference, experimentation platforms, metrics design, statistical modeling, and data-driven decision making.",
        ),
        UserProfile(
            user_id="u08",
            name="Henry",
            role="Infra Engineer",
            tags=["Security", "Infra", "Scaling"],
            exp_text="Infrastructure engineer at cloud company. Focused on security, API service scaling, and reliability. Experience with Kubernetes and cloud architecture.",
            interest_text="Security best practices, infrastructure reliability, monitoring and observability, cloud architecture, and DevOps.",
        ),
        UserProfile(
            user_id="u09",
            name="小红",
            role="Frontend Engineer",
            tags=["前端", "React", "产品"],
            exp_text="前端工程师，3年经验。擅长 React 和数据可视化。构建过多个 Dashboard 和数据分析产品。",
            interest_text="产品分析、UI/UX 设计、数据可视化、前端架构、React 生态。",
        ),
        UserProfile(
            user_id="u10",
            name="Jack",
            role="Research Engineer",
            tags=["Research", "Agents", "Tooling"],
            exp_text="Research engineer at AI lab. Building agent tooling, multi-step reasoning systems, and evaluation harnesses. Published work on tool-use and RAG.",
            interest_text="AI agents, tool-use, retrieval-augmented generation (RAG), evaluation harnesses, and agent architectures.",
        ),
    ]


def print_user_profile(user: UserProfile, score: float, indent: str = "    "):
    """Print detailed user profile"""
    print(f"{indent}   {user.name} ({user.user_id}) | score={score:.4f}")
    print(f"{indent}   Role: {user.role} | Tags: {', '.join(user.tags)}")
    print(f"{indent}   Experience: {user.exp_text[:100]}...")
    print(f"{indent}   Interests: {user.interest_text[:100]}...")
    print()


def run_comparison(users: List[UserProfile], params: MatchingParams):
    """Compare TF-IDF vs Qwen3 Embedding matching results"""

    # Test queries
    host_text_en = "We are hosting an AI agents + RAG meetup. We want builders with RAG/search infra and evaluation experience."
    host_text_zh = "我们正在举办一场 AI Agent 和 RAG 技术交流会，希望找到有 RAG、搜索基础设施和评估经验的开发者。"
    host_text_mixed = "Looking for ML engineers and product managers who can build AI products together. 寻找能一起开发AI产品的工程师和产品经理。"

    # ========== TF-IDF Baseline ==========
    print("\n" + "=" * 70)
    print("TF-IDF Embedder (Baseline)")
    print("=" * 70)

    tfidf_embedder = TfidfEmbedder(max_features=20000, ngram_range=(1, 2), min_df=1)

    # Fit corpus
    corpus = [u.build_profile_text() for u in users]
    corpus += [host_text_en, host_text_zh, host_text_mixed]
    tfidf_embedder.fit(corpus)

    # Copy users to avoid vector pollution
    users_tfidf = [u.model_copy(deep=True) for u in users]
    build_user_vectors(users_tfidf, tfidf_embedder, build_profile=True, overwrite=True)

    engine_tfidf = MatchingEngine(
        embedder=tfidf_embedder,
        retriever=InMemoryRetriever(),
        reranker=NoOpReranker(),
    )

    print("\n[Host -> Users] English Query")
    print("-" * 70)
    print(f"Query: {host_text_en}")
    print("-" * 70)
    print("Top 5 Matches:\n")
    ranked = engine_tfidf.host_match(host_text_en, users_tfidf, params)
    for r in ranked[:5]:
        user = next(u for u in users_tfidf if u.user_id == r.user_id)
        print_user_profile(user, r.score)

    # ========== Qwen3 Embedding ==========
    print("\n" + "=" * 70)
    print("Qwen3-Embedding-0.6B (Recommended)")
    print("=" * 70)

    print("\n[Loading model...] (First run downloads ~1.2GB)")
    t0 = time.time()

    qwen_embedder = Qwen3Embedder(
        model_name="Qwen/Qwen3-Embedding-0.6B",
        device="cpu",  # Change to "cuda" if GPU available
        normalize=True,
        truncate_dim=512,  # Optional: truncate to 512d for faster computation
    )

    # Copy users
    users_qwen = [u.model_copy(deep=True) for u in users]
    build_user_vectors(users_qwen, qwen_embedder, build_profile=True, overwrite=True)

    t1 = time.time()
    print(f"[Model loaded + vectors built] {t1 - t0:.2f}s\n")

    engine_qwen = MatchingEngine(
        embedder=qwen_embedder,
        retriever=InMemoryRetriever(),
        reranker=NoOpReranker(),
    )

    # A) Host -> Users (English)
    print("\n[Host -> Users] English Query")
    print("-" * 70)
    print(f"Query: {host_text_en}")
    print("-" * 70)
    print("Top 5 Matches:\n")
    ranked = engine_qwen.host_match(host_text_en, users_qwen, params, use_mmr=True, mmr_lambda=0.7)
    for r in ranked[:5]:
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print_user_profile(user, r.score)

    # B) Host -> Users (Chinese) - Test multilingual capability
    print("\n[Host -> Users] Chinese Query (Cross-lingual Matching)")
    print("-" * 70)
    print(f"Query: {host_text_zh}")
    print("-" * 70)
    print("Top 5 Matches:\n")
    ranked_zh = engine_qwen.host_match(host_text_zh, users_qwen, params, use_mmr=True, mmr_lambda=0.7)
    for r in ranked_zh[:5]:
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print_user_profile(user, r.score)

    # C) Host -> Users (Mixed languages)
    print("\n[Host -> Users] Mixed Language Query (中英混合)")
    print("-" * 70)
    print(f"Query: {host_text_mixed}")
    print("-" * 70)
    print("Top 5 Matches:\n")
    ranked_mixed = engine_qwen.host_match(host_text_mixed, users_qwen, params, use_mmr=True, mmr_lambda=0.7)
    for r in ranked_mixed[:5]:
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print_user_profile(user, r.score)

    # D) User -> User Matching
    print("\n[User -> User] Experience & Interest Matching")
    print("-" * 70)
    rec = engine_qwen.match_users(
        users_qwen,
        params,
        top_k=3,
        apply_mmr=True,
        mmr_lambda=0.5,
        min_score=0.02
    )

    # Show matches for selected users
    for uid in ["u01", "u02", "u04", "u10"]:
        source_user = next(u for u in users_qwen if u.user_id == uid)
        print(f"\n{'-' * 70}")
        print(f"Source: {source_user.name} ({uid}) - {source_user.role}")
        print(f"   Experience: {source_user.exp_text[:80]}...")
        print(f"   Interests: {source_user.interest_text[:80]}...")
        print("\n   Top 3 Matches:")

        matches = rec.get(uid, [])
        for r in matches:
            user = next(u for u in users_qwen if u.user_id == r.user_id)
            print(f"\n      {user.name} ({user.user_id}) - {user.role} | score={r.score:.4f}")
            print(f"      Tags: {', '.join(user.tags)}")
            print(f"      Experience: {user.exp_text[:60]}...")
            print(f"      Interests: {user.interest_text[:60]}...")

            # Show debug info
            if r.debug_info:
                print(f"      Debug: exp_sim={r.debug_info.get('exp_sim', 0):.4f}, "
                      f"interest_sim={r.debug_info.get('interest_sim', 0):.4f}")

    # E) Show diversity effect with MMR
    print("\n\n[Diversity Analysis] With vs Without MMR")
    print("=" * 70)

    # Without MMR
    rec_no_mmr = engine_qwen.match_users(
        users_qwen,
        params,
        top_k=5,
        apply_mmr=False,
        min_score=0.01
    )

    # With MMR
    rec_with_mmr = engine_qwen.match_users(
        users_qwen,
        params,
        top_k=5,
        apply_mmr=True,
        mmr_lambda=0.5,
        min_score=0.01
    )

    test_user = next(u for u in users_qwen if u.user_id == "u01")
    print(f"\nSource: {test_user.name} - {test_user.role}")

    print("\n   Without MMR (pure relevance):")
    for r in rec_no_mmr.get("u01", []):
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print(f"      {r.score:.4f} - {user.name} ({', '.join(user.tags[:2])})")

    print("\n   With MMR (λ=0.5, balanced):")
    for r in rec_with_mmr.get("u01", []):
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print(f"      {r.score:.4f} - {user.name} ({', '.join(user.tags[:2])})")


def main():
    """Main demo function"""

    # Simplified parameters (no goal weight)
    params = MatchingParams(
        host_recall_top_n=50,
        host_return_top_k=5,
        w_exp=0.6,  # Experience weight
        w_interest=0.4,  # Interest weight
        user_top_k=20,
        history_penalty=0.8,
        min_score=0.01,
    )
    params.validate_logic()

    print("\n" + "=" * 70)
    print("SIMPLIFIED MATCHING SERVICE DEMO")
    print("Using Qwen3-Embedding-0.6B for Multilingual Matching")

    users = make_mock_users()
    run_comparison(users, params)

    print("\n" + "=" * 70)
    print("Demo Complete!")


if __name__ == "__main__":
    main()