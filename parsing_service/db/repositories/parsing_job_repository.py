"""
Parsing Job Repository
"""

from typing import Optional, List
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.parsing_job import ParsingJobDTO


class ParsingJobRepository(BaseRepository[ParsingJobDTO]):
    def __init__(self):
        super().__init__("parsing_jobs", ParsingJobDTO)

    def get_by_id(self, job_id: UUID) -> Optional[ParsingJobDTO]:
        return super().get_by_id("id", job_id)

    def get_by_user_id(self, user_id: UUID, limit: Optional[int] = None) -> List[ParsingJobDTO]:
        return self.filter({"user_id": str(user_id)}, limit=limit)

    def update_job(self, job_id: UUID, updates: dict) -> Optional[ParsingJobDTO]:
        return super().update("id", job_id, updates)
