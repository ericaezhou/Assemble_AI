"""
Profile Repository Test

Test file for ProfileRepository query operations.
Tests three main methods:
1. Get all profiles
2. Get profile by ID
3. Get profile by email
"""

from __future__ import annotations

import os
import sys
import time
from typing import List

# Allow script to run directly
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "db")

if SRC not in sys.path:
    sys.path.insert(0, SRC)

from repositories.profile_repository import ProfileRepository
from uuid import UUID


def test_get_all_profiles():
    """
    Test 1: Get all profiles and print them
    """
    print("=" * 80)
    print("Test 1: Get All Profiles")
    print("=" * 80)

    try:
        repo = ProfileRepository()

        # Get first 10 profiles
        profiles = repo.get_all(limit=10)

        print(f"\nFound {len(profiles)} profiles:\n")

        for i, profile in enumerate(profiles, 1):
            print(f"{i}. Profile ID: {profile.id}")
            print(f"   Name: {profile.name}")
            print(f"   Email: {profile.email}")
            print(f"   School: {profile.school}")
            print(f"   Major: {profile.major}")
            print(f"   Created at: {profile.created_at}")
            print("-" * 80)

        # Get total count
        total_count = repo.count()
        print(f"\nTotal profiles in database: {total_count}")

        return True

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False


def test_get_profile_by_id():
    """
    Test 2: Get profile by ID
    """
    print("\n" + "=" * 80)
    print("Test 2: Get Profile by ID")
    print("=" * 80)

    try:
        repo = ProfileRepository()

        # First, get a profile ID from the database
        profiles = repo.get_all(limit=1)

        if not profiles:
            print("\n⚠️  No profiles found in database to test with")
            return False

        test_profile_id = profiles[0].id
        print(f"\nSearching for profile with ID: {test_profile_id}")

        # Get profile by ID
        profile = repo.get_by_id(test_profile_id)

        if profile:
            print("\n✅ Profile found:")
            print(f"   ID: {profile.id}")
            print(f"   Name: {profile.name}")
            print(f"   Email: {profile.email}")
            print(f"   School: {profile.school}")
            print(f"   Major: {profile.major}")
            print(f"   Bio: {profile.bio}")
            print(f"   Research Areas: {profile.research_areas}")
            print(f"   Occupation: {profile.occupation}")
            print(f"   Created at: {profile.created_at}")
            print(f"   Updated at: {profile.updated_at}")
        else:
            print("\n❌ Profile not found")
            return False

        # Test with non-existent ID
        print("\n" + "-" * 80)
        print("Testing with non-existent ID...")
        fake_id = UUID("00000000-0000-0000-0000-000000000000")
        non_existent = repo.get_by_id(fake_id)

        if non_existent is None:
            print("✅ Correctly returned None for non-existent ID")
        else:
            print("❌ Should return None for non-existent ID")

        return True

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False


def test_get_profile_by_email():
    """
    Test 3: Get profile by email
    """
    print("\n" + "=" * 80)
    print("Test 3: Get Profile by Email")
    print("=" * 80)

    try:
        repo = ProfileRepository()

        # First, get an email from the database
        profiles = repo.get_all(limit=5)

        if not profiles:
            print("\n⚠️  No profiles found in database to test with")
            return False

        # Find a profile with an email
        test_email = None
        for p in profiles:
            if p.email:
                test_email = p.email
                break

        if not test_email:
            print("\n⚠️  No profiles with email found to test with")
            return False

        print(f"\nSearching for profile with email: {test_email}")

        # Get profile by email
        profile = repo.get_by_email(test_email)

        if profile:
            print("\n✅ Profile found:")
            print(f"   ID: {profile.id}")
            print(f"   Name: {profile.name}")
            print(f"   Email: {profile.email}")
            print(f"   School: {profile.school}")
            print(f"   Major: {profile.major}")
            print(f"   Research Areas: {profile.research_areas}")
            print(f"   GitHub: {profile.github}")
            print(f"   LinkedIn: {profile.linkedin}")
            print(f"   Created at: {profile.created_at}")
        else:
            print("\n❌ Profile not found")
            return False

        # Test with non-existent email
        print("\n" + "-" * 80)
        print("Testing with non-existent email...")
        non_existent = repo.get_by_email("nonexistent@example.com")

        if non_existent is None:
            print("✅ Correctly returned None for non-existent email")
        else:
            print("❌ Should return None for non-existent email")

        return True

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False


def run_all_tests():
    """
    Run all profile repository tests
    """
    print("\n" + "=" * 80)
    print("PROFILE REPOSITORY TESTS")
    print("=" * 80 + "\n")

    results = {
        "test_get_all_profiles": test_get_all_profiles(),
        "test_get_profile_by_id": test_get_profile_by_id(),
        "test_get_profile_by_email": test_get_profile_by_email(),
    }

    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed = sum(1 for result in results.values() if result)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")

    print("-" * 80)
    print(f"Tests Passed: {passed}/{total}")
    print("=" * 80 + "\n")

    return all(results.values())


if __name__ == "__main__":
    print("\n🚀 Starting Profile Repository Tests...\n")

    try:
        success = run_all_tests()

        if success:
            print("✅ All tests passed successfully!")
            sys.exit(0)
        else:
            print("❌ Some tests failed. Please check the output above.")
            sys.exit(1)

    except Exception as e:
        print(f"\n💥 Fatal error occurred: {str(e)}")
        print("\nPlease make sure:")
        print("1. Your .env file is configured correctly")
        print("2. SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set")
        print("3. Your database has data in the profiles table")
        print("4. All dependencies are installed (pip install -r requirements.txt)")
        sys.exit(1)