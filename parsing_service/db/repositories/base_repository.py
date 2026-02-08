"""
Base Repository
"""

from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from pydantic import BaseModel
from supabase import Client
from ..db_client import get_supabase_client


T = TypeVar('T', bound=BaseModel)


class BaseRepository(Generic[T]):
    def __init__(self, table_name: str, dto_class: Type[T]):
        self.table_name = table_name
        self.dto_class = dto_class
        self.client: Client = get_supabase_client()

    def _convert_to_dto(self, data: Dict[str, Any]) -> T:
        return self.dto_class(**data)

    def _convert_to_dto_list(self, data_list: List[Dict[str, Any]]) -> List[T]:
        return [self._convert_to_dto(data) for data in data_list]

    def get_by_id(self, id_field: str, id_value: Any) -> Optional[T]:
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

    def filter(self, filters: Dict[str, Any], limit: Optional[int] = None) -> List[T]:
        try:
            query = self.client.table(self.table_name).select("*")
            for field, value in filters.items():
                if value is not None:
                    query = query.eq(field, value)
            if limit is not None:
                query = query.limit(limit)
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        except Exception as e:
            raise Exception(f"Failed to filter records from {self.table_name}: {str(e)}")

    def create(self, data: Dict[str, Any]) -> T:
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
