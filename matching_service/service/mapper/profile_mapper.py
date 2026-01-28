"""
Profile Mapper - Convert database ProfileDTO to matching UserProfile

Maps database fields to matching service fields by composing text from multiple sources.
"""

from typing import List, Optional
from db.pojo.profile import ProfileDTO
from src.matching.matching_pojo import UserProfile


def build_exp_text(profile: ProfileDTO) -> str:
    """
    Compose experience text from multiple database fields.

    Combines: bio, company, title, work experience, education, publications

    Args:
        profile: ProfileDTO from database

    Returns:
        Composed experience text
    """
    parts = []

    # 1. Bio (most comprehensive)
    if profile.bio and profile.bio.strip():
        parts.append(profile.bio.strip())

    # 2. Work experience
    work_parts = []
    if profile.company:
        work_parts.append(f"Works at {profile.company}")
    if profile.title:
        if work_parts:
            work_parts.append(f"as {profile.title}")
        else:
            work_parts.append(f"Role: {profile.title}")
    if profile.work_experience_years:
        work_parts.append(f"({profile.work_experience_years} years experience)")

    if work_parts:
        parts.append(" ".join(work_parts))

    # 3. Education
    edu_parts = []
    if profile.school:
        edu_parts.append(f"Studied at {profile.school}")
    if profile.major:
        if edu_parts:
            edu_parts.append(f"in {profile.major}")
        else:
            edu_parts.append(f"Major: {profile.major}")
    if profile.degree:
        if edu_parts:
            edu_parts.append(f"({profile.degree})")
        else:
            edu_parts.append(f"Degree: {profile.degree}")
    if profile.year:
        edu_parts.append(f"Year: {profile.year}")
    if profile.expected_grad_date:
        edu_parts.append(f"Expected graduation: {profile.expected_grad_date}")

    if edu_parts:
        parts.append(" ".join(edu_parts))

    # 4. Institution (if different from school)
    if profile.institution and profile.institution != profile.school:
        parts.append(f"Institution: {profile.institution}")

    # 5. Publications
    if profile.publications and profile.publications.strip():
        parts.append(f"Publications: {profile.publications.strip()}")

    # 6. Short answer (additional context)
    if profile.short_answer and profile.short_answer.strip():
        parts.append(profile.short_answer.strip())

    return ". ".join(parts).strip()


def build_interest_text(profile: ProfileDTO) -> str:
    """
    Compose interest text from multiple database fields.

    Combines: interests, interest_areas, research_areas, research_area, hobbies

    Args:
        profile: ProfileDTO from database

    Returns:
        Composed interest text
    """
    parts = []

    # 1. General interests
    if profile.interests and profile.interests.strip():
        parts.append(f"Interests: {profile.interests.strip()}")

    # 2. Interest areas
    if profile.interest_areas and profile.interest_areas.strip():
        # Avoid duplication with interests
        if not (profile.interests and profile.interest_areas in profile.interests):
            parts.append(f"Interest areas: {profile.interest_areas.strip()}")

    # 3. Research areas (combine research_areas and research_area)
    research_text = None
    if profile.research_areas and profile.research_areas.strip():
        research_text = profile.research_areas.strip()
    elif profile.research_area and profile.research_area.strip():
        research_text = profile.research_area.strip()

    if research_text:
        parts.append(f"Research: {research_text}")

    # 4. Hobbies
    if profile.hobbies and profile.hobbies.strip():
        parts.append(f"Hobbies: {profile.hobbies.strip()}")

    # 5. Other description (if available)
    if profile.other_description and profile.other_description.strip():
        parts.append(profile.other_description.strip())

    return ". ".join(parts).strip()


def build_tags(profile: ProfileDTO) -> List[str]:
    """
    Parse tags from current_skills field.

    Expects comma-separated or semicolon-separated tags.

    Args:
        profile: ProfileDTO from database

    Returns:
        List of tag strings
    """
    if not profile.current_skills or not profile.current_skills.strip():
        return []

    # Replace semicolons with commas for uniform parsing
    skills_text = profile.current_skills.replace(';', ',')

    # Split and clean
    tags = []
    for tag in skills_text.split(','):
        cleaned = tag.strip()
        if cleaned:
            tags.append(cleaned)

    return tags


def profile_dto_to_user_profile(profile: ProfileDTO) -> UserProfile:
    """
    Convert database ProfileDTO to matching service UserProfile.

    This is the main conversion function that orchestrates all field mappings.

    Args:
        profile: ProfileDTO from database

    Returns:
        UserProfile for matching service
    """
    return UserProfile(
        user_id=str(profile.id),  # Convert UUID to string
        name=profile.name or "Unknown",  # Fallback if name is None
        role=profile.occupation or "attendee",  # Map occupation to role
        tags=build_tags(profile),
        exp_text=build_exp_text(profile),
        interest_text=build_interest_text(profile),
        metadata={
            # Store additional metadata for reference
            "email": profile.email,
            "github": profile.github,
            "linkedin": profile.linkedin,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
        }
    )


def profile_dtos_to_user_profiles(profiles: List[ProfileDTO]) -> List[UserProfile]:
    """
    Convert a list of ProfileDTOs to UserProfiles.

    Args:
        profiles: List of ProfileDTOs from database

    Returns:
        List of UserProfiles for matching service
    """
    return [profile_dto_to_user_profile(p) for p in profiles]