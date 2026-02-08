"""
Parsing Job DTO - Tracks resume/photo parsing jobs
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class ParsingJobDTO(BaseModel):
    id: UUID = Field(..., description="Parsing job ID")
    user_id: UUID = Field(..., description="User profile UUID")
    file_path: str = Field(..., description="Stored file path or URL")
    status: str = Field(..., description="Job status")
    error: Optional[str] = Field(None, description="Error message if failed")
    parsed_data: Optional[Dict[str, Any]] = Field(None, description="Parsed profile data JSON")
    parsed_raw: Optional[Dict[str, Any]] = Field(None, description="Raw model output JSON")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }

    def to_dict(self) -> dict:
        return self.model_dump(exclude_none=True)
