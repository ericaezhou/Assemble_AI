"""
Matching Service - Connects database with matching algorithm

This service orchestrates:
1. Fetching user data from database (ProfileRepository)
2. Converting to matching format (UserProfile)
3. Running matching algorithm
4. Generating match reasons
5. Returning results with explanations
"""

from typing import List, Optional, Dict, Tuple
from uuid import UUID

from db.repositories.profile_repository import ProfileRepository
from src.matching.matching_pojo import UserProfile, MatchingParams
from src.matching.adapters import Qwen3Embedder, InMemoryRetriever, build_user_vectors
from src.matching.engine import MatchingEngine
from service.mapper.profile_mapper import profile_dto_to_user_profile, profile_dtos_to_user_profiles


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
            embedder_model: str = "Qwen/Qwen3-Embedding-0.6B",
            device: str = "cpu",
            cache_vectors: bool = True,
    ):
        """
        Initialize matching service.

        Args:
            embedder_model: Model name for embedder
            device: Device for computation ("cpu" or "cuda")
            cache_vectors: Whether to cache user vectors in memory
        """
        # Initialize database repository
        self.profile_repo = ProfileRepository()

        # Initialize matching components
        self.embedder = Qwen3Embedder(
            model_name=embedder_model,
            device=device,
            normalize=True,
            truncate_dim=512,  # Use 512d for faster computation
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
            user1: UserProfile,
            user2: UserProfile,
            exp_similarity: float,
            interest_similarity: float,
            overall_score: float
    ) -> str:
        """
        Generate a human-readable reason for why two users match.

        Args:
            user1: First user profile
            user2: Second user profile
            exp_similarity: Experience similarity score (0-1)
            interest_similarity: Interest similarity score (0-1)
            overall_score: Overall match score (0-1)

        Returns:
            String explanation of the match
        """
        reasons = []

        # Determine match strength
        if overall_score >= 0.7:
            strength = "excellent"
        elif overall_score >= 0.5:
            strength = "good"
        elif overall_score >= 0.3:
            strength = "moderate"
        else:
            strength = "potential"

        # Opening statement
        reasons.append(f"This is a {strength} match (score: {overall_score:.2f}).")

        # Experience similarity reasoning
        if exp_similarity >= 0.6:
            reasons.append(
                f"Both users have highly similar professional backgrounds (similarity: {exp_similarity:.2f}). "
                f"They share experience in {user1.role} and {user2.role} roles."
            )
        elif exp_similarity >= 0.3:
            reasons.append(
                f"The users have complementary professional backgrounds (similarity: {exp_similarity:.2f}). "
                f"{user1.name}'s experience in {user1.role} could complement {user2.name}'s work in {user2.role}."
            )
        else:
            reasons.append(
                f"While their professional backgrounds differ, "
                f"this could lead to valuable cross-disciplinary insights."
            )

        # Interest similarity reasoning
        if interest_similarity >= 0.6:
            # Find common tags
            common_tags = set(user1.tags) & set(user2.tags)
            if common_tags:
                tags_str = ", ".join(list(common_tags)[:3])
                reasons.append(
                    f"They share strong common interests (similarity: {interest_similarity:.2f}), "
                    f"including: {tags_str}."
                )
            else:
                reasons.append(
                    f"They share strong common interests (similarity: {interest_similarity:.2f})."
                )
        elif interest_similarity >= 0.3:
            reasons.append(
                f"They have overlapping interests (similarity: {interest_similarity:.2f}) "
                f"that could spark engaging conversations."
            )

        # Add specific connection points
        connection_points = []

        # Check for common tags
        common_tags = set(user1.tags) & set(user2.tags)
        if common_tags and len(common_tags) >= 2:
            connection_points.append(
                f"shared skills/interests in {', '.join(list(common_tags)[:3])}"
            )

        # Role-based connections
        if user1.role and user2.role:
            role_keywords = {
                'engineer': ['technical', 'development', 'implementation'],
                'manager': ['product', 'strategy', 'leadership'],
                'designer': ['design', 'user experience', 'creativity'],
                'researcher': ['research', 'innovation', 'analysis'],
                'scientist': ['data', 'research', 'analysis']
            }

            for role_type, keywords in role_keywords.items():
                if (role_type in user1.role.lower() and role_type in user2.role.lower()):
                    connection_points.append(f"both work in {role_type} roles")
                    break

        if connection_points:
            reasons.append(f"Key connection points include: {', '.join(connection_points)}.")

        # Collaborative potential
        if exp_similarity < 0.5 and interest_similarity >= 0.5:
            reasons.append(
                "Their different professional backgrounds combined with shared interests "
                "create opportunities for innovative collaboration."
            )
        elif exp_similarity >= 0.6 and interest_similarity >= 0.6:
            reasons.append(
                "Their aligned experience and interests make them ideal collaborators "
                "for projects in their shared domain."
            )

        return " ".join(reasons)

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