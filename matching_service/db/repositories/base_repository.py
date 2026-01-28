"""
Base Repository

Provides common database operations for all repositories.
"""

from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from pydantic import BaseModel
from supabase import Client
from ..db_client import get_supabase_client


T = TypeVar('T', bound=BaseModel)


class BaseRepository(Generic[T]):
    """
    Base repository class with common CRUD operations
    
    All specific repositories should inherit from this class.
    """
    
    def __init__(self, table_name: str, dto_class: Type[T]):
        """
        Initialize base repository
        
        Args:
            table_name: Name of the database table
            dto_class: DTO class for type conversion
        """
        self.table_name = table_name
        self.dto_class = dto_class
        self.client: Client = get_supabase_client()
    
    def _convert_to_dto(self, data: Dict[str, Any]) -> T:
        """
        Convert raw database data to DTO object
        
        Args:
            data: Raw data from database
            
        Returns:
            DTO object
        """
        return self.dto_class(**data)
    
    def _convert_to_dto_list(self, data_list: List[Dict[str, Any]]) -> List[T]:
        """
        Convert list of raw database data to list of DTO objects
        
        Args:
            data_list: List of raw data from database
            
        Returns:
            List of DTO objects
        """
        return [self._convert_to_dto(data) for data in data_list]
    
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[T]:
        """
        Get all records from the table
        
        Args:
            limit: Maximum number of records to return (None for all)
            offset: Number of records to skip
            
        Returns:
            List of DTO objects
            
        Raises:
            Exception: If database query fails
        """
        try:
            query = self.client.table(self.table_name).select("*")
            
            if limit is not None:
                query = query.limit(limit)
            
            if offset > 0:
                query = query.offset(offset)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to get all records from {self.table_name}: {str(e)}")
    
    def get_by_id(self, id_field: str, id_value: Any) -> Optional[T]:
        """
        Get a single record by ID
        
        Args:
            id_field: Name of the ID field (e.g., "id", "user_id")
            id_value: Value of the ID
            
        Returns:
            DTO object if found, None otherwise
            
        Raises:
            Exception: If database query fails
        """
        try:
            response = self.client.table(self.table_name)\
                .select("*")\
                .eq(id_field, str(id_value))\
                .execute()
            
            if response.data and len(response.data) > 0:
                return self._convert_to_dto(response.data[0])
            return None
        
        except Exception as e:
            raise Exception(f"Failed to get record by {id_field} from {self.table_name}: {str(e)}")
    
    def filter(
        self, 
        filters: Dict[str, Any], 
        limit: Optional[int] = None,
        offset: int = 0,
        order_by: Optional[str] = None,
        ascending: bool = True
    ) -> List[T]:
        """
        Filter records by multiple conditions
        
        Args:
            filters: Dictionary of field-value pairs for filtering
            limit: Maximum number of records to return
            offset: Number of records to skip
            order_by: Field name to order by
            ascending: Sort order (True for ascending, False for descending)
            
        Returns:
            List of DTO objects matching the filters
            
        Raises:
            Exception: If database query fails
        """
        try:
            query = self.client.table(self.table_name).select("*")
            
            # Apply filters
            for field, value in filters.items():
                if value is not None:
                    query = query.eq(field, value)
            
            # Apply ordering
            if order_by:
                query = query.order(order_by, desc=not ascending)
            
            # Apply pagination
            if limit is not None:
                query = query.limit(limit)
            
            if offset > 0:
                query = query.offset(offset)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to filter records from {self.table_name}: {str(e)}")
    
    def create(self, data: Dict[str, Any]) -> T:
        """
        Create a new record
        
        Args:
            data: Dictionary of field-value pairs for the new record
            
        Returns:
            Created DTO object
            
        Raises:
            Exception: If database insert fails
        """
        try:
            response = self.client.table(self.table_name)\
                .insert(data)\
                .execute()
            
            if response.data and len(response.data) > 0:
                return self._convert_to_dto(response.data[0])
            
            raise Exception("No data returned after insert")
        
        except Exception as e:
            raise Exception(f"Failed to create record in {self.table_name}: {str(e)}")
    
    def update(self, id_field: str, id_value: Any, data: Dict[str, Any]) -> Optional[T]:
        """
        Update an existing record
        
        Args:
            id_field: Name of the ID field
            id_value: Value of the ID
            data: Dictionary of field-value pairs to update
            
        Returns:
            Updated DTO object if successful, None if record not found
            
        Raises:
            Exception: If database update fails
        """
        try:
            response = self.client.table(self.table_name)\
                .update(data)\
                .eq(id_field, str(id_value))\
                .execute()
            
            if response.data and len(response.data) > 0:
                return self._convert_to_dto(response.data[0])
            return None
        
        except Exception as e:
            raise Exception(f"Failed to update record in {self.table_name}: {str(e)}")
    
    def delete(self, id_field: str, id_value: Any) -> bool:
        """
        Delete a record
        
        Args:
            id_field: Name of the ID field
            id_value: Value of the ID
            
        Returns:
            True if deleted successfully, False otherwise
            
        Raises:
            Exception: If database delete fails
        """
        try:
            response = self.client.table(self.table_name)\
                .delete()\
                .eq(id_field, str(id_value))\
                .execute()
            
            return response.data is not None and len(response.data) > 0
        
        except Exception as e:
            raise Exception(f"Failed to delete record from {self.table_name}: {str(e)}")
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records in the table
        
        Args:
            filters: Optional dictionary of field-value pairs for filtering
            
        Returns:
            Number of records matching the filters
            
        Raises:
            Exception: If database query fails
        """
        try:
            query = self.client.table(self.table_name).select("*", count="exact")
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if value is not None:
                        query = query.eq(field, value)
            
            response = query.execute()
            return response.count if response.count is not None else 0
        
        except Exception as e:
            raise Exception(f"Failed to count records in {self.table_name}: {str(e)}")
