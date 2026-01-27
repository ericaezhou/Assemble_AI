"""
Message Repository

Handles all database operations for messages.
"""

from typing import List, Optional
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.message import MessageDTO


class MessageRepository(BaseRepository[MessageDTO]):
    """
    Repository for message-related database operations
    """
    
    def __init__(self):
        """Initialize message repository"""
        super().__init__("messages", MessageDTO)
    
    def get_by_id(self, message_id: int) -> Optional[MessageDTO]:
        """
        Get message by ID
        
        Args:
            message_id: Message ID
            
        Returns:
            MessageDTO if found, None otherwise
        """
        return super().get_by_id("id", message_id)
    
    def get_by_conversation(
        self, 
        conversation_id: int, 
        limit: Optional[int] = None,
        offset: int = 0,
        ascending: bool = True
    ) -> List[MessageDTO]:
        """
        Get all messages in a conversation
        
        Args:
            conversation_id: Conversation ID
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            ascending: Sort order by created_at (True for oldest first, False for newest first)
            
        Returns:
            List of MessageDTO objects
        """
        return self.filter(
            filters={"conversation_id": conversation_id},
            limit=limit,
            offset=offset,
            order_by="created_at",
            ascending=ascending
        )
    
    def get_by_sender(
        self, 
        sender_id: UUID, 
        limit: Optional[int] = None
    ) -> List[MessageDTO]:
        """
        Get all messages sent by a specific user
        
        Args:
            sender_id: Sender user ID
            limit: Maximum number of messages to return
            
        Returns:
            List of MessageDTO objects
        """
        return self.filter(
            filters={"sender_id": sender_id},
            limit=limit,
            order_by="created_at",
            ascending=False
        )
    
    def get_system_messages(
        self, 
        conversation_id: int,
        limit: Optional[int] = None
    ) -> List[MessageDTO]:
        """
        Get all system messages in a conversation
        
        Args:
            conversation_id: Conversation ID
            limit: Maximum number of messages to return
            
        Returns:
            List of MessageDTO objects
        """
        return self.filter(
            filters={
                "conversation_id": conversation_id,
                "is_system_message": True
            },
            limit=limit,
            order_by="created_at",
            ascending=True
        )
    
    def get_latest_message(self, conversation_id: int) -> Optional[MessageDTO]:
        """
        Get the most recent message in a conversation
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            MessageDTO if found, None otherwise
        """
        messages = self.get_by_conversation(
            conversation_id=conversation_id,
            limit=1,
            ascending=False
        )
        return messages[0] if messages else None
    
    def create_message(self, message_data: dict) -> MessageDTO:
        """
        Create a new message
        
        Args:
            message_data: Dictionary containing message fields
            
        Returns:
            Created MessageDTO
        """
        return self.create(message_data)
    
    def delete_message(self, message_id: int) -> bool:
        """
        Delete a message
        
        Args:
            message_id: Message ID
            
        Returns:
            True if deleted successfully, False otherwise
        """
        return super().delete("id", message_id)
    
    def count_messages_in_conversation(self, conversation_id: int) -> int:
        """
        Count total messages in a conversation
        
        Args:
            conversation_id: Conversation ID
            
        Returns:
            Number of messages
        """
        return self.count(filters={"conversation_id": conversation_id})
