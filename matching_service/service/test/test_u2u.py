"""
Minimal Top 5 Matching Test (DETAILED)

Simplest possible test - get top 5 matches with detailed info and print them.
"""

import sys
from pathlib import Path
import json

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from service.u2u_service import MatchingService
from db.repositories.profile_repository import ProfileRepository

def parser(id, match):
    new_match = []
    for user in match:
        new_match.append({"user_id": user['user_id'], "reason": user['reason']})
    return {id: new_match}



def main():
    """Find top 5 detailed matches for first user in database"""

    print("\n🔍 Finding Top 5 Detailed Matches...\n")

    # Get first user
    repo = ProfileRepository()
    users = repo.get_all(limit=1)

    if not users:
        print("❌ No users in database!")
        return

    target = users[0]
    print(f"Target User: {target.name} ({target.id})\n")

    # Initialize service and find matches
    print("Initializing matching service...")
    service = MatchingService(device="cpu", cache_vectors=True)

    print("Running matching algorithm...\n")

    # match = service.find_matches_for_user_detailed(
    #     user_id=target.id,
    #     top_k=5,
    #     min_score=0.00,
    #     apply_mmr=True,
    #     mmr_lambda=0.5,
    # )

    match = service.find_matches_with_reasons(
        user_id=target.id,
        top_k=5,
        min_score=0.00,
        apply_mmr=True,
        mmr_lambda=0.5,
    )
    match = parser(str(target.id), match)
    print(json.dumps(match, ensure_ascii=False, indent=2, default=str))






if __name__ == "__main__":
    main()
