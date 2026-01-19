# scripts/demo_qwen3.py
"""
使用 Qwen3-Embedding-0.6B 测试匹配效果

依赖安装：
    pip install sentence-transformers>=2.7.0 transformers>=4.51.0 torch

首次运行会自动下载模型（约 1.2GB）
"""
from __future__ import annotations

import os
import sys
import time
from typing import List

# 让脚本可以直接运行
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from matching.types import MatchingParams, UserProfile, NeedMatchMode
from matching.adapters import (
    Qwen3Embedder,
    TfidfEmbedder,
    InMemoryRetriever,
    NoOpReranker,
    build_user_vectors,
)
from matching.engine import MatchingEngine


def make_mock_users() -> List[UserProfile]:
    """构造一组 mock 用户数据（中英混合，测试多语言能力）"""
    return [
        UserProfile(
            user_id="u01",
            name="Alice",
            language="en",
            tags=["LLM", "Python", "RAG"],
            exp_text="2 years as ML engineer, built retrieval systems for e-commerce search.",
            interest_text="LLM agents, retrieval-augmented generation, evaluation.",
            goal_text="Meet builders working on agent products and RAG systems.",
            need_query="Looking for someone experienced in vector databases and eval metrics.",
        ),
        UserProfile(
            user_id="u02",
            name="小明",
            language="zh",
            tags=["创业", "产品", "增长"],
            exp_text="创业公司产品经理，负责用户增长和市场推广策略。",
            interest_text="AI 产品、用户体验、增长黑客。",
            goal_text="寻找技术合伙人，一起开发 AI 产品原型。",
            need_query="想认识能快速搭建 MVP 的机器学习工程师。",
        ),
        UserProfile(
            user_id="u03",
            name="Cathy",
            language="en",
            tags=["PhD", "NLP", "Evaluation"],
            exp_text="PhD student researching LLM evaluation and alignment.",
            interest_text="Evaluation benchmarks, RLHF, safety.",
            goal_text="Discuss research ideas and potential collaborations.",
            need_query="Looking for product folks who can share real-world eval pain points.",
        ),
        UserProfile(
            user_id="u04",
            name="大卫",
            language="zh",
            tags=["后端", "FastAPI", "向量数据库"],
            exp_text="后端工程师，熟悉 FastAPI 服务开发，有 pgvector 集成经验。",
            interest_text="分布式系统、搜索基础设施、向量嵌入。",
            goal_text="认识做推荐系统和匹配算法的朋友。",
            need_query="想和做推荐或匹配算法的人交流。",
        ),
        UserProfile(
            user_id="u05",
            name="Eva",
            language="en",
            tags=["Design", "UX", "Community"],
            exp_text="UX designer for community products, designed onboarding flows.",
            interest_text="Community, networking design, social graph products.",
            goal_text="Help improve event experiences and networking UX.",
            need_query="Want to meet engineers who care about product UX and experiments.",
        ),
        UserProfile(
            user_id="u06",
            name="老王",
            language="zh",
            tags=["投资", "导师", "职业发展"],
            exp_text="资深技术导师，帮助初级工程师做职业规划和面试准备。",
            interest_text="职业成长、技术领导力、团队管理。",
            goal_text="提供导师指导，认识活动组织者。",
            need_query="想认识需要导师指导的学生或初级工程师。",
        ),
        UserProfile(
            user_id="u07",
            name="Grace",
            language="en",
            tags=["Data", "Causal", "A/B"],
            exp_text="Data scientist working on A/B testing and causal inference.",
            interest_text="Causal inference, experimentation platform, metrics.",
            goal_text="Exchange ideas on evaluation and experimental design.",
            need_query="Want to meet researchers working on evaluation or measurement.",
        ),
        UserProfile(
            user_id="u08",
            name="Henry",
            language="en",
            tags=["Security", "Infra", "Scaling"],
            exp_text="Infra engineer focused on security and scaling API services.",
            interest_text="Security, infra reliability, monitoring.",
            goal_text="Meet engineers building production AI services.",
            need_query="",  # 没有需求文本
        ),
        UserProfile(
            user_id="u09",
            name="小红",
            language="zh",
            tags=["前端", "React", "产品"],
            exp_text="前端工程师，擅长数据可视化和 Dashboard 开发。",
            interest_text="产品分析、UI/UX、数据可视化。",
            goal_text="寻找合作伙伴开发 AI 驱动的活动应用。",
            need_query="想认识有 FastAPI + 数据库经验的后端工程师。",
        ),
        UserProfile(
            user_id="u10",
            name="Jack",
            language="en",
            tags=["Research", "Agents", "Tooling"],
            exp_text="Research engineer building agent tooling and multi-step reasoning systems.",
            interest_text="Agents, tool-use, RAG, eval harnesses.",
            goal_text="Meet people building agents and matching systems.",
            need_query="Looking for PMs or designers to shape agent product experiences.",
        ),
    ]


def print_user_profile(user: UserProfile, score: float, indent: str = "    "):
    """打印用户详细履历"""
    print(f"{indent}   {user.name} ({user.user_id}) | score={score:.4f}")
    print(f"{indent}   Language: {user.language} | Tags: {', '.join(user.tags)}")
    print(f"{indent}   Experience: {user.exp_text}")
    print(f"{indent}   Interests: {user.interest_text}")
    print(f"{indent}   Goal: {user.goal_text}")
    if user.has_need():
        print(f"{indent}   Need: {user.need_text}")
    print()


def run_comparison(users: List[UserProfile], params: MatchingParams):
    """对比 TF-IDF 和 Qwen3 Embedding 的匹配效果"""
    
    host_text_en = "We are hosting an AI agents + RAG meetup. We want builders with RAG/search infra and evaluation experience."
    host_text_zh = "我们正在举办一场 AI Agent 和 RAG 技术交流会，希望找到有 RAG、搜索基础设施和评估经验的开发者。"
    
    # ========== TF-IDF Baseline ==========
    print("\n" + "=" * 70)
    print("TF-IDF Embedder (Baseline)")
    print("=" * 70)
    
    tfidf_embedder = TfidfEmbedder(max_features=20000, ngram_range=(1, 2), min_df=1)
    
    # fit corpus
    corpus = [u.build_profile_text() for u in users]
    corpus += [u.need_text for u in users if u.has_need()]
    corpus += [host_text_en, host_text_zh]
    tfidf_embedder.fit(corpus)
    
    # 复制用户（避免向量污染）
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
    print("Qwen3-Embedding-0.6B")
    print("=" * 70)
    
    print("\n[Loading model...] (首次运行需下载约 1.2GB)")
    t0 = time.time()
    
    qwen_embedder = Qwen3Embedder(
        model_name="Qwen/Qwen3-Embedding-0.6B",
        device="cpu",  # 改成 "cuda" 如果有 GPU
        normalize=True,
        truncate_dim=512,  # 可选：截断到 512 维，加速计算
    )
    
    # 复制用户
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
    ranked = engine_qwen.host_match(host_text_en, users_qwen, params)
    for r in ranked[:5]:
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print_user_profile(user, r.score)
    
    # B) Host -> Users (Chinese) - 测试跨语言能力
    print("\n[Host -> Users] Chinese Query (跨语言匹配)")
    print("-" * 70)
    print(f"Query: {host_text_zh}")
    print("-" * 70)
    print("Top 5 Matches:\n")
    ranked_zh = engine_qwen.host_match(host_text_zh, users_qwen, params)
    for r in ranked_zh[:5]:
        user = next(u for u in users_qwen if u.user_id == r.user_id)
        print_user_profile(user, r.score)
    
    # C) User -> User (Experience)
    print("\n[User -> User] Experience Matching")
    print("-" * 70)
    rec = engine_qwen.match_experience(users_qwen, params, top_k=3, min_score=0.02)
    
    for uid in ["u01", "u02", "u04"]:  # 选几个典型用户
        source_user = next(u for u in users_qwen if u.user_id == uid)
        print(f"\nSource: {source_user.name} ({uid})")
        print(f"   Experience: {source_user.exp_text}")
        print(f"   Interests: {source_user.interest_text}")
        print(f"   Goal: {source_user.goal_text}")
        print("\n   Top 3 Matches:")
        
        matches = rec.get(uid, [])
        for r in matches:
            user = next(u for u in users_qwen if u.user_id == r.user_id)
            print_user_profile(user, r.score, indent="      ")
    
    # D) User -> User (Needs)
    print("\n[User -> User] Needs Matching (Reciprocal)")
    print("-" * 70)
    need_rec = engine_qwen.match_needs(
        users_qwen, params, mode=NeedMatchMode.RECIPROCAL, top_k=3, min_score=0.02
    )
    
    for uid in ["u02", "u04", "u09"]:  # 中文用户
        source_user = next(u for u in users_qwen if u.user_id == uid)
        matches = need_rec.get(uid, [])
        if not matches:
            continue
            
        print(f"\nSource: {source_user.name} ({uid})")
        print(f"   Need: {source_user.need_text}")
        print("\n   Top 3 Matches:")
        
        for r in matches:
            user = next(u for u in users_qwen if u.user_id == r.user_id)
            print_user_profile(user, r.score, indent="      ")


def main():
    params = MatchingParams(
        host_recall_top_n=50,
        host_return_top_k=5,
        host_mmr_lambda=0.95,
        w_exp=0.5,
        w_interest=0.3,
        w_goal=0.2,
        user_top_l=4,
        history_penalty=0.8,
    )
    params.validate_logic()
    
    users = make_mock_users()
    run_comparison(users, params)
    
    print("\n" + "=" * 70)
    print("Done!")
    print("=" * 70)


if __name__ == "__main__":
    main()
