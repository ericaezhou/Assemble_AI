from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from enum import Enum
from typing import Any, Dict, List, Optional, Sequence, Tuple

# 类型别名：Vector 用于存储词向量（Embedding），通常是浮点数序列
# 用 Sequence[float] 比 List[float] 更通用：可兼容 list / numpy array / torch tensor 的只读视图
Vector = Sequence[float]
# UserId 定义为字符串，方便兼容各种 ID 格式
UserId = str


# --- 1. 枚举定义 ---

class NeedMatchMode(str, Enum):
    """用户间『需求匹配』的两种计算模式"""
    RECIPROCAL = "reciprocal"  # 互惠模式：计算两人之间的双向奔赴程度，适合社交
    BIPARTITE = "bipartite"  # 二分图模式：将人分为供给方和需求方，适合 导师-学生 或 招聘 场景


# --- 2. 核心数据模型 ---

class UserProfile(BaseModel):
    """
    统一用户信息模型（Unified Profile Schema）。
    这是匹配引擎的灵魂，包含了结构化标签（用于过滤）和非结构化文本（用于语义计算）。
    """
    user_id: UserId
    name: str
    role: Optional[str] = "attendee"  # 角色字段：如 '创业者'、'投资人'，用于加权或特定的匹配逻辑

    # --- 结构化特征 (用于硬性过滤或简单匹配) ---
    language: str = "zh"  # 语言：匹配时通常优先选择语言相同的用户
    tags: List[str] = Field(default_factory=list)  # 技能/兴趣标签：如 ['Python', 'AI Agent']

    # --- 文本字段 (用于 RAG 语义检索) ---
    # 提示：这些文本会被 Embedder 转换成向量并存储在下方的 v_ 字段中
    exp_text: str = ""  # 个人背景：用户的过往工作、项目经历、教育背景
    interest_text: str = ""  # 兴趣领域：用户关心的行业、技术、话题
    goal_text: str = ""  # 参会目标：用户本次活动想达成什么（如“寻找合伙人”）

    # 需求描述：用户输入的“我想找什么样的人”（仅在需求匹配模式下使用）
    # 说明：这里用 need_text 命名更统一；保留 need_query 作为兼容别名（外部传参仍可用 need_query）
    need_text: str = Field(default="", alias="need_query")

    # --- 向量缓存 (由 Adapter 在运行阶段填充，不直接存入传统关系型数据库) ---
    v_exp: Optional[Vector] = None  # 个人背景的向量表示
    v_interest: Optional[Vector] = None  # 兴趣领域的向量表示
    v_goal: Optional[Vector] = None  # 参会目标的向量表示
    v_need: Optional[Vector] = None  # 需求描述的向量表示

    # 组合画像向量：在 Host->User 或 User->User 中经常需要一个统一表示
    # Adapter 可以选择：直接写入 v_profile，或只写 v_exp/v_interest/v_goal，然后由 engine 组合
    v_profile: Optional[Vector] = None

    # 可选：用于调试/扩展的字段（不会影响核心算法）
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # 允许 alias 输入（need_query），并在导出时也可用 field 名（need_text）
    model_config = {"populate_by_name": True}

    def build_profile_text(self) -> str:
        """
        构造一个稳定的、可用于 embedding 的“统一文本”。
        这能显著降低 adapter 与字段的耦合：无论是 TF-IDF 还是 SentenceTransformer，都可以直接吃这个输入。
        """
        parts: List[str] = []
        if self.exp_text.strip():
            parts.append(f"Experience: {self.exp_text.strip()}")
        if self.interest_text.strip():
            parts.append(f"Interests: {self.interest_text.strip()}")
        if self.goal_text.strip():
            parts.append(f"Goals: {self.goal_text.strip()}")
        if self.tags:
            parts.append("Tags: " + ", ".join(self.tags))
        return "\n".join(parts).strip()

    def has_need(self) -> bool:
        """是否提供了需求匹配文本（Needs-based 模式使用）"""
        return bool(self.need_text and self.need_text.strip())


# --- 3. 算法参数 ---

class MatchingParams(BaseModel):
    """
    算法超参数配置。
    通过调整这些权重，可以改变匹配引擎的“口味”。
    """
    # --- 主办方匹配相关参数 ---
    host_recall_top_n: int = 1000  # 召回阶段：先从大池子里选出最相关的 1000 人，再进行精排
    host_return_top_k: int = 100  # 最终返回：经过 MMR 多样性选择后的 K 人
    host_mmr_lambda: float = 0.5  # 多样性因子：1.0表示纯看相关性，值越小推荐的结果越多样（避免全是同校/同公司的）

    # --- 语义权重分配 (多维度相似度加权) ---
    # 总和建议为 1.0，决定了匹配时更看重哪方面
    w_exp: float = 0.5  # 两人背景相似度的权重
    w_interest: float = 0.3  # 两人兴趣重合度的权重
    w_goal: float = 0.2  # 两人参会目标一致性的权重

    # --- 用户匹配相关参数 ---
    user_top_l: int = 20  # 构图规模：每个用户只选取最匹配的前 L 个邻居进入图匹配算法
    history_penalty: float = 0.8  # 历史匹配惩罚：如果两人之前 match 过，分数乘以 history_penalty，鼓励认识新朋友

    @field_validator("host_mmr_lambda")
    @classmethod
    def _check_host_mmr_lambda(cls, v: float) -> float:
        if not (0.0 < v <= 1.0):
            raise ValueError("host_mmr_lambda must be in (0, 1].")
        return v

    @field_validator("history_penalty")
    @classmethod
    def _check_history_penalty(cls, v: float) -> float:
        if not (0.0 < v <= 1.0):
            raise ValueError("history_penalty must be in (0, 1].")
        return v

    @field_validator("host_recall_top_n", "host_return_top_k", "user_top_l")
    @classmethod
    def _check_positive_ints(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("must be a positive integer.")
        return v

    def validate_logic(self) -> None:
        """轻量逻辑校验：一些跨字段的 sanity check"""
        if self.host_recall_top_n < self.host_return_top_k:
            raise ValueError("host_recall_top_n should be >= host_return_top_k.")
        w_sum = self.w_exp + self.w_interest + self.w_goal
        # 允许轻微偏差，但如果离谱则提示
        if not (0.95 <= w_sum <= 1.05):
            raise ValueError(f"w_exp + w_interest + w_goal should be ~ 1.0 (got {w_sum:.3f}).")


# --- 4. 输出结果模型 ---

class MatchRationale(BaseModel):
    """
    由大模型（LLM）生成的匹配理由。
    这是产品提升用户体验的核心：告诉用户为什么要和对方聊。
    """
    summary: str  # 一句话总结：如“你们都在大厂做 LLM，且都想去大理数字游民”
    highlights: List[str] = Field(default_factory=list)  # 具体的匹配亮点：如 ['共同公司经历', '技术栈互补']


class RankedUser(BaseModel):
    user_id: UserId
    score: float
    rationale: Optional[MatchRationale] = None
    # 建议增加：用于调试，比如存储各个维度的原始得分（exp_sim, goal_sim等）
    debug_info: Dict[str, Any] = Field(default_factory=dict)


class UserPair(BaseModel):
    user_a: UserId
    user_b: UserId
    score: float
    mode: NeedMatchMode  # 明确这组 pair 是按哪种模式配对的
    round_id: int = 1
    rationale: Optional[MatchRationale] = None
    debug_info: Dict[str, Any] = Field(default_factory=dict)

    @property
    def sorted_ids(self) -> Tuple[UserId, UserId]:
        return (self.user_a, self.user_b) if self.user_a < self.user_b else (self.user_b, self.user_a)
