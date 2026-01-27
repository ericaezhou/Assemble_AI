"""
Conference Participant DTO - Conference participant data model
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ConferenceParticipantDTO(BaseModel):
    """
    Conference participant data transfer object

    Represents the association between researchers and conferences
    Note: This table has no independent primary key, uses composite key (researcher_id, conference_id)
    """

    # Composite primary key
    researcher_id: UUID = Field(..., description="Researcher user ID")
    conference_id: str = Field(..., description="Conference ID")

    # Timestamp
    joined_at: Optional[datetime] = Field(None, description="Join timestamp")

    class Config:
        """Pydantic configuration"""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }

    def to_dict(self) -> dict:
        """Convert to dictionary, excluding None values"""
        return self.model_dump(exclude_none=True)

    def to_dict_with_none(self) -> dict:
        """Convert to dictionary, including None values"""
        return self.model_dump()

    def get_composite_key(self) -> tuple[UUID, str]:
        """Get composite primary key"""
        return (self.researcher_id, self.conference_id)