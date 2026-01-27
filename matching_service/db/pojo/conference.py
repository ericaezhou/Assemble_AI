"""
Conference DTO - Conference/Event data model
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ConferenceDTO(BaseModel):
    """
    Conference/Event data transfer object

    Represents academic conferences, workshops, and other events
    """

    # Primary key
    id: str = Field(..., description="Unique conference identifier")

    # Basic information
    name: Optional[str] = Field(None, description="Conference name")
    description: Optional[str] = Field(None, description="Conference description")
    location: Optional[str] = Field(None, description="Conference physical location")

    # Host
    host_id: UUID = Field(..., description="Host user ID")

    # Time information
    start_date: Optional[str] = Field(None, description="Start date")
    end_date: Optional[str] = Field(None, description="End date")
    start_time: Optional[str] = Field(None, description="Start time")
    end_time: Optional[str] = Field(None, description="End time")
    created_at: datetime = Field(..., description="Creation timestamp")

    # Location type and virtual link
    location_type: Optional[str] = Field("in-person", description="Location type: in-person, virtual, or hybrid")
    virtual_link: Optional[str] = Field(None, description="Virtual meeting link (for online/hybrid events)")

    # Pricing information
    price_type: Optional[str] = Field("free", description="Price type: free or paid")
    price_amount: Optional[float] = Field(None, description="Price amount if paid")

    # Capacity and approval
    capacity: Optional[int] = Field(None, description="Maximum number of participants")
    require_approval: Optional[bool] = Field(False, description="Whether host approval is required to join")

    # RSVP
    rsvp_questions: Optional[str] = Field(None, description="Additional RSVP questions (JSON or text)")

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

    def is_active(self) -> bool:
        """
        Check if the conference is currently active
        Note: Requires date strings to be in parseable format
        """
        if not self.start_date or not self.end_date:
            return False

        try:
            from datetime import datetime as dt
            now = dt.now()
            start = dt.fromisoformat(self.start_date)
            end = dt.fromisoformat(self.end_date)
            return start <= now <= end
        except (ValueError, TypeError):
            # Return False if date format is invalid
            return False

    def is_free(self) -> bool:
        """Check if the conference is free"""
        return self.price_type == "free" or self.price_amount is None or self.price_amount == 0

    def is_virtual(self) -> bool:
        """Check if the conference is virtual"""
        return self.location_type == "virtual"

    def is_hybrid(self) -> bool:
        """Check if the conference is hybrid (both in-person and virtual)"""
        return self.location_type == "hybrid"

    def is_in_person(self) -> bool:
        """Check if the conference is in-person only"""
        return self.location_type == "in-person"

    def has_capacity_limit(self) -> bool:
        """Check if there is a capacity limit"""
        return self.capacity is not None and self.capacity > 0

    def requires_approval(self) -> bool:
        """Check if host approval is required"""
        return self.require_approval is True