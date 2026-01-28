"""
Conference Participant Repository

Handles all database operations for conference participants (many-to-many relationship).
"""

from typing import List, Optional
from uuid import UUID
from .base_repository import BaseRepository
from ..pojo.conference_participant import ConferenceParticipantDTO


class ConferenceParticipantRepository(BaseRepository[ConferenceParticipantDTO]):
    """
    Repository for conference participant-related database operations
    
    Note: This table uses a composite key (researcher_id, conference_id)
    """
    
    def __init__(self):
        """Initialize conference participant repository"""
        super().__init__("conference_participants", ConferenceParticipantDTO)
    
    def get_by_composite_key(
        self, 
        researcher_id: UUID, 
        conference_id: str
    ) -> Optional[ConferenceParticipantDTO]:
        """
        Get participant record by composite key
        
        Args:
            researcher_id: Researcher user ID
            conference_id: Conference ID
            
        Returns:
            ConferenceParticipantDTO if found, None otherwise
        """
        participants = self.filter({
            "researcher_id": researcher_id,
            "conference_id": conference_id
        }, limit=1)
        return participants[0] if participants else None
    
    def get_conference_participants(
        self, 
        conference_id: str,
        limit: Optional[int] = None
    ) -> List[ConferenceParticipantDTO]:
        """
        Get all participants for a specific conference
        
        Args:
            conference_id: Conference ID
            limit: Maximum number of participants to return
            
        Returns:
            List of ConferenceParticipantDTO objects
        """
        return self.filter(
            filters={"conference_id": conference_id},
            limit=limit,
            order_by="joined_at",
            ascending=True
        )
    
    def get_researcher_conferences(
        self, 
        researcher_id: UUID,
        limit: Optional[int] = None
    ) -> List[ConferenceParticipantDTO]:
        """
        Get all conferences a researcher is participating in
        
        Args:
            researcher_id: Researcher user ID
            limit: Maximum number of conferences to return
            
        Returns:
            List of ConferenceParticipantDTO objects
        """
        return self.filter(
            filters={"researcher_id": researcher_id},
            limit=limit,
            order_by="joined_at",
            ascending=False
        )
    
    def is_participant(self, researcher_id: UUID, conference_id: str) -> bool:
        """
        Check if a researcher is participating in a conference
        
        Args:
            researcher_id: Researcher user ID
            conference_id: Conference ID
            
        Returns:
            True if researcher is a participant, False otherwise
        """
        participant = self.get_by_composite_key(researcher_id, conference_id)
        return participant is not None
    
    def add_participant(
        self, 
        researcher_id: UUID, 
        conference_id: str
    ) -> ConferenceParticipantDTO:
        """
        Add a researcher as a participant to a conference
        
        Args:
            researcher_id: Researcher user ID
            conference_id: Conference ID
            
        Returns:
            Created ConferenceParticipantDTO
            
        Raises:
            Exception: If participant already exists or creation fails
        """
        # Check if already exists
        if self.is_participant(researcher_id, conference_id):
            raise Exception(
                f"Researcher {researcher_id} is already a participant in conference {conference_id}"
            )
        
        participant_data = {
            "researcher_id": str(researcher_id),
            "conference_id": conference_id
        }
        return self.create(participant_data)
    
    def remove_participant(self, researcher_id: UUID, conference_id: str) -> bool:
        """
        Remove a researcher from a conference
        
        Args:
            researcher_id: Researcher user ID
            conference_id: Conference ID
            
        Returns:
            True if removed successfully, False otherwise
        """
        try:
            response = self.client.table(self.table_name)\
                .delete()\
                .eq("researcher_id", str(researcher_id))\
                .eq("conference_id", conference_id)\
                .execute()
            
            return response.data is not None and len(response.data) > 0
        
        except Exception as e:
            raise Exception(f"Failed to remove participant: {str(e)}")
    
    def count_conference_participants(self, conference_id: str) -> int:
        """
        Count total participants in a conference
        
        Args:
            conference_id: Conference ID
            
        Returns:
            Number of participants
        """
        return self.count(filters={"conference_id": conference_id})
    
    def count_researcher_conferences(self, researcher_id: UUID) -> int:
        """
        Count total conferences a researcher is participating in
        
        Args:
            researcher_id: Researcher user ID
            
        Returns:
            Number of conferences
        """
        return self.count(filters={"researcher_id": researcher_id})
    
    def get_common_participants(
        self, 
        conference_id1: str, 
        conference_id2: str
    ) -> List[UUID]:
        """
        Get researchers who are participants in both conferences
        
        Args:
            conference_id1: First conference ID
            conference_id2: Second conference ID
            
        Returns:
            List of researcher UUIDs
        """
        try:
            # Get participants from both conferences
            participants1 = self.get_conference_participants(conference_id1)
            participants2 = self.get_conference_participants(conference_id2)
            
            # Find common researcher IDs
            ids1 = {p.researcher_id for p in participants1}
            ids2 = {p.researcher_id for p in participants2}
            
            common_ids = ids1.intersection(ids2)
            return list(common_ids)
        
        except Exception as e:
            raise Exception(f"Failed to get common participants: {str(e)}")
