"""
Conversation Repository

Handles all database operations for conversations.
"""

from typing import List, Optional
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.conversation import ConversationDTO


class ConversationRepository(BaseRepository[ConversationDTO]):
    """
    Repository for conversation-related database operations
    """
    
    def __init__(self):
        """Initialize conversation repository"""
        super().__init__("conversations", ConversationDTO)
    
    def get_by_id(self, conversation_id: int) -> Optional[ConversationDTO]:
        """
        Get conversation by ID
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            ConversationDTO if found, None otherwise
        """
        return super().get_by_id("id", conversation_id)
    
    def get_by_participants(self, user1_id: UUID, user2_id: UUID) -> Optional[ConversationDTO]:
        """
        Get conversation between two specific users
        
        Note: Checks both participant1_id and participant2_id combinations
        
        Args:
            user1_id: First user's ID
            user2_id: Second user's ID
            
        Returns:
            ConversationDTO if found, None otherwise
        """
        try:
            # Try both combinations since we don't know the order
            response = self.client.table(self.table_name)\
                .select("*")\
                .or_(
                    f"and(participant1_id.eq.{user1_id},participant2_id.eq.{user2_id}),"
                    f"and(participant1_id.eq.{user2_id},participant2_id.eq.{user1_id})"
                )\
                .limit(1)\
                .execute()
            
            if response.data and len(response.data) > 0:
                return self._convert_to_dto(response.data[0])
            return None
        
        except Exception as e:
            raise Exception(f"Failed to get conversation by participants: {str(e)}")
    
    def get_user_conversations(
        self, 
        user_id: UUID,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[ConversationDTO]:
        """
        Get all conversations for a specific user
        
        Args:
            user_id: User's ID
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip
            
        Returns:
            List of ConversationDTO objects, ordered by last_message_at (newest first)
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")\
                .order("last_message_at", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            if offset > 0:
                query = query.offset(offset)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to get user conversations: {str(e)}")
    
    def get_active_conversations(
        self, 
        user_id: UUID,
        limit: Optional[int] = None
    ) -> List[ConversationDTO]:
        """
        Get active conversations for a user (those with recent messages)
        
        Args:
            user_id: User's ID
            limit: Maximum number of conversations to return
            
        Returns:
            List of ConversationDTO objects with recent activity
        """
        try:
            query = self.client.table(self.table_name)\
                .select("*")\
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")\
                .not_.is_("last_message_at", "null")\
                .order("last_message_at", desc=True)
            
            if limit:
                query = query.limit(limit)
            
            response = query.execute()
            return self._convert_to_dto_list(response.data)
        
        except Exception as e:
            raise Exception(f"Failed to get active conversations: {str(e)}")
    
    def create_conversation(self, participant1_id: UUID, participant2_id: UUID) -> ConversationDTO:
        """
        Create a new conversation between two users
        
        Args:
            participant1_id: First participant's ID
            participant2_id: Second participant's ID
            
        Returns:
            Created ConversationDTO
        """
        conversation_data = {
            "participant1_id": str(participant1_id),
            "participant2_id": str(participant2_id)
        }
        return self.create(conversation_data)
    
    def update_last_message_time(self, conversation_id: int) -> Optional[ConversationDTO]:
        """
        Update the last_message_at timestamp to current time
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            Updated ConversationDTO if successful, None otherwise
        """
        from datetime import datetime
        
        return self.update(
            "id", 
            conversation_id, 
            {"last_message_at": datetime.now().isoformat()}
        )
    
    def delete_conversation(self, conversation_id: int) -> bool:
        """
        Delete a conversation
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            True if deleted successfully, False otherwise
        """
        return super().delete("id", conversation_id)
    
    def count_user_conversations(self, user_id: UUID) -> int:
        """
        Count total conversations for a user
        
        Args:
            user_id: User's ID
            
        Returns:
            Number of conversations
        """
        try:
            response = self.client.table(self.table_name)\
                .select("*", count="exact")\
                .or_(f"participant1_id.eq.{user_id},participant2_id.eq.{user_id}")\
                .execute()
            
            return response.count if response.count is not None else 0
        
        except Exception as e:
            raise Exception(f"Failed to count user conversations: {str(e)}")
