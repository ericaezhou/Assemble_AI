"""
Backfill missing user_embedding values in profiles table.

Usage:
  cd matching_service
  python scripts/backfill_user_embeddings.py
  python scripts/backfill_user_embeddings.py --limit 100
"""

from __future__ import annotations

import argparse
import os
import sys
from dotenv import load_dotenv

# Make "service" and "db" packages importable when running as:
#   python scripts/backfill_user_embeddings.py
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from service.u2u_service import MatchingService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill missing user embeddings")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional max number of users to process",
    )
    return parser.parse_args()


def main() -> None:
    load_dotenv(dotenv_path=os.path.join(PROJECT_ROOT, ".env"))
    args = parse_args()

    service = MatchingService(
        embedder_type="qwen",
        cache_vectors=False,
    )
    result = service.backfill_missing_user_embeddings(limit=args.limit)

    print("Backfill completed:")
    print(f"  total_profiles: {result['total_profiles']}")
    print(f"  already_has_embedding(before): {result['already_has_embedding_before']}")
    print(f"  requested: {result['requested']}")
    print(f"  updated:   {result['updated']}")
    print(f"  failed:    {result['failed']}")
    print(f"  already_has_embedding(after):  {result['already_has_embedding_after']}")
    if result["errors"]:
        print("  sample errors:")
        for item in result["errors"][:5]:
            print(f"    - {item['user_id']}: {item['error']}")


if __name__ == "__main__":
    main()

