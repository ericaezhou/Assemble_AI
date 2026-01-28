"""
Conference Repository

Handles all database operations for conferences/events.
"""

from typing import List, Optional
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.conference import ConferenceDTO


class ConferenceRepository(BaseRepository[ConferenceDTO]):
    """
    Repository for conference-related database operations
    """
    
    def __init__(self):
        """Initialize conference repository"""
        super().__init__("conferences", ConferenceDTO)
    
    def get_by_id(self, conference_id: str) -> Optional[ConferenceDTO]:
        """
        Get conference by ID
        
        Args:
            conference_id: Conference ID
            
        Returns:
            ConferenceDTO if found, None otherwise
        """
        return super().get_by_id("id", conference_id)
    
    def get_by_host(self, host_id: UUID, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Get all conferences hosted by a specific user
        
        Args:
            host_id: Host user ID
            limit: Maximum number of conferences to return
            
        Returns:
            List of ConferenceDTO objects
        """
        return self.filter(
            filters={"host_id": host_id},
            limit=limit,
            order_by="created_at",
            ascending=False
        )
    
    def get_by_location(self, location: str, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Get conferences by location (partial match)
        
        Args:
            location: Location keyword
            limit: Maximum number of results
            
        Returns:
            List of ConferenceDTO objects
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .ilike("location", f"%{location}%")\
                .order("created_at", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to search by location: {str(e)}")
    
    def search_by_name(self, name: str, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Search conferences by name (case-insensitive partial match)
        
        Args:
            name: Conference name to search for
            limit: Maximum number of results
            
        Returns:
            List of ConferenceDTO objects
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .ilike("name", f"%{name}%")\
                .order("created_at", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to search by name: {str(e)}")
    
    def get_upcoming_conferences(self, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Get upcoming conferences (start_date in the future)
        
        Note: This comparison assumes start_date is in ISO format
        
        Args:
            limit: Maximum number of conferences to return
            
        Returns:
            List of ConferenceDTO objects
        """
        try:
            from datetime import datetime
            
            today = datetime.now().strftime("%Y-%m-%d")
            
            query = self.client.table(self.table_name)\
                .select("*")\
                .gte("start_date", today)\
                .order("start_date", desc=False)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to get upcoming conferences: {str(e)}")
    
    def get_past_conferences(self, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Get past conferences (end_date in the past)
        
        Args:
            limit: Maximum number of conferences to return
            
        Returns:
            List of ConferenceDTO objects
        """
        try:
            from datetime import datetime
            
            today = datetime.now().strftime("%Y-%m-%d")
            
            query = self.client.table(self.table_name)\
                .select("*")\
                .lt("end_date", today)\
                .order("end_date", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to get past conferences: {str(e)}")
    
    def get_by_location_type(
        self,
        location_type: str,
        limit: Optional[int] = None
    ) -> List[ConferenceDTO]:
        """
        Get conferences by location type

        Args:
            location_type: Location type (in-person, virtual, hybrid)
            limit: Maximum number of conferences to return

        Returns:
            List of ConferenceDTO objects
        """
        return self.filter(
            filters={"location_type": location_type},
            limit=limit,
            order_by="created_at",
            ascending=False
        )

    def get_free_conferences(self, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Get free conferences

        Args:
            limit: Maximum number of conferences to return

        Returns:
            List of ConferenceDTO objects
        """
        return self.filter(
            filters={"price_type": "free"},
            limit=limit,
            order_by="created_at",
            ascending=False
        )

    def get_by_price_range(
        self,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: Optional[int] = None
    ) -> List[ConferenceDTO]:
        """
        Get conferences within a price range

        Args:
            min_price: Minimum price (inclusive)
            max_price: Maximum price (inclusive)
            limit: Maximum number of conferences to return

        Returns:
            List of ConferenceDTO objects
        """
        try:
            query = self.client.table(self.table_name).select("*")

            if min_price is not None:
                query = query.gte("price_amount", min_price)

            if max_price is not None:
                query = query.lte("price_amount", max_price)

            query = query.order("price_amount", desc=False)

            if limit:
                query = query.limit(limit)

            response = query.execute()
            return self._convert_to_dto_list(response.data)

        except Exception as e:
            raise Exception(f"Failed to get conferences by price range: {str(e)}")

    def get_conferences_with_capacity(
        self,
        min_capacity: Optional[int] = None,
        limit: Optional[int] = None
    ) -> List[ConferenceDTO]:
        """
        Get conferences with available capacity

        Args:
            min_capacity: Minimum capacity threshold
            limit: Maximum number of conferences to return

        Returns:
            List of ConferenceDTO objects
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .not_.is_("capacity", "null")

            if min_capacity is not None:
                query = query.gte("capacity", min_capacity)

            query = query.order("capacity", desc=True)

            if limit:
                query = query.limit(limit)

            response = query.execute()
            return self._convert_to_dto_list(response.data)

        except Exception as e:
            raise Exception(f"Failed to get conferences with capacity: {str(e)}")

    def get_no_approval_required(self, limit: Optional[int] = None) -> List[ConferenceDTO]:
        """
        Get conferences that don't require approval

        Args:
            limit: Maximum number of conferences to return

        Returns:
            List of ConferenceDTO objects
        """
        return self.filter(
            filters={"require_approval": False},
            limit=limit,
            order_by="created_at",
            ascending=False
        )

    def create_conference(self, conference_data: dict) -> ConferenceDTO:
        """
        Create a new conference

        Args:
            conference_data: Dictionary containing conference fields

        Returns:
            Created ConferenceDTO
        """
        return self.create(conference_data)

    def update_conference(self, conference_id: str, updates: dict) -> Optional[ConferenceDTO]:
        """
        Update conference information

        Args:
            conference_id: Conference ID
            updates: Dictionary of fields to update

        Returns:
            Updated ConferenceDTO if successful, None otherwise
        """
        return self.update("id", conference_id, updates)

    def delete_conference(self, conference_id: str) -> bool:
        """
        Delete a conference

        Args:
            conference_id: Conference ID

        Returns:
            True if deleted successfully, False otherwise
        """
        return super().delete("id", conference_id)