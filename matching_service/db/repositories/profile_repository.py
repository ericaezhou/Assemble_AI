"""
Profile Repository

Handles all database operations for user profiles.
"""

from typing import List, Optional
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.profile import ProfileDTO


class ProfileRepository(BaseRepository[ProfileDTO]):
    """
    Repository for profile-related database operations
    """
    
    def __init__(self):
        """Initialize profile repository"""
        super().__init__("profiles", ProfileDTO)
    
    def get_by_id(self, profile_id: UUID) -> Optional[ProfileDTO]:
        """
        Get profile by ID
        
        Args:
            profile_id: User profile UUID
            
        Returns:
            ProfileDTO if found, None otherwise
        """
        return super().get_by_id("id", profile_id)
    
    def get_by_email(self, email: str) -> Optional[ProfileDTO]:
        """
        Get profile by email address
        
        Args:
            email: User's email address
            
        Returns:
            ProfileDTO if found, None otherwise
        """
        profiles = self.filter({"email": email}, limit=1)
        return profiles[0] if profiles else None
    
    def get_by_school(self, school: str, limit: Optional[int] = None) -> List[ProfileDTO]:
        """
        Get all profiles from a specific school
        
        Args:
            school: School name
            limit: Maximum number of results
            
        Returns:
            List of ProfileDTO objects
        """
        return self.filter({"school": school}, limit=limit)
    
    def get_by_research_area(self, research_area: str, limit: Optional[int] = None) -> List[ProfileDTO]:
        """
        Get profiles by research area (partial match)
        
        Note: This uses exact match. For fuzzy search, use custom query.
        
        Args:
            research_area: Research area keyword
            limit: Maximum number of results
            
        Returns:
            List of ProfileDTO objects
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .ilike("research_areas", f"%{research_area}%")
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to search by research area: {str(e)}")
    
    def search_by_name(self, name: str, limit: Optional[int] = None) -> List[ProfileDTO]:
        """
        Search profiles by name (case-insensitive partial match)
        
        Args:
            name: Name to search for
            limit: Maximum number of results
            
        Returns:
            List of ProfileDTO objects
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .ilike("name", f"%{name}%")
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to search by name: {str(e)}")
    
    def update_profile(self, profile_id: UUID, updates: dict) -> Optional[ProfileDTO]:
        """
        Update profile information
        
        Args:
            profile_id: User profile UUID
            updates: Dictionary of fields to update
            
        Returns:
            Updated ProfileDTO if successful, None otherwise
        """
        return super().update("id", profile_id, updates)
    
    def delete_profile(self, profile_id: UUID) -> bool:
        """
        Delete a profile
        
        Args:
            profile_id: User profile UUID
            
        Returns:
            True if deleted successfully, False otherwise
        """
        return super().delete("id", profile_id)
