"""
Supabase Client Singleton
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv


class SupabaseClient:
    _instance: Optional[Client] = None
    _initialized: bool = False

    @classmethod
    def get_instance(cls) -> Client:
        if cls._instance is None:
            cls._initialize()
        return cls._instance

    @classmethod
    def _initialize(cls) -> None:
        if cls._initialized:
            return

        load_dotenv()

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

        if not url or not key:
            raise ValueError(
                "Supabase credentials not found. "
                "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )

        cls._instance = create_client(url, key)
        cls._initialized = True

    @classmethod
    def reset(cls) -> None:
        cls._instance = None
        cls._initialized = False


def get_supabase_client() -> Client:
    return SupabaseClient.get_instance()
