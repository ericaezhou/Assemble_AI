'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/utils/auth';
import { Participant, getInstitution, getInterestsString } from '@/types/profile';

interface Event {
  id: string;
  name: string;
  description?: string;
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

interface EventDetailProps {
  eventId: string;
  userId: string;
  onBack: () => void;
  onConnect?: (researcherId: string, eventName?: string) => void;
}

type ActiveTab = 'description' | 'participants';

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-cyan-400 to-blue-500',
    'from-violet-400 to-fuchsia-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function EventDetail({ eventId, userId, onConnect }: EventDetailProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('description');

  useEffect(() => {
    fetchEventDetails();
    fetchParticipants();
  }, [eventId]);

  useEffect(() => {
    filterParticipants();
  }, [searchQuery, participants]);

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

  // Filter participants by search query; sort alphabetically by name
  const filterParticipants = () => {
    let filtered = participants;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = participants.filter(p =>
        p.name.toLowerCase().includes(query) ||
        getInstitution(p).toLowerCase().includes(query) ||
        p.research_area?.toLowerCase().includes(query) ||
        getInterestsString(p).toLowerCase().includes(query)
      );
    }
    setFilteredParticipants([...filtered].sort((a, b) =>
      (a.name || '').toLowerCase() < (b.name || '').toLowerCase() ? -1 : 1
    ));
  };

  const formatDate = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    return timeString ? `${formatted} · ${timeString}` : formatted;
  };

  const getLocationDisplay = () => {
    if (!event) return '';
    if (event.location_type === 'virtual') return 'Virtual Event';
    if (event.location_type === 'hybrid') return `${event.location} + Virtual`;
    return event.location || 'Location TBD';
  };

  // Top 3 recommended (sorted by similarity_score, excluding self)
  const topRecommended = [...participants]
    .filter(p => p.id !== userId && typeof p.similarity_score === 'number')
    .sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0))
    .slice(0, 3);

  if (!event) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading event details...</p>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(event.start_date) > new Date();
  const isFree = event.price_type === 'free';

  return (
    <div className="bg-[#f3f2ef] min-h-full">
      {/* Gradient Hero */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 px-6 pt-8 pb-10 text-white relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-white/5 rounded-full translate-y-16 pointer-events-none" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {isFree && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                Free
              </span>
            )}
            {isUpcoming && (
              <span className="bg-green-400/30 backdrop-blur-sm text-green-100 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block animate-pulse" />
                Upcoming
              </span>
            )}
            {event.location_type === 'virtual' && (
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                Virtual
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-4 leading-tight">{event.name}</h1>

          <div className="flex flex-wrap gap-5 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.start_date, event.start_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              {event.location_type === 'virtual' ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <span>{getLocationDisplay()}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{participants.length} {participants.length === 1 ? 'attendee' : 'attendees'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab card sits cleanly below the hero */}
      <div className="px-5 pt-5 pb-8">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-2">
            {[
              { key: 'description', label: 'Description' },
              { key: 'participants', label: `Participants (${participants.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ActiveTab)}
                className={`px-5 py-4 text-sm font-semibold relative transition-colors ${
                  activeTab === tab.key
                    ? 'text-indigo-600'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* ── Description Tab ── */}
          {activeTab === 'description' && (
            <div className="p-6 space-y-6">
              {/* About */}
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">About the Event</h2>
                {event.description ? (
                  <p className="text-gray-700 leading-relaxed">{event.description}</p>
                ) : (
                  <p className="text-gray-400 italic text-sm">No description provided.</p>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date & Time</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(event.start_date, event.start_time)}</p>
                  {event.end_date && event.end_date !== event.start_date && (
                    <p className="text-xs text-gray-500 mt-1">Until {formatDate(event.end_date, event.end_time)}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Location</p>
                  <p className="text-sm font-medium text-gray-800">{getLocationDisplay()}</p>
                  {event.location_type === 'virtual' && event.virtual_link && (
                    <a
                      href={event.virtual_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                    >
                      Join link →
                    </a>
                  )}
                </div>
                {event.capacity && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Capacity</p>
                    <p className="text-sm font-medium text-gray-800">{event.capacity} people</p>
                    <p className="text-xs text-gray-500 mt-1">{participants.length} registered</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admission</p>
                  <p className="text-sm font-medium text-gray-800">{isFree ? 'Free' : 'Paid'}</p>
                </div>
              </div>

              {/* Announcements placeholder */}
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Announcements</h2>
                <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center">
                  <span className="text-2xl">📢</span>
                  <p className="text-gray-400 text-sm mt-2">No announcements yet</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Participants Tab ── */}
          {activeTab === 'participants' && (
            <div className="p-6 space-y-8">
              {/* Top recommendations (horizontal) */}
              {topRecommended.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">People to Meet</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {topRecommended.map(person => {
                      const matchPercent = typeof person.similarity_score === 'number' && person.similarity_score > 0
                        ? Math.round(person.similarity_score * 100)
                        : null;
                      return (
                        <div
                          key={person.id}
                          className="bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 flex flex-col items-center text-center gap-2"
                        >
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(person.name)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                            {getInitials(person.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{person.name}</p>
                            {getInstitution(person) && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[120px]">{getInstitution(person)}</p>
                            )}
                          </div>
                          {matchPercent !== null && (
                            <span className="text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-full">
                              {matchPercent}% match
                            </span>
                          )}
                          {onConnect && (
                            <button
                              onClick={() => onConnect(person.id, event?.name)}
                              className="w-full mt-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All attendees */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    All Attendees
                  </h2>
                  <span className="text-xs text-gray-400">{filteredParticipants.length} shown</span>
                </div>

                <input
                  type="text"
                  placeholder="Search by name, school, research areas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 mb-4 border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-indigo-400 focus:outline-none transition-colors"
                />

                {loading ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Loading attendees...</div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {searchQuery ? 'No attendees matching your search.' : 'No attendees yet.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {filteredParticipants.map(participant => {
                      const isMe = participant.id === userId;
                      return (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(participant.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                            {getInitials(participant.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{participant.name}</span>
                              {isMe && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">You</span>}
                            </div>
                            {getInstitution(participant) && (
                              <p className="text-xs text-gray-500 truncate">{getInstitution(participant)}</p>
                            )}
                            {participant.research_area && (
                              <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded mt-1">
                                {participant.research_area}
                              </span>
                            )}
                          </div>
                          {onConnect && !isMe && (
                            <button
                              onClick={() => onConnect(participant.id, event?.name)}
                              className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
