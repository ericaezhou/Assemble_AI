"""
Profile Mapper - Convert database ProfileDTO to matching UserProfile

Maps database fields to matching service fields by composing text from multiple sources.
"""

import json
import os
from typing import Any, List
from db.pojo.profile import ProfileDTO
from src.matching.matching_pojo import UserProfile


def _list_to_text(field_value) -> str:
    """
    Helper function to convert list or string to text.

    Args:
        field_value: Either a list of strings or a string

    Returns:
        Comma-separated string
    """
    if not field_value:
        return ""

    if isinstance(field_value, list):
        flattened = _flatten_to_strings(field_value)
        return ", ".join(flattened)
    elif isinstance(field_value, str):
        return field_value.strip()

    return ""


def _flatten_to_strings(value: Any) -> List[str]:
    """
    Flatten nested lists/tuples and coerce leaf values to strings.
    """
    result: List[str] = []

    if value is None:
        return result

    if isinstance(value, (list, tuple)):
        for item in value:
            result.extend(_flatten_to_strings(item))
        return result

    text = str(value).strip()
    if text:
        result.append(text)
    return result


def _as_clean_text(value: Any) -> str:
    """
    Normalize string/list values into a clean text representation.
    """
    return _list_to_text(value)


def _parse_embedding(value: Any) -> List[float]:
    """
    Parse pgvector value from DB to List[float].

    Supabase may return vector as a list or as string like "[0.1,0.2,...]".
    """
    if value is None:
        return []

    if isinstance(value, list):
        parsed: List[float] = []
        for item in value:
            try:
                parsed.append(float(item))
            except (TypeError, ValueError):
                continue
        return parsed

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        try:
            loaded = json.loads(text)
            if isinstance(loaded, list):
                return [float(item) for item in loaded]
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    return []


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
    bio_text = _as_clean_text(profile.bio)
    if bio_text:
        parts.append(bio_text)

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
    publications_text = _as_clean_text(profile.publications)
    if publications_text:
        parts.append(f"Publications: {publications_text}")

    # 6. Short answer (additional context)
    short_answer_text = _as_clean_text(profile.short_answer)
    if short_answer_text:
        parts.append(short_answer_text)

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
    interests_text = _as_clean_text(profile.interests)
    if interests_text:
        parts.append(f"Interests: {interests_text}")

    # 2. Interest areas
    interest_areas_text = _list_to_text(profile.interest_areas)
    if interest_areas_text:
        # Avoid duplication with interests
        if not (interests_text and interest_areas_text in interests_text):
            parts.append(f"Interest areas: {interest_areas_text}")

    # 3. Research areas
    research_text = _list_to_text(profile.research_areas)
    if not research_text and profile.research_area:
        research_text = profile.research_area.strip() if isinstance(profile.research_area, str) else ""

    if research_text:
        parts.append(f"Research: {research_text}")

    # 4. Hobbies
    hobbies_text = _list_to_text(profile.hobbies)
    if hobbies_text:
        parts.append(f"Hobbies: {hobbies_text}")

    # 5. Other description (if available)
    other_description_text = _as_clean_text(profile.other_description)
    if other_description_text:
        parts.append(other_description_text)

    return ". ".join(parts).strip()


def build_tags(profile: ProfileDTO) -> List[str]:
    """
    Parse tags from current_skills field.

    Now handles both List[str] and comma/semicolon-separated strings.

    Args:
        profile: ProfileDTO from database

    Returns:
        List of tag strings
    """
    if not profile.current_skills:
        return []

    if isinstance(profile.current_skills, list):
        return [tag.strip() for tag in profile.current_skills if tag and tag.strip()]

    if isinstance(profile.current_skills, str):
        if not profile.current_skills.strip():
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

    return []


def profile_dto_to_user_profile(profile: ProfileDTO) -> UserProfile:
    """
    Convert database ProfileDTO to matching service UserProfile.

    This is the main conversion function that orchestrates all field mappings.

    Args:
        profile: ProfileDTO from database

    Returns:
        UserProfile for matching service
    """
    cached_embedding = _parse_embedding(profile.user_embedding)
    match_dim = int(os.getenv("MATCH_VECTOR_DIM", "512"))
    vector = [float(v) for v in cached_embedding[:match_dim]] if cached_embedding else None

    return UserProfile(
        user_id=str(profile.id),  # Convert UUID to string
        name=profile.name or "Unknown",  # Fallback if name is None
        role=profile.occupation or "attendee",  # Map occupation to role
        tags=build_tags(profile),
        exp_text=build_exp_text(profile),
        interest_text=build_interest_text(profile),
        # Reuse cached DB embedding for all matching dimensions to avoid on-request re-encoding.
        v_exp=vector,
        v_interest=vector,
        v_profile=vector,
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