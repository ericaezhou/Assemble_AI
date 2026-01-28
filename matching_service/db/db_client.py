"""
Supabase Client Singleton

Provides a single global instance of Supabase client for database operations.
"""

import os
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

        # Load environment variables from .env file
        load_dotenv()

        # Get Supabase credentials from environment
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_PUBLISHABLE_KEY") or os.environ.get("SUPABASE_KEY")

        if not url or not key:
            raise ValueError(
                "Supabase credentials not found. "
                "Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY environment variables."
            )

        # Create Supabase client
        cls._instance = create_client(url, key)
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