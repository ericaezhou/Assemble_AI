"""
Supabase Client Singleton

Provides a single global instance of Supabase client for database operations.
"""

import os
import json
import base64
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv


class SupabaseClient:
    """
    Singleton class for Supabase client management

    Ensures only one Supabase client instance exists throughout the application lifecycle.
    """

    _instance: Optional[Client] = None
    _initialized: bool = False
    _key: Optional[str] = None

    @classmethod
    def get_instance(cls) -> Client:
        """
        Get the Supabase client singleton instance

        Returns:
            Client: Supabase client instance

        Raises:
            ValueError: If SUPABASE_URL or SUPABASE_KEY environment variables are not set
        """
        if cls._instance is None:
            cls._initialize()
        return cls._instance

    @classmethod
    def _initialize(cls) -> None:
        """
        Initialize the Supabase client

        Loads environment variables and creates the client instance.
        """
        if cls._initialized:
            return

        # Load environment variables from matching_service/.env
        service_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        load_dotenv(dotenv_path=os.path.join(service_root, ".env"))

        # Get Supabase credentials from environment
        url = os.environ.get("SUPABASE_URL")
        # Backend tasks should prefer service role key to bypass RLS safely.
        key = (
            os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            or os.environ.get("SUPABASE_KEY")
            or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
        )

        if not url or not key:
            raise ValueError(
                "Supabase credentials not found. "
                "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred) "
                "or SUPABASE_KEY/SUPABASE_PUBLISHABLE_KEY."
            )

        # Log which key role is being used (decode JWT payload without exposing key)
        try:
            payload = key.split(".")[1]
            payload += "=" * (4 - len(payload) % 4)  # pad base64
            claims = json.loads(base64.b64decode(payload))
            print(f"[supabase-client] Initialized with role: {claims.get('role', 'UNKNOWN')}")
        except Exception:
            print("[supabase-client] Could not decode key role")

        # Create Supabase client
        cls._instance = create_client(url, key)
        cls._key = key

        # Explicitly set the auth token on the PostgREST client to ensure
        # the service role key is used for all database operations (bypasses RLS).
        cls._instance.postgrest.auth(key)

        cls._initialized = True

    @classmethod
    def reset(cls) -> None:
        """
        Reset the singleton instance (mainly for testing purposes)
        """
        cls._instance = None
        cls._initialized = False


def get_supabase_client() -> Client:
    """
    Convenience function to get Supabase client instance

    Returns:
        Client: Supabase client instance
    """
    return SupabaseClient.get_instance()