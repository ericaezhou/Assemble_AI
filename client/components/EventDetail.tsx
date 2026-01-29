'use client';

import { useState, useEffect } from 'react';
import ResearcherRecommendations from './ResearcherRecommendations';
import { authenticatedFetch } from '@/utils/auth';

interface Event {
  id: string;
  name: string;
  location: string;
  location_type?: string;
  virtual_link?: string;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  host_id: string;
  price_type?: string;
  capacity?: number;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  occupation?: string;
  school?: string;
  major?: string;
  year?: string;
  company?: string;
  title?: string;
  work_experience_years?: string;
  degree?: string;
  research_area?: string;
  other_description?: string;
  interest_areas?: string[];
  current_skills?: string[];
  hobbies?: string[];
  github?: string;
  linkedin?: string;
  similarity_score?: number;
}

interface EventDetailProps {
  eventId: string;
  userId: string;
  onBack: () => void;
}

type SortField = 'name' | 'institution' | 'research_areas' | 'interests';
type SortOrder = 'asc' | 'desc';

export default function EventDetail({ eventId, userId, onBack }: EventDetailProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    fetchEventDetails();
    fetchParticipants();
  }, [eventId]);

  useEffect(() => {
    filterAndSortParticipants();
  }, [searchQuery, participants, sortField, sortOrder]);

  const fetchEventDetails = async () => {
    try {
      const response = await authenticatedFetch(`/api/conferences/${eventId}`);
      const data = await response.json();
      setEvent(data);
    } catch (err) {
      console.error('Error fetching event:', err);
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/conferences/${eventId}/participants?current_user_id=${userId}`
      );
      const data = await response.json();
      setParticipants(data);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get institution (school or company based on occupation)
  const getInstitution = (p: Participant) => p.school || p.company || '';

  // Helper to get interests as a string for searching/sorting
  const getInterests = (p: Participant) => p.interest_areas?.join(', ') || '';

  const filterAndSortParticipants = () => {
    let filtered = participants;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = participants.filter(p =>
        p.name.toLowerCase().includes(query) ||
        getInstitution(p).toLowerCase().includes(query) ||
        p.research_area?.toLowerCase().includes(query) ||
        getInterests(p).toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      if (sortField === 'institution') {
        aValue = getInstitution(a).toLowerCase();
        bValue = getInstitution(b).toLowerCase();
      } else if (sortField === 'interests') {
        aValue = getInterests(a).toLowerCase();
        bValue = getInterests(b).toLowerCase();
      } else if (sortField === 'research_areas') {
        aValue = (a.research_area || '').toLowerCase();
        bValue = (b.research_area || '').toLowerCase();
      } else {
        aValue = (a[sortField] || '').toLowerCase();
        bValue = (b[sortField] || '').toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredParticipants(sorted);
  };

  const formatDate = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (timeString) {
      return `${formatted} at ${timeString}`;
    }
    return formatted;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getLocationDisplay = () => {
    if (!event) return '';
    if (event.location_type === 'virtual') {
      return 'Virtual Event';
    }
    if (event.location_type === 'hybrid') {
      return `${event.location} + Virtual`;
    }
    return event.location || 'Location TBD';
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading event details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-5 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Events
          </button>

          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              {event.location_type === 'virtual' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span>{getLocationDisplay()}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {formatDate(event.start_date, event.start_time)}
                {event.end_date && event.end_date !== event.start_date && (
                  <> - {formatDate(event.end_date, event.end_time)}</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{participants.length} Attendees</span>
            </div>
            {event.price_type === 'free' && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                Free
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-5 md:p-10 space-y-8">
        <ResearcherRecommendations
          researchers={participants}
          currentUserId={userId}
          title="Recommended to Meet"
        />

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-5">All Attendees</h2>

          <div className="mb-5">
            <input
              type="text"
              placeholder="Search by name, school, research areas, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {loading ? (
            <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
              Loading attendees...
            </p>
          ) : filteredParticipants.length === 0 ? (
            <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
              {searchQuery ? 'No attendees found matching your search.' : 'No attendees yet.'}
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        onClick={() => handleSort('name')}
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortField === 'name' && (
                            <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('institution')}
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          School
                          {sortField === 'institution' && (
                            <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('research_areas')}
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Research Areas
                          {sortField === 'research_areas' && (
                            <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('interests')}
                        className="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          Research Interests
                          {sortField === 'interests' && (
                            <svg className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    {filteredParticipants.map((participant, index) => (
                      <tr
                        key={participant.id}
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {participant.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {getInstitution(participant) || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {participant.research_area ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                {participant.research_area}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not specified</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {participant.interest_areas && participant.interest_areas.length > 0 ? (
                              participant.interest_areas.map((interest: string, i: number) => (
                                <span key={i} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                                  {interest}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">Not specified</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {filteredParticipants.length} attendee{filteredParticipants.length !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
