"""
Parsing Service - Handle resume/photo parsing jobs
"""

from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from uuid import UUID, uuid4

from pypdf import PdfReader
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from db.repositories.profile_repository import ProfileRepository
from db.repositories.parsing_job_repository import ParsingJobRepository
from service.parsing.llm_client import LlmClient


ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
LIST_FIELDS = {"interest_areas", "current_skills", "hobbies"}
ALLOWED_FIELDS = {
    "name",
    "email",
    "occupation",
    "bio",
    "school",
    "major",
    "degree",
    "year",
    "expected_grad_date",
    "company",
    "title",
    "work_experience_years",
    "research_area",
    "interest_areas",
    "publications",
    "current_skills",
    "hobbies",
    "github",
    "linkedin",
    "other_description",
}


class ParsingService:
    def __init__(self) -> None:
        self.profile_repo = ProfileRepository()
        self.job_repo = ParsingJobRepository()
        self._llm: Optional[LlmClient] = None

        default_upload_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        )
        self.upload_dir = os.getenv("PARSING_UPLOAD_DIR", default_upload_dir)

    def create_job(self, user_id: UUID, file: FileStorage) -> UUID:
        job_id = uuid4()
        file_path = self._save_file(job_id, file)
        now = datetime.now(timezone.utc)

        self.job_repo.create({
            "id": str(job_id),
            "user_id": str(user_id),
            "file_path": file_path,
            "status": "pending",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        })
        return job_id

    def start_job(self, job_id: UUID) -> None:
        thread = threading.Thread(target=self._process_job_safe, args=(job_id,), daemon=True)
        thread.start()

    def get_job(self, job_id: UUID):
        return self.job_repo.get_by_id(job_id)

    def claim_job(self, job_id: UUID, real_user_id: UUID) -> None:
        job = self.job_repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        self.job_repo.update_job(job_id, {"user_id": str(real_user_id)})

    def _process_job_safe(self, job_id: UUID) -> None:
        try:
            self._process_job(job_id)
        except Exception as e:
            self._update_job(job_id, status="failed", error=str(e))

    def _process_job(self, job_id: UUID) -> None:
        job = self.job_repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        self._update_job(job_id, status="processing")
        file_path = job.file_path
        ext = os.path.splitext(file_path.lower())[1]

        parsed: Dict[str, Any]
        if ext == ".pdf":
            text = self._extract_text_from_pdf(file_path)
            if not text.strip():
                raise ValueError("No extractable text found in PDF")
            hint_text = "This is a resume PDF. Extract profile fields and return JSON."
            parsed = self._get_llm().parse_profile_from_text(text, hint_text=hint_text)
        elif ext in {".png", ".jpg", ".jpeg"}:
            with open(file_path, "rb") as f:
                image_bytes = f.read()
            mime_type = "image/png" if ext == ".png" else "image/jpeg"
            hint_text = "This is a resume or profile photo. Extract profile fields and return JSON."
            parsed = self._get_llm().parse_profile_from_image(image_bytes, mime_type, hint_text=hint_text)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        normalized = self._normalize_payload(parsed)
        mapped = self._normalize_payload(self._map_raw_to_allowed(parsed))
        normalized = self._merge_allowed(normalized, mapped)
        self._update_job(job_id, status="needs_review", parsed_data=normalized, parsed_raw=parsed)

    def _save_file(self, job_id: UUID, file: FileStorage) -> str:
        filename = secure_filename(file.filename or "")
        ext = os.path.splitext(filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {ext}")

        job_dir = os.path.join(self.upload_dir, str(job_id))
        os.makedirs(job_dir, exist_ok=True)
        file_path = os.path.join(job_dir, filename)
        file.save(file_path)
        return file_path

    def _extract_text_from_pdf(self, file_path: str) -> str:
        reader = PdfReader(file_path)
        parts: List[str] = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text:
                parts.append(text)
        return "\n".join(parts).strip()

    def _normalize_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise ValueError("LLM returned non-dict payload")

        normalized: Dict[str, Any] = {}
        # Initialize all allowed fields
        for key in ALLOWED_FIELDS:
            normalized[key] = [] if key in LIST_FIELDS else None

        # Fill from payload, drop unknown keys
        for key, value in payload.items():
            if key not in ALLOWED_FIELDS:
                continue
            if key in LIST_FIELDS:
                normalized[key] = self._normalize_list(value)
            else:
                normalized[key] = self._normalize_scalar(value)

        return normalized

    def _merge_allowed(self, primary: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
        merged = dict(primary)
        for key, value in fallback.items():
            if key not in ALLOWED_FIELDS:
                continue
            if self._has_value(merged.get(key)):
                continue
            if self._has_value(value):
                merged[key] = value
        return merged

    def _map_raw_to_allowed(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(raw, dict):
            return {}

        mapped: Dict[str, Any] = {}

        # Name
        if raw.get("name"):
            mapped["name"] = raw.get("name")

        # Contact
        contact = raw.get("contact") or {}
        if isinstance(contact, dict):
            if contact.get("email"):
                mapped["email"] = contact.get("email")
            if contact.get("linkedin"):
                mapped["linkedin"] = contact.get("linkedin")
            if contact.get("github"):
                mapped["github"] = contact.get("github")

        # Skills
        skills = raw.get("skills_and_interests") or {}
        if isinstance(skills, dict):
            tech = skills.get("technical_skills") or []
            if tech:
                mapped["current_skills"] = tech

        # Education (most recent)
        education = raw.get("education") or []
        if isinstance(education, list) and education:
            edu = education[0]
            if isinstance(edu, dict):
                if edu.get("institution"):
                    mapped["school"] = edu.get("institution")
                if edu.get("major"):
                    mapped["major"] = edu.get("major")
                if edu.get("degree"):
                    mapped["degree"] = edu.get("degree")
                dates = edu.get("dates")
                if dates:
                    mapped["expected_grad_date"] = dates

        # Experience / internships (most recent)
        internships = raw.get("internships") or []
        if isinstance(internships, list) and internships:
            role = internships[0]
            if isinstance(role, dict):
                if role.get("company"):
                    mapped["company"] = role.get("company")
                if role.get("title"):
                    mapped["title"] = role.get("title")

        # Research/projects -> interest_areas
        projects = raw.get("research_projects") or []
        if isinstance(projects, list) and projects:
            titles = [p.get("title") for p in projects if isinstance(p, dict) and p.get("title")]
            if titles:
                mapped["interest_areas"] = titles

        # Map explicit interests into interest_areas if present
        if not mapped.get("interest_areas"):
            raw_interests = raw.get("interests")
            if isinstance(raw_interests, list):
                mapped["interest_areas"] = raw_interests
            elif isinstance(raw_interests, str) and raw_interests.strip():
                mapped["interest_areas"] = [raw_interests.strip()]

        return mapped

    def _normalize_list(self, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str):
            if not value.strip():
                return []
            return [v.strip() for v in value.replace(";", ",").split(",") if v.strip()]
        return []

    def _normalize_scalar(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, str):
            cleaned = value.strip()
            return cleaned if cleaned else None
        return str(value)

    def confirm_job(self, job_id: UUID, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        job = self.job_repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        if job.status == "confirmed":
            raise ValueError("Job already confirmed")
        if not job.parsed_data:
            raise ValueError("No parsed_data available for this job")

        final_data = dict(job.parsed_data)
        if overrides:
            final_data.update(overrides)

        normalized = self._normalize_payload(final_data)
        self._apply_profile_update(
            job.user_id,
            normalized,
            allow_overwrite=True,
            create_if_missing=True,
        )
        self._update_job(job_id, status="confirmed", parsed_data=normalized)
        return normalized

    def _apply_profile_update(
        self,
        user_id: UUID,
        parsed: Dict[str, Any],
        allow_overwrite: bool = False,
        create_if_missing: bool = False,
    ) -> None:
        existing = self.profile_repo.get_by_id(user_id)
        if not existing:
            if create_if_missing:
                self._create_profile(user_id, parsed)
                return
            raise ValueError(f"Profile not found for user_id: {user_id}")

        updates: Dict[str, Any] = {}
        for key, value in parsed.items():
            if value is None:
                continue
            if isinstance(value, list) and len(value) == 0:
                continue

            if not allow_overwrite:
                current_value = getattr(existing, key, None)
                if self._has_value(current_value):
                    continue
            updates[key] = value

        if updates:
            self.profile_repo.update_profile(user_id, updates)

    def _create_profile(self, user_id: UUID, parsed: Dict[str, Any]) -> None:
        name = parsed.get("name")
        email = parsed.get("email")
        if not name or not str(name).strip():
            raise ValueError("Missing required field for new profile: name")
        if not email or not str(email).strip():
            raise ValueError("Missing required field for new profile: email")

        payload: Dict[str, Any] = {"id": str(user_id), "name": name, "email": email}
        for key, value in parsed.items():
            if key in payload:
                continue
            if value is None:
                continue
            if isinstance(value, list) and len(value) == 0:
                continue
            payload[key] = value

        self.profile_repo.create_profile(payload)

    def _has_value(self, value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, list):
            return len(value) > 0
        if isinstance(value, str):
            return bool(value.strip())
        return True

    def _update_job(
        self,
        job_id: UUID,
        status: Optional[str] = None,
        error: Optional[str] = None,
        parsed_data: Optional[Dict[str, Any]] = None,
        parsed_raw: Optional[Dict[str, Any]] = None,
    ) -> None:
        updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if status:
            updates["status"] = status
        if error:
            updates["error"] = error
        if parsed_data is not None:
            updates["parsed_data"] = parsed_data
        if parsed_raw is not None:
            updates["parsed_raw"] = parsed_raw
        self.job_repo.update_job(job_id, updates)

    def _get_llm(self) -> LlmClient:
        if self._llm is None:
            self._llm = LlmClient()
        return self._llm
