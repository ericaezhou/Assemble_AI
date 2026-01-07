'use client';

import { useState, useEffect } from 'react';
import ResearcherRecommendations from './ResearcherRecommendations';
import { authenticatedFetch } from '@/utils/auth';

interface Conference {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  host_id: number;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  institution: string;
  research_areas: string;
  bio: string;
  interests: string;
  similarity_score?: number;
}

interface ConferenceDetailProps {
  conferenceId: string;
  userId: number;
  onBack: () => void;
}

type SortField = 'name' | 'institution' | 'research_areas' | 'interests';
type SortOrder = 'asc' | 'desc';

export default function ConferenceDetail({ conferenceId, userId, onBack }: ConferenceDetailProps) {
  const [conference, setConference] = useState<Conference | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    fetchConferenceDetails();
    fetchParticipants();
  }, [conferenceId]);

  useEffect(() => {
    filterAndSortParticipants();
  }, [searchQuery, participants, sortField, sortOrder]);

  const fetchConferenceDetails = async () => {
    try {
      const response = await authenticatedFetch(`/api/conferences/${conferenceId}`);
      const data = await response.json();
      setConference(data);
    } catch (err) {
      console.error('Error fetching conference:', err);
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `/api/conferences/${conferenceId}/participants?current_user_id=${userId}`
      );
      const data = await response.json();
      setParticipants(data);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortParticipants = () => {
    let filtered = participants;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = participants.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.institution?.toLowerCase().includes(query) ||
        p.research_areas?.toLowerCase().includes(query) ||
        p.interests?.toLowerCase().includes(query)
      );
    }

    // Sort by selected field
    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredParticipants(sorted);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (!conference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading conference details...</p>
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
            Back to Conferences
          </button>

          <h1 className="text-3xl font-bold mb-2">{conference.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{conference.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(conference.start_date)} - {formatDate(conference.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{participants.length} Participants</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-5 md:p-10 space-y-8">
        {/* Recommended Participants Section */}
        <ResearcherRecommendations
          researchers={participants}
          currentUserId={userId}
          title="Recommended to Meet"
        />

        {/* All Participants Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-5">All Participants</h2>

          {/* Search Bar */}
          <div className="mb-5">
            <input
              type="text"
              placeholder="Search by name, school, research areas, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {loading ? (
            <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
              Loading participants...
            </p>
          ) : filteredParticipants.length === 0 ? (
            <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
              {searchQuery ? 'No participants found matching your search.' : 'No participants yet.'}
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Table Header */}
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

              {/* Scrollable Table Body */}
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
                          {participant.institution || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {participant.research_areas ? (
                              participant.research_areas.split(',').map((area, i) => (
                                <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                  {area.trim()}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">Not specified</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {participant.interests ? (
                              participant.interests.split(',').map((interest, i) => (
                                <span key={i} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                                  {interest.trim()}
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

              {/* Table Footer with Count */}
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {filteredParticipants.length} participant{filteredParticipants.length !== 1 ? 's' : ''}
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
