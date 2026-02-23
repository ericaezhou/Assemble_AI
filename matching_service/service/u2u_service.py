"""
Matching Service - Connects database with matching algorithm

This service orchestrates:
1. Fetching user data from database (ProfileRepository)
2. Converting to matching format (UserProfile)
3. Running matching algorithm
4. Generating match reasons (via OpenAI API)
5. Returning results with explanations
"""
import json
import os
from typing import List, Optional, Dict, Tuple, Any
from uuid import UUID

from openai import OpenAI

from db.repositories.profile_repository import ProfileRepository
from src.matching.matching_pojo import UserProfile, MatchingParams
from src.matching.adapters import (
    BgeM3Embedder,
    Qwen3Embedder,
    SentenceTransformerEmbedder,
    InMemoryRetriever,
    build_user_vectors,
    Embedder,
)
from src.matching.engine import MatchingEngine
from service.mapper.profile_mapper import profile_dto_to_user_profile, profile_dtos_to_user_profiles

from openai import OpenAI

# 需要在环境变量中添加OPENAI_API_KEY, export OPENAI_API_KEY=""
_OPENAI_CLIENT: Any = None
# GPT_MODEL_NAME = "gpt-5.2"
GPT_MODEL_NAME = "gpt-4o-mini"

def _get_openai_client() -> OpenAI:
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is None:
        # OpenAI SDK 会默认从环境变量 OPENAI_API_KEY 读取 key
        # export OPENAI_API_KEY="..."
        _OPENAI_CLIENT = OpenAI()
    return _OPENAI_CLIENT

def _safe_trim(text: str, max_len: int = 3000) -> str:
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    # 过长就截断，避免 prompt 过大
    return text[:max_len].rstrip() + "..."

class MatchingService:
    """
    Main matching service that connects database with matching algorithm.

    Responsibilities:
    - Fetch profiles from database
    - Convert to matching format
    - Run matching algorithm
    - Generate match reasons
    - Cache vectors for performance
    """

    def __init__(
            self,
            embedder_type: str = "qwen",
            embedder_model: Optional[str] = None,
            device: str = "cpu",
            cache_vectors: bool = True,
    ):
        """
        Initialize matching service.

        Args:
            embedder_type: "qwen" or "bge-m3" (or "sentence-transformer")
            embedder_model: Optional model override
            device: Device for computation ("cpu" or "cuda")
            cache_vectors: Whether to cache user vectors in memory
        """
        # Initialize database repository
        self.profile_repo = ProfileRepository()

        # Initialize matching components
        self.embedder = self._create_embedder(
            embedder_type=embedder_type,
            embedder_model=embedder_model,
            device=device,
        )

        self.retriever = InMemoryRetriever()
        self.engine = MatchingEngine(
            embedder=self.embedder,
            retriever=self.retriever,
        )

        # Default matching parameters
        self.default_params = MatchingParams(
            host_recall_top_n=1000,
            host_return_top_k=100,
            w_exp=0.6,
            w_interest=0.4,
            user_top_k=20,
            history_penalty=0.8,
            min_score=0.02,
        )

        # Vector cache (optional)
        self.cache_vectors = cache_vectors
        self._user_profile_cache: Dict[str, UserProfile] = {}

        # OpenAI client (created once; reused for reason generation)
        # Requires environment variable: OPENAI_API_KEY
        self._openai_client = OpenAI()
        self._reason_model = os.getenv("OPENAI_REASON_MODEL", GPT_MODEL_NAME)

    @staticmethod
    def _create_embedder(
            *,
            embedder_type: str,
            embedder_model: Optional[str],
            device: str,
    ) -> Embedder:
        normalized = (embedder_type or "qwen").strip().lower()

        if normalized in {"qwen", "qwen3", "qwen3-embedding"}:
            model_name = embedder_model or "Qwen/Qwen3-Embedding-0.6B"
            return Qwen3Embedder(
                model_name=model_name,
                device=device,
                normalize=True,
                truncate_dim=512,  # Use 512d for faster computation
            )

        if normalized in {"bge", "bge-m3", "bge_m3", "baai/bge-m3"}:
            model_name = embedder_model or "BAAI/bge-m3"
            return BgeM3Embedder(
                model_name=model_name,
                device=device,
                normalize=True,
            )

        if normalized in {"sentence-transformer", "sentence_transformer", "st"}:
            model_name = embedder_model or "BAAI/bge-small-en-v1.5"
            return SentenceTransformerEmbedder(
                model_name=model_name,
                device=device,
                normalize=True,
            )

        raise ValueError(
            f"Unsupported embedder_type: {embedder_type}. "
            "Use 'qwen', 'bge-m3', or 'sentence-transformer'."
        )

    def _fetch_all_users(self) -> List[UserProfile]:
        """
        Fetch all users from database and convert to UserProfile format.

        Returns:
            List of UserProfiles
        """
        # Get all profiles from database
        profile_dtos = self.profile_repo.get_all()

        # Convert to UserProfile format
        user_profiles = profile_dtos_to_user_profiles(profile_dtos)

        # Build vectors (this can be slow on first run)
        build_user_vectors(
            user_profiles,
            self.embedder,
            build_profile=True,
            overwrite=False
        )

        # Cache if enabled
        if self.cache_vectors:
            for user in user_profiles:
                self._user_profile_cache[user.user_id] = user

        return user_profiles

    def _get_user_by_id(self, user_id: UUID) -> Optional[UserProfile]:
        """
        Get a single user by ID.

        Args:
            user_id: User UUID

        Returns:
            UserProfile if found, None otherwise
        """
        user_id_str = str(user_id)

        # Check cache first
        if self.cache_vectors and user_id_str in self._user_profile_cache:
            return self._user_profile_cache[user_id_str]

        # Fetch from database
        profile_dto = self.profile_repo.get_by_id(user_id)
        if not profile_dto:
            return None

        # Convert to UserProfile
        user_profile = profile_dto_to_user_profile(profile_dto)

        # Build vectors
        build_user_vectors(
            [user_profile],
            self.embedder,
            build_profile=True,
            overwrite=False
        )

        # Cache if enabled
        if self.cache_vectors:
            self._user_profile_cache[user_id_str] = user_profile

        return user_profile

    def _generate_match_reason(
            self,
            user1: "UserProfile",
            user2: "UserProfile",
            exp_similarity: float,
            interest_similarity: float,
            overall_score: float
    ) -> str:
        """
        Generate a user-facing match reason *for user1* explaining why user2 is recommended.
        Input/output signature unchanged.
        """

        u1_exp = _safe_trim(user1.exp_text)
        u1_int = _safe_trim(user1.interest_text)
        u2_exp = _safe_trim(user2.exp_text)
        u2_int = _safe_trim(user2.interest_text)

        if not (u1_exp or u1_int or u2_exp or u2_int):
            return (
                f"We're recommending {user2.name} because your profiles show matching signals "
                f"(match score: {overall_score:.2f}), but detailed text descriptions are unavailable."
            )

        # 关键：面向 user1 的口吻（“推荐给你”），更长但不啰嗦
        system_msg = (
            "You write a match explanation shown to USER1 in an event app.\n"
            "Goal: explain why USER2 is recommended to USER1.\n\n"
            "Hard rules:\n"
            "1) Write in second-person to USER1 (use 'you' / 'your'), and refer to USER2 by name.\n"
            "2) ONLY use information explicitly present in the provided texts (Experience/Interests/Tags). "
            "Do NOT invent companies, schools, projects, or facts.\n"
            "3) Length: 4–6 sentences. Not too short.\n"
            "4) Mention at most 2 concrete overlap points (skills/topics/areas) and at most 1 complement point.\n"
            "5) Include 1 sentence suggesting 1–2 conversation starters based on the overlaps.\n"
            "6) Do not mention 'similarity scores' or numeric metrics unless asked; keep it natural.\n"
            "7) Tone: helpful, specific, professional; no hype words like 'fascinating', 'amazing', 'perfect'."
        )

        # 给模型更“可控”的输入：把文本按字段分好，并给它 score 做弱引导（但不让它输出数字）
        payload = {
            "user1": {
                "name": user1.name,
                "role": user1.role or "",
                "experience_text": u1_exp,
                "interest_text": u1_int,
                "tags": list(user1.tags or [])[:12],
            },
            "user2": {
                "name": user2.name,
                "role": user2.role or "",
                "experience_text": u2_exp,
                "interest_text": u2_int,
                "tags": list(user2.tags or [])[:12],
            },
            "signals": {
                "exp_similarity": float(exp_similarity),
                "interest_similarity": float(interest_similarity),
                "overall_score": float(overall_score),
            },
        }

        model_name = os.getenv("MATCH_REASON_MODEL", "gpt-4o-mini")

        schema = {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": (
                        "Second-person explanation to user1 about why user2 is recommended. "
                        "4-6 sentences, grounded in provided texts only."
                    )
                }
            },
            "required": ["reason"],
            "additionalProperties": False
        }

        try:
            client = _get_openai_client()
            resp = client.responses.create(
                model=model_name,
                input=[
                    {"role": "system", "content": system_msg},
                    {
                        "role": "user",
                        "content": (
                            "Write the recommendation reason.\n\n"
                            f"DATA:\n{json.dumps(payload, ensure_ascii=False)}"
                        ),
                    },
                ],
                temperature=0.35,
                max_output_tokens=200, # 控制输出长度，防止响应时间过长
                text={
                    "format": {
                        "type": "json_schema",
                        "name": "match_reason",
                        "strict": True,
                        "schema": schema
                    }
                }
            )

            raw = (getattr(resp, "output_text", None) or "").strip()
            if not raw:
                try:
                    raw = resp.output[0].content[0].text.strip()
                except Exception:
                    raw = ""

            data = json.loads(raw)
            reason = (data.get("reason") or "").strip()
            if reason:
                return reason

        except Exception:
            pass

        # fallback：仍保持 “对 user1 说” 的口吻，并尽量利用 common tags（不写死阈值逻辑）
        common_tags = list((set(user1.tags or []) & set(user2.tags or [])))[:3]
        if common_tags:
            topics = ", ".join(common_tags)
            return (
                f"We’re recommending {user2.name} because you share overlapping themes in your profile. "
                f"Based on what you both mention, you have common ground around {topics}. "
                f"That overlap can make it easier to start a conversation and compare perspectives. "
                f"You could ask {user2.name} what they’re currently building or learning in these areas, "
                f"and share what you’re working on as well."
            )
        return (
            f"We’re recommending {user2.name} because your experience and interests show meaningful overlap. "
            f"Even if your backgrounds aren’t identical, there’s enough shared context to have a productive chat. "
            f"A good way to start is to compare what you each care about most in your work or interests, "
            f"and then see if there’s a topic you’d both like to go deeper on."
        )

    def find_matches_for_user(
            self,
            user_id: UUID,
            top_k: int = 10,
            min_score: float = 0.02,
            apply_mmr: bool = True,
            mmr_lambda: float = 0.5,
    ) -> List[Tuple[UUID, float]]:
        """
        Find matching users for a given user ID.

        This is the main method you requested: takes a user ID, queries database,
        runs matching algorithm, and returns matched user IDs with scores.

        Args:
            user_id: Target user's UUID
            top_k: Number of matches to return
            min_score: Minimum similarity score threshold
            apply_mmr: Whether to apply diversity selection
            mmr_lambda: MMR diversity parameter (0.5 = balanced)

        Returns:
            List of (matched_user_id, score) tuples, sorted by score descending

        Raises:
            ValueError: If user_id not found in database
        """
        # 1. Fetch target user
        target_user = self._get_user_by_id(user_id)
        if not target_user:
            raise ValueError(f"User {user_id} not found in database")

        # 2. Fetch all users (for matching pool)
        all_users = self._fetch_all_users()

        # 3. Run matching algorithm
        matches = self.engine.match_users(
            users=all_users,
            params=self.default_params,
            top_k=top_k,
            apply_mmr=apply_mmr,
            mmr_lambda=mmr_lambda,
            min_score=min_score,
        )

        # 4. Extract results for target user
        user_id_str = str(user_id)
        ranked_users = matches.get(user_id_str, [])

        # 5. Convert to (UUID, score) tuples
        results = [
            (UUID(ranked_user.user_id), ranked_user.score)
            for ranked_user in ranked_users
        ]

        return results

    def find_matches_with_reasons(
            self,
            user_id: UUID,
            top_k: int = 10,
            min_score: float = 0.02,
            apply_mmr: bool = True,
            mmr_lambda: float = 0.5,
    ) -> List[Dict[str, any]]:
        """
        Find matching users with detailed reasons for each match.

        NEW METHOD: Returns matches with generated reasons explaining why they match.

        Args:
            user_id: Target user's UUID
            top_k: Number of matches to return
            min_score: Minimum similarity score threshold
            apply_mmr: Whether to apply diversity selection
            mmr_lambda: MMR diversity parameter

        Returns:
            List of dictionaries:
            {
                'user_id': UUID,
                'name': str,
                'role': str,
                'score': float,
                'reason': str,  # <- NEW: Human-readable match explanation
                'exp_similarity': float,
                'interest_similarity': float,
                'tags': List[str],
            }

        Example:
            matches = service.find_matches_with_reasons(user_id, top_k=5)
            for match in matches:
                print(f"{match['name']}: {match['reason']}")
        """
        # 1. Get target user
        target_user = self._get_user_by_id(user_id)
        if not target_user:
            raise ValueError(f"User {user_id} not found in database")

        # 2. Fetch all users
        all_users = self._fetch_all_users()

        # 3. Run matching algorithm
        match_results = self.engine.match_users(
            users=all_users,
            params=self.default_params,
            top_k=top_k,
            apply_mmr=apply_mmr,
            mmr_lambda=mmr_lambda,
            min_score=min_score,
        )

        # 4. Extract and enrich results
        user_id_str = str(user_id)
        ranked_users = match_results.get(user_id_str, [])

        results_with_reasons = []
        for ranked_user in ranked_users:
            # Get matched user profile
            matched_user = self._get_user_by_id(UUID(ranked_user.user_id))
            if not matched_user:
                continue

            # Extract similarity scores from debug info
            exp_sim = ranked_user.debug_info.get('exp_sim', 0.1)
            interest_sim = ranked_user.debug_info.get('interest_sim', 0.1)
            overall_score = ranked_user.score

            # Generate match reason
            reason = self._generate_match_reason(
                target_user,
                matched_user,
                exp_sim,
                interest_sim,
                overall_score
            )

            # Build result dictionary
            results_with_reasons.append({
                'user_id': UUID(ranked_user.user_id),
                'name': matched_user.name,
                'role': matched_user.role,
                'score': overall_score,
                'reason': reason,  # Human-readable explanation
                'exp_similarity': exp_sim,
                'exp_debug': ranked_user.debug_info.get('exp_debug', ''),
                'interest_similarity': interest_sim,
                'interest_debug': ranked_user.debug_info.get('interest_debug', ''),
                'tags': matched_user.tags,
                'metadata': matched_user.metadata,
            })

        return results_with_reasons

    def find_matches_for_user_detailed(
            self,
            user_id: UUID,
            top_k: int = 10,
            min_score: float = 0.02,
            apply_mmr: bool = True,
            mmr_lambda: float = 0.5,
    ) -> List[Dict]:
        """
        Find matching users with detailed information.

        Returns full profile information for each match, not just IDs.

        Args:
            user_id: Target user's UUID
            top_k: Number of matches to return
            min_score: Minimum similarity score threshold
            apply_mmr: Whether to apply diversity selection
            mmr_lambda: MMR diversity parameter

        Returns:
            List of dictionaries containing match details:
            {
                'user_id': UUID,
                'name': str,
                'role': str,
                'score': float,
                'exp_similarity': float,
                'interest_similarity': float,
                'tags': List[str],
            }
        """
        # Get basic matches
        matches = self.find_matches_for_user(
            user_id, top_k, min_score, apply_mmr, mmr_lambda
        )

        # Enrich with profile details
        detailed_results = []
        for matched_user_id, score in matches:
            matched_profile = self._get_user_by_id(matched_user_id)
            if matched_profile:
                # Get debug info from cached results
                user_id_str = str(user_id)
                if user_id_str in self._user_profile_cache:
                    all_users = self._fetch_all_users()
                    match_results = self.engine.match_users(
                        users=all_users,
                        params=self.default_params,
                        top_k=top_k,
                        min_score=min_score,
                    )

                    ranked = match_results.get(user_id_str, [])
                    debug_info = {}
                    for r in ranked:
                        if r.user_id == str(matched_user_id):
                            debug_info = r.debug_info
                            break

                detailed_results.append({
                    'user_id': matched_user_id,
                    'name': matched_profile.name,
                    'role': matched_profile.role,
                    'score': score,
                    'exp_similarity': debug_info.get('exp_sim', 0.0),
                    'interest_similarity': debug_info.get('interest_sim', 0.0),
                    'tags': matched_profile.tags,
                    'metadata': matched_profile.metadata,
                })

        return detailed_results

    def batch_find_matches(
            self,
            user_ids: List[UUID],
            top_k: int = 10,
            min_score: float = 0.02,
    ) -> Dict[UUID, List[Tuple[UUID, float]]]:
        """
        Find matches for multiple users in one batch (more efficient).

        Args:
            user_ids: List of user UUIDs to find matches for
            top_k: Number of matches per user
            min_score: Minimum similarity score

        Returns:
            Dictionary mapping user_id -> list of (matched_id, score)
        """
        # Fetch all users once
        all_users = self._fetch_all_users()

        # Run matching for all users
        matches = self.engine.match_users(
            users=all_users,
            params=self.default_params,
            top_k=top_k,
            min_score=min_score,
        )

        # Filter results for requested users
        results = {}
        for user_id in user_ids:
            user_id_str = str(user_id)
            if user_id_str in matches:
                ranked_users = matches[user_id_str]
                results[user_id] = [
                    (UUID(r.user_id), r.score)
                    for r in ranked_users
                ]
            else:
                results[user_id] = []

        return results

    def batch_find_matches_with_reasons(
            self,
            user_ids: List[UUID],
            top_k: int = 10,
            min_score: float = 0.02,
    ) -> Dict[UUID, List[Dict[str, any]]]:
        """
        Find matches with reasons for multiple users in batch.

        NEW METHOD: Batch version of find_matches_with_reasons.

        Args:
            user_ids: List of user UUIDs to find matches for
            top_k: Number of matches per user
            min_score: Minimum similarity score

        Returns:
            Dictionary mapping user_id -> list of match dicts with reasons
        """
        results = {}
        for user_id in user_ids:
            try:
                matches = self.find_matches_with_reasons(
                    user_id=user_id,
                    top_k=top_k,
                    min_score=min_score,
                )
                results[user_id] = matches
            except ValueError:
                # User not found
                results[user_id] = []

        return results

    def clear_cache(self):
        """Clear the vector cache (useful for testing or after data updates)"""
        self._user_profile_cache.clear()