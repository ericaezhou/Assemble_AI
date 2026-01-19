from typing import Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel

from matcher import DEFAULT_WEIGHTS, match_profiles

app = FastAPI(title="Assemble AI Matching Service")


class Profile(BaseModel):
    id: int
    institution: Optional[str] = ""
    research_areas: Optional[str] = ""
    interests: Optional[str] = ""
    bio: Optional[str] = ""


class MatchRequest(BaseModel):
    user: Profile
    candidates: List[Profile]
    k: int = 10
    weights: Optional[Dict[str, float]] = None


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/match")
def match(request: MatchRequest):
    weights = dict(DEFAULT_WEIGHTS)
    if request.weights:
        weights.update(request.weights)

    matches = match_profiles(
        user=request.user.model_dump(),
        candidates=[candidate.model_dump() for candidate in request.candidates],
        k=request.k,
        weights=weights
    )
    return {"matches": matches}
