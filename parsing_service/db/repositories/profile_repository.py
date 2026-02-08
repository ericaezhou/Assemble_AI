"""
Profile Repository
"""

from typing import Optional
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.profile import ProfileDTO


class ProfileRepository(BaseRepository[ProfileDTO]):
    def __init__(self):
        super().__init__("profiles", ProfileDTO)

    def get_by_id(self, profile_id: UUID) -> Optional[ProfileDTO]:
        return super().get_by_id("id", profile_id)

    def update_profile(self, profile_id: UUID, updates: dict) -> Optional[ProfileDTO]:
        return super().update("id", profile_id, updates)

    def create_profile(self, data: dict) -> ProfileDTO:
        return super().create(data)
