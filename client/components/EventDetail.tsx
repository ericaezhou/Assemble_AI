'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/utils/auth';
import { Participant, getInstitution, getInterestsString } from '@/types/profile';
import { getInitialsFromName } from '@/utils/name';
import ApplicantReviewer from './ApplicantReviewer';

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
  cover_photo_url?: string;
  price_type?: string;
  capacity?: number;
  require_approval?: boolean;
}

interface EventDetailProps {
  eventId: string;
  userId: string;
  onBack: () => void;
  onConnect?: (researcherId: string, eventName?: string) => void;
}

type ActiveTab = 'description' | 'announcement' | 'participants' | 'review';

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
  const [eventRecommendations, setEventRecommendations] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('description');
  const [wrappedTarget, setWrappedTarget] = useState<Participant | null>(null);
  const [wrappedPage, setWrappedPage] = useState(0);
  const [wrappedReasonByUserId, setWrappedReasonByUserId] = useState<Record<string, string>>({});
  const [wrappedReasonLoading, setWrappedReasonLoading] = useState(false);

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
      fetchEventRecommendations(Array.isArray(data) ? data.length : 3);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventRecommendations = async (participantCountHint?: number) => {
    try {
      const participantCount = Math.max(3, participantCountHint || participants.length || 3);
      const topK = Math.min(50, participantCount);
      const response = await authenticatedFetch(
        `/api/researchers/${userId}/recommendations/event/${eventId}?top_k=${topK}&min_score=0&apply_mmr=true&mmr_lambda=0.5`
      );
      const data = await response.json();
      setEventRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching event recommendations:', err);
      setEventRecommendations([]);
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

  const formatDateBlock = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00');
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate(),
      full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    };
  };

  const getLocationDisplay = () => {
    if (!event) return '';
    if (event.location_type === 'virtual') return 'Virtual Event';
    if (event.location_type === 'hybrid') return `${event.location} + Virtual`;
    return event.location || 'Location TBD';
  };

  const currentUser = participants.find(p => p.id === userId) || null;
  const recMap = new Map(eventRecommendations.map(p => [p.id, p]));

  const getCommonPoints = (other: Participant): string[] => {
    if (!currentUser) return [];
    const points: string[] = [];

    const myInstitution = getInstitution(currentUser).trim().toLowerCase();
    const otherInstitution = getInstitution(other).trim().toLowerCase();
    if (myInstitution && otherInstitution && myInstitution === otherInstitution) {
      points.push(`Both are connected to ${getInstitution(other)}`);
    }

    const myResearch = (currentUser.research_area || '').trim().toLowerCase();
    const otherResearch = (other.research_area || '').trim().toLowerCase();
    if (myResearch && otherResearch && (
      myResearch === otherResearch ||
      myResearch.includes(otherResearch) ||
      otherResearch.includes(myResearch)
    )) {
      points.push(`Shared research focus around ${other.research_area}`);
    }

    const myInterests = new Set((currentUser.interest_areas || []).map(x => x.trim().toLowerCase()).filter(Boolean));
    const otherInterests = (other.interest_areas || []).map(x => x.trim().toLowerCase()).filter(Boolean);
    const commonInterests = otherInterests.filter(x => myInterests.has(x)).slice(0, 3);
    commonInterests.forEach(x => points.push(`Common interest: ${x}`));

    const mySkills = new Set((currentUser.current_skills || []).map(x => x.trim().toLowerCase()).filter(Boolean));
    const otherSkills = (other.current_skills || []).map(x => x.trim().toLowerCase()).filter(Boolean);
    const commonSkills = otherSkills.filter(x => mySkills.has(x)).slice(0, 2);
    commonSkills.forEach(x => points.push(`Both work with ${x}`));

    return points.slice(0, 4);
  };

  const getIceBreakers = (other: Participant, commonPoints: string[]): string[] => {
    const cues: string[] = [];
    if (commonPoints.length > 0) {
      cues.push(`“I saw we both care about ${commonPoints[0].replace(/^Common interest:\s*/i, '').replace(/^Shared research focus around\s*/i, '')}. What are you building in that area?”`);
    }
    if (other.research_area) {
      cues.push(`“What made you focus on ${other.research_area} recently?”`);
    }
    const otherInterests = (other.interest_areas || []).slice(0, 1);
    if (otherInterests.length > 0) {
      cues.push(`“How did you get interested in ${otherInterests[0]}?”`);
    }
    if (cues.length === 0) {
      cues.push('“What are you most excited to learn from people at this event?”');
    }
    return cues.slice(0, 3);
  };

  const openWrapped = async (person: Participant) => {
    setWrappedTarget(person);
    setWrappedPage(0);
    if (wrappedReasonByUserId[person.id]) return;

    setWrappedReasonLoading(true);
    try {
      const rec = recMap.get(person.id);
      const response = await authenticatedFetch(
        `/api/researchers/${userId}/recommendations/${person.id}/why-match`,
        {
          method: 'POST',
          body: JSON.stringify({
            score: rec?.similarity_score ?? person.similarity_score,
            exp_similarity: rec?.exp_similarity,
            interest_similarity: rec?.interest_similarity,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      const reason = typeof data?.reason === 'string' && data.reason.trim()
        ? data.reason.trim()
        : 'You seem to have a meaningful overlap worth chatting about.';
      setWrappedReasonByUserId(prev => ({ ...prev, [person.id]: reason }));
    } catch (err) {
      console.error('Error generating wrapped reason:', err);
      setWrappedReasonByUserId(prev => ({
        ...prev,
        [person.id]: 'You seem to have a meaningful overlap worth chatting about.',
      }));
    } finally {
      setWrappedReasonLoading(false);
    }
  };

  const closeWrapped = () => {
    setWrappedTarget(null);
    setWrappedPage(0);
  };

  // Top 3 recommended (sorted by similarity_score, excluding self)
  const topRecommended = [...eventRecommendations]
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
  const isAttending = !loading && participants.some(p => p.id === userId);
  const isHost = event.host_id === userId;
  const dateBlock = formatDateBlock(event.start_date);

  return (
    <div className="bg-[#f3f2ef] min-h-full px-5 pt-5 pb-8">
      <div className="space-y-4">
          {/* Header card */}
          <div className="bg-white rounded-2xl shadow-md px-6 py-6">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                isAttending
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isAttending ? (
                  <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>You&apos;re In</>
                ) : 'Pending'}
              </span>
              {isUpcoming && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-pulse" />
                  Upcoming
                </span>
              )}
              {event.location_type === 'virtual' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                  Virtual
                </span>
              )}
            </div>

            {/* Event name */}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-6">{event.name}</h1>

            {/* Date row — Luma calendar block style */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-11 rounded-lg overflow-hidden border border-gray-200 text-center shadow-sm">
                <div className="bg-rose-500 text-white text-[10px] font-bold py-0.5 uppercase tracking-wide">{dateBlock.month}</div>
                <div className="bg-white text-gray-900 font-bold text-lg leading-tight py-0.5">{dateBlock.day}</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{dateBlock.full}</p>
                <p className="text-sm text-gray-500">
                  {event.start_time}
                  {event.end_time ? ` – ${event.end_time}` : ''}
                </p>
              </div>
            </div>

            {/* Location row */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                {event.location_type === 'virtual' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{getLocationDisplay()}</p>
                {event.location_type === 'virtual' && event.virtual_link && (
                  <a href={event.virtual_link} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline">
                    Join link →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Tab card */}
          <div>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-2 overflow-x-auto">
            {[
              { key: 'description', label: 'About' },
              { key: 'announcement', label: 'Announcement' },
              { key: 'participants', label: `Participants (${participants.length})` },
              ...(isHost && event.require_approval ? [{
                key: 'review',
                label: 'Review Applicants'
              }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ActiveTab)}
                className={`px-5 py-4 text-sm font-semibold relative transition-colors whitespace-nowrap ${
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
                <h2 className="text-sm font-semibold text-gray-400 tracking-wider mb-3">About the Event</h2>
                {event.description ? (
                  <p className="text-gray-700 leading-relaxed">{event.description}</p>
                ) : (
                  <p className="text-gray-400 italic text-sm">No description provided.</p>
                )}
              </div>

              {/* Details row */}
              {(event.capacity || event.price_type !== 'free') && (
                <div className="flex flex-wrap gap-3">
                  {event.capacity && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Capacity</p>
                      <p className="text-sm font-medium text-gray-800">{participants.length} / {event.capacity} registered</p>
                    </div>
                  )}
                  {event.price_type !== 'free' && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex-1 min-w-[140px]">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Admission</p>
                      <p className="text-sm font-medium text-gray-800">Paid</p>
                    </div>
                  )}
                </div>
              )}

              {/* Google Maps location */}
              {event.location_type !== 'virtual' && event.location && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 tracking-wider mb-3">Location</h2>
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <iframe
                      title="Event location"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                      width="100%"
                      height="220"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-200">
                      <span className="text-sm text-gray-700">{event.location}</span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Open in Maps →
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Announcement Tab ── */}
          {activeTab === 'announcement' && (
            <div className="p-6">
              <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center">
                <span className="text-3xl">📢</span>
                <p className="text-gray-500 font-medium mt-3">No announcements yet</p>
                <p className="text-gray-400 text-sm mt-1">Check back later for updates from the organizer.</p>
              </div>
            </div>
          )}

          {/* ── Review Applicants Tab (host only) ── */}
          {activeTab === 'review' && isHost && event.require_approval && (
            <ApplicantReviewer
              eventId={eventId}
              userId={userId}
              eventName={event.name}
              onConfirmed={fetchParticipants}
            />
          )}

          {/* ── Participants Tab ── */}
          {activeTab === 'participants' && (
            <div className="p-6 space-y-8">
              {/* Top recommendations (horizontal) */}
              {topRecommended.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-400 tracking-wider mb-4">You may like them!</h2>
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
                            {getInitialsFromName(person.name)}
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
                            <div className="w-full mt-1 space-y-1.5">
                              <button
                                onClick={() => openWrapped(person)}
                                className="w-full px-3 py-1.5 border border-indigo-300 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                              >
                                Match Wrapped
                              </button>
                              <button
                                onClick={() => onConnect(person.id, event?.name)}
                                className="w-full px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Connect
                              </button>
                            </div>
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
                  <h2 className="text-sm font-semibold text-gray-400 tracking-wider">
                    Who's going?
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
                            {getInitialsFromName(participant.name)}
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
                            <div className="flex-shrink-0 flex flex-col gap-1.5">
                              <button
                                onClick={() => openWrapped(participant)}
                                className="px-3 py-1.5 border border-indigo-300 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                              >
                                Match Wrapped
                              </button>
                              <button
                                onClick={() => onConnect(participant.id, event?.name)}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Connect
                              </button>
                            </div>
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
      {wrappedTarget && (() => {
        const rec = recMap.get(wrappedTarget.id);
        const rawScore = rec?.similarity_score ?? wrappedTarget.similarity_score;
        const score = typeof rawScore === 'number'
          ? Math.max(0, Math.round(rawScore * 100))
          : 0;
        const commonPoints = getCommonPoints(wrappedTarget);
        const iceBreakers = getIceBreakers(wrappedTarget, commonPoints);
        const reason = wrappedReasonByUserId[wrappedTarget.id] || '';

        return (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Match Wrapped</p>
                <button
                  onClick={closeWrapped}
                  className="text-gray-400 hover:text-gray-700 text-sm font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="p-6 min-h-[320px]">
                {wrappedPage === 0 && (
                  <div className="h-full rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white p-8 flex flex-col items-center justify-center text-center">
                    <p className="text-xs uppercase tracking-[0.2em] opacity-80 mb-2">You + {wrappedTarget.name}</p>
                    <p className="text-5xl font-extrabold leading-none">{score}%</p>
                    <p className="mt-3 text-lg font-semibold">Event Match Score</p>
                    <p className="mt-2 text-sm opacity-90">Based on this event&apos;s attendee pool</p>
                  </div>
                )}

                {wrappedPage === 1 && (
                  <div className="h-full rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-100 p-7">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-700 font-semibold mb-3">What you have in common</p>
                    {commonPoints.length > 0 ? (
                      <div className="space-y-2">
                        {commonPoints.map((point, idx) => (
                          <div key={`${point}-${idx}`} className="bg-white rounded-xl p-3 border border-amber-100 text-sm text-gray-700">
                            {point}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-4 border border-amber-100 text-sm text-gray-600">
                        No obvious overlap detected, but this can still be a great “new perspective” conversation.
                      </div>
                    )}
                  </div>
                )}

                {wrappedPage === 2 && (
                  <div className="h-full rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 p-7">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-semibold mb-3">Talk starters</p>
                    <div className="space-y-2 mb-4">
                      {iceBreakers.map((line, idx) => (
                        <div key={`${line}-${idx}`} className="bg-white rounded-xl p-3 border border-emerald-100 text-sm text-gray-700">
                          {line}
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-emerald-100">
                      <p className="text-xs text-gray-500 mb-1">AI summary</p>
                      <p className="text-sm text-gray-700">
                        {wrappedReasonLoading && !reason ? 'Generating summary...' : (reason || 'You have enough overlap to start a meaningful conversation.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex items-center justify-between">
                <button
                  onClick={() => setWrappedPage(prev => Math.max(0, prev - 1))}
                  disabled={wrappedPage === 0}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(idx => (
                    <span
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full ${wrappedPage === idx ? 'bg-indigo-600' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setWrappedPage(prev => Math.min(2, prev + 1))}
                  disabled={wrappedPage === 2}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
