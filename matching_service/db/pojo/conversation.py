"""
Conversation DTO - Conversation data model
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ConversationDTO(BaseModel):
    """
    Conversation data transfer object

    Represents a conversation session between two users
    """

    # Primary key
    id: int = Field(..., description="Unique conversation identifier (auto-increment)")

    # Participants
    participant1_id: UUID = Field(..., description="Participant 1 user ID")
    participant2_id: UUID = Field(..., description="Participant 2 user ID")

    # Timestamps
    created_at: datetime = Field(..., description="Conversation creation timestamp")
    last_message_at: Optional[datetime] = Field(None, description="Last message timestamp")

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

    def get_participants(self) -> tuple[UUID, UUID]:
        """Get participant ID tuple"""
        return (self.participant1_id, self.participant2_id)

    def has_participant(self, user_id: UUID) -> bool:
        """Check if a user is a participant in this conversation"""
        return user_id in (self.participant1_id, self.participant2_id)

    def get_other_participant(self, user_id: UUID) -> Optional[UUID]:
        """Get the other participant's ID in this conversation"""
        if user_id == self.participant1_id:
            return self.participant2_id
        elif user_id == self.participant2_id:
            return self.participant1_id
        return None