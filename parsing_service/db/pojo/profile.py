"""
Profile DTO - User/Researcher profile data model
"""

from datetime import datetime
from typing import Optional, List, Union
from uuid import UUID
from pydantic import BaseModel, Field


class ProfileDTO(BaseModel):
    """
    User profile data transfer object
    """

    id: UUID = Field(..., description="Unique user identifier")
    name: Optional[str] = Field(None, description="User's name")
    email: Optional[str] = Field(None, description="Email address")
    bio: Optional[str] = Field(None, description="Personal biography")
    occupation: Optional[str] = Field(None, description="Occupation")

    school: Optional[str] = Field(None, description="School name")
    major: Optional[str] = Field(None, description="Major field of study")
    degree: Optional[str] = Field(None, description="Degree type")
    year: Optional[str] = Field(None, description="Current year/grade")
    expected_grad_date: Optional[str] = Field(None, description="Expected graduation date")

    research_area: Optional[str] = Field(None, description="Research area (singular)")
    interest_areas: Optional[Union[List[str], str]] = Field(None, description="Areas of interest")
    publications: Optional[str] = Field(None, description="Publications")

    company: Optional[str] = Field(None, description="Company name")
    title: Optional[str] = Field(None, description="Job title")
    work_experience_years: Optional[str] = Field(None, description="Years of work experience")

    current_skills: Optional[Union[List[str], str]] = Field(None, description="Current skills")
    hobbies: Optional[Union[List[str], str]] = Field(None, description="Hobbies")

    github: Optional[str] = Field(None, description="GitHub profile URL")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")

    other_description: Optional[str] = Field(None, description="Other description")

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
