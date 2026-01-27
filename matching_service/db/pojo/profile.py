"""
Profile DTO - User/Researcher profile data model
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr


class ProfileDTO(BaseModel):
    """
    User profile data transfer object

    Contains user's basic information, academic background, work experience, research areas, etc.
    """

    # Primary key
    id: UUID = Field(..., description="Unique user identifier")

    # Basic information
    name: Optional[str] = Field(None, description="User's name")
    email: Optional[str] = Field(None, description="Email address")
    bio: Optional[str] = Field(None, description="Personal biography")
    occupation: Optional[str] = Field(None, description="Occupation")

    # Academic information
    school: Optional[str] = Field(None, description="School name")
    institution: Optional[str] = Field(None, description="Institution name")
    major: Optional[str] = Field(None, description="Major field of study")
    degree: Optional[str] = Field(None, description="Degree type")
    year: Optional[str] = Field(None, description="Current year/grade")
    expected_grad_date: Optional[str] = Field(None, description="Expected graduation date")

    # Research related
    research_areas: Optional[str] = Field(None, description="Research areas (plural)")
    research_area: Optional[str] = Field(None, description="Research area (singular)")
    interest_areas: Optional[str] = Field(None, description="Areas of interest")
    interests: Optional[str] = Field(None, description="General interests")
    publications: Optional[str] = Field(None, description="Publications")

    # Work experience
    company: Optional[str] = Field(None, description="Company name")
    title: Optional[str] = Field(None, description="Job title")
    work_experience_years: Optional[str] = Field(None, description="Years of work experience")

    # Skills and hobbies
    current_skills: Optional[str] = Field(None, description="Current skills")
    hobbies: Optional[str] = Field(None, description="Hobbies")

    # Social media
    github: Optional[str] = Field(None, description="GitHub profile URL")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")

    # Other
    short_answer: Optional[str] = Field(None, description="Short answer response")
    other_description: Optional[str] = Field(None, description="Other description")

    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        """Pydantic configuration"""
        from_attributes = True  # Allow creation from dict/ORM objects
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