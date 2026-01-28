"""
Message DTO - Message data model
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class MessageDTO(BaseModel):
    """
    Message data transfer object

    Represents a single message in a conversation
    """

    # Primary key
    id: int = Field(..., description="Unique message identifier (auto-increment)")

    # Foreign keys
    conversation_id: int = Field(..., description="Associated conversation ID")
    sender_id: UUID = Field(..., description="Sender user ID")

    # Message content
    content: Optional[str] = Field(None, description="Message content")
    is_system_message: Optional[bool] = Field(False, description="Whether this is a system message")

    # Timestamp
    created_at: datetime = Field(..., description="Creation timestamp")

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