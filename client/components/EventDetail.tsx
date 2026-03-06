'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/utils/auth';
import { getInitialsFromName } from '@/utils/name';
import { Participant, getInstitution, getInterestsString } from '@/types/profile';
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
    if (myResearch && otherResearch && (myResearch === otherResearch || myResearch.includes(otherResearch) || otherResearch.includes(myResearch))) {
      points.push(`Shared research focus around ${other.research_area}`);
    }
    const myInterests = new Set((currentUser.interest_areas || []).map(x => x.trim().toLowerCase()).filter(Boolean));
    const otherInterests = (other.interest_areas || []).map(x => x.trim().toLowerCase()).filter(Boolean);
    otherInterests.filter(x => myInterests.has(x)).slice(0, 3).forEach(x => points.push(`Common interest: ${x}`));
    const mySkills = new Set((currentUser.current_skills || []).map(x => x.trim().toLowerCase()).filter(Boolean));
    const otherSkills = (other.current_skills || []).map(x => x.trim().toLowerCase()).filter(Boolean);
    otherSkills.filter(x => mySkills.has(x)).slice(0, 2).forEach(x => points.push(`Both work with ${x}`));
    return points.slice(0, 4);
  };

  const getIceBreakers = (other: Participant, commonPoints: string[]): string[] => {
    const cues: string[] = [];
    if (commonPoints.length > 0) {
      cues.push(`"I saw we both care about ${commonPoints[0].replace(/^Common interest:\s*/i, '').replace(/^Shared research focus around\s*/i, '')}. What are you building in that area?"`);
    }
    if (other.research_area) cues.push(`"What made you focus on ${other.research_area} recently?"`);
    const otherInterests = (other.interest_areas || []).slice(0, 1);
    if (otherInterests.length > 0) cues.push(`"How did you get interested in ${otherInterests[0]}?"`);
    if (cues.length === 0) cues.push('"What are you most excited to learn from people at this event?"');
    return cues.slice(0, 3);
  };

  const openWrapped = async (person: Participant) => {
    setWrappedTarget(person);
    setWrappedPage(0);
    if (wrappedReasonByUserId[person.id]) return;
    setWrappedReasonLoading(true);
    try {
      const rec = recMap.get(person.id);
      const response = await authenticatedFetch(`/api/researchers/${userId}/recommendations/${person.id}/why-match`, {
        method: 'POST',
        body: JSON.stringify({ score: rec?.similarity_score ?? person.similarity_score, exp_similarity: rec?.exp_similarity, interest_similarity: rec?.interest_similarity }),
      });
      const data = await response.json().catch(() => ({}));
      const reason = typeof data?.reason === 'string' && data.reason.trim() ? data.reason.trim() : 'You seem to have a meaningful overlap worth chatting about.';
      setWrappedReasonByUserId(prev => ({ ...prev, [person.id]: reason }));
    } catch {
      setWrappedReasonByUserId(prev => ({ ...prev, [person.id]: 'You seem to have a meaningful overlap worth chatting about.' }));
    } finally {
      setWrappedReasonLoading(false);
    }
  };

  const closeWrapped = () => { setWrappedTarget(null); setWrappedPage(0); };

  // Top 3 recommended (sorted by similarity_score, excluding self)
  const topRecommended = [...eventRecommendations]
    .filter(p => p.id !== userId && typeof p.similarity_score === 'number')
    .sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0))
    .slice(0, 3);

  if (!event) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading event details...</p>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(event.start_date) > new Date();
  const isAttending = !loading && participants.some(p => p.id === userId);
  const isHost = event.host_id === userId;
  const dateBlock = formatDateBlock(event.start_date);

  return (
    <div className="min-h-full px-5 pt-5 pb-8" style={{ background: 'var(--bg)' }}>
      <div className="space-y-4">

        {/* ── Header card ── */}
        <div className="card px-6 py-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className="tag"
              style={isAttending
                ? { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }
                : { background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }
              }
            >
              {isAttending ? (
                <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>You&apos;re In</>
              ) : 'Pending'}
            </span>
            {isUpcoming && (
              <span className="tag tag-accent flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                Upcoming
              </span>
            )}
            {event.location_type === 'virtual' && (
              <span className="tag">Virtual</span>
            )}
          </div>

          {/* Event name */}
          <h1 className="text-2xl font-black leading-tight mb-6" style={{ color: 'var(--text)' }}>{event.name}</h1>

          {/* Date row */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="flex-shrink-0 w-11 rounded-lg overflow-hidden text-center"
              style={{ border: '2px solid var(--border)' }}
            >
              <div className="text-[10px] font-black py-0.5 uppercase tracking-wide" style={{ background: 'var(--accent)', color: '#fff' }}>{dateBlock.month}</div>
              <div className="font-black text-lg leading-tight py-0.5" style={{ background: 'var(--surface)', color: 'var(--text)' }}>{dateBlock.day}</div>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{dateBlock.full}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
              </p>
            </div>
          </div>

          {/* Location row */}
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--accent)' }}
            >
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
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{getLocationDisplay()}</p>
              {event.location_type === 'virtual' && event.virtual_link && (
                <a href={event.virtual_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                  Join link →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab card ── */}
        <div className="card overflow-hidden">
          {/* Tab bar */}
          <div className="flex px-2 overflow-x-auto" style={{ borderBottom: '2px solid var(--border-light)' }}>
            {[
              { key: 'description', label: 'About' },
              { key: 'announcement', label: 'Announcement' },
              { key: 'participants', label: `Participants (${participants.length})` },
              ...(isHost && event.require_approval ? [{ key: 'review', label: 'Review Applicants' }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ActiveTab)}
                className="relative px-5 py-4 text-sm font-bold transition-colors whitespace-nowrap"
                style={{ color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>

          {/* ── Description Tab ── */}
          {activeTab === 'description' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="section-heading mb-3">About the Event</h2>
                {event.description ? (
                  <p className="leading-relaxed text-sm" style={{ color: 'var(--text)' }}>{event.description}</p>
                ) : (
                  <p className="italic text-sm" style={{ color: 'var(--text-muted)' }}>No description provided.</p>
                )}
              </div>

              {(event.capacity || event.price_type !== 'free') && (
                <div className="flex flex-wrap gap-3">
                  {event.capacity && (
                    <div className="rounded-lg px-4 py-3 flex-1 min-w-[140px]" style={{ background: 'var(--bg)', border: '2px solid var(--border-light)' }}>
                      <p className="section-heading mb-1">Capacity</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{participants.length} / {event.capacity} registered</p>
                    </div>
                  )}
                  {event.price_type !== 'free' && (
                    <div className="rounded-lg px-4 py-3 flex-1 min-w-[140px]" style={{ background: 'var(--bg)', border: '2px solid var(--border-light)' }}>
                      <p className="section-heading mb-1">Admission</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Paid</p>
                    </div>
                  )}
                </div>
              )}

              {event.location_type !== 'virtual' && event.location && (
                <div>
                  <h2 className="section-heading mb-3">Location</h2>
                  <div className="rounded-lg overflow-hidden">
                    <iframe
                      title="Event location"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                      width="100%"
                      height="220"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--bg)' }}>
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{event.location}</span>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold hover:underline"
                        style={{ color: 'var(--accent)' }}
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
              <div className="rounded-lg p-8 text-center" style={{ border: '2px dashed var(--border-light)' }}>
                <span className="text-3xl">📢</span>
                <p className="font-semibold mt-3" style={{ color: 'var(--text)' }}>No announcements yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Check back later for updates from the organizer.</p>
              </div>
            </div>
          )}

          {/* ── Review Applicants Tab ── */}
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
              {/* Top recommendations */}
              {topRecommended.length > 0 && (
                <div>
                  <h2 className="section-heading mb-4">You may like them!</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {topRecommended.map(person => {
                      const matchPercent = typeof person.similarity_score === 'number' && person.similarity_score > 0
                        ? Math.round(person.similarity_score * 100)
                        : null;
                      return (
                        <div
                          key={person.id}
                          className="card-flat p-4 flex flex-col items-center text-center gap-2"
                          style={{ background: 'var(--accent-light)' }}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 overflow-hidden"
                            style={{ background: 'var(--surface)', border: '2px solid var(--accent)', color: 'var(--accent)' }}
                          >
                            {person.avatar_url ? (
                              <img src={person.avatar_url} alt={person.name} className="w-full h-full object-cover" />
                            ) : getInitialsFromName(person.name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>{person.name}</p>
                            {getInstitution(person) && (
                              <p className="text-xs mt-0.5 truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{getInstitution(person)}</p>
                            )}
                          </div>
                          {matchPercent !== null && (
                            <span className="tag tag-accent">{matchPercent}% match</span>
                          )}
                          {onConnect && (
                            <div className="w-full mt-1 space-y-1.5">
                              <button
                                onClick={() => openWrapped(person)}
                                className="btn btn-secondary w-full justify-center"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              >
                                Match Wrapped
                              </button>
                              <button
                                onClick={() => onConnect(person.id, event?.name)}
                                className="btn btn-primary w-full justify-center"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
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
                  <h2 className="section-heading">Who&apos;s going?</h2>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredParticipants.length} shown</span>
                </div>

                <input
                  type="text"
                  placeholder="Search by name, school, research areas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input mb-4"
                  style={{ borderColor: 'var(--border-light)' }}
                />

                {loading ? (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading attendees...</div>
                ) : filteredParticipants.length === 0 ? (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {searchQuery ? 'No attendees matching your search.' : 'No attendees yet.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {filteredParticipants.map(participant => {
                      const isMe = participant.id === userId;
                      return (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                          style={{ background: 'var(--bg)', border: '1.5px solid var(--border-light)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 overflow-hidden"
                            style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
                          >
                            {participant.avatar_url ? (
                              <img src={participant.avatar_url} alt={participant.name} className="w-full h-full object-cover" />
                            ) : getInitialsFromName(participant.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{participant.name}</span>
                              {isMe && <span className="tag tag-accent" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>You</span>}
                            </div>
                            {getInstitution(participant) && (
                              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{getInstitution(participant)}</p>
                            )}
                            {participant.research_area && (
                              <span className="tag mt-1 inline-block" style={{ fontSize: '0.65rem' }}>{participant.research_area}</span>
                            )}
                          </div>
                          {onConnect && !isMe && (
                            <div className="flex-shrink-0 flex flex-col gap-1.5">
                              <button
                                onClick={() => openWrapped(participant)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              >
                                Match Wrapped
                              </button>
                              <button
                                onClick={() => onConnect(participant.id, event?.name)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
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

      {/* ── Match Wrapped Modal ── */}
      {wrappedTarget && (() => {
        const rec = recMap.get(wrappedTarget.id);
        const rawScore = rec?.similarity_score ?? wrappedTarget.similarity_score;
        const score = typeof rawScore === 'number' ? Math.max(0, Math.round(rawScore * 100)) : 0;
        const commonPoints = getCommonPoints(wrappedTarget);
        const iceBreakers = getIceBreakers(wrappedTarget, commonPoints);
        const reason = wrappedReasonByUserId[wrappedTarget.id] || '';

        return (
          <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '2px solid var(--border-light)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Match Wrapped</p>
                <button onClick={closeWrapped} className="btn-ghost text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Close
                </button>
              </div>

              <div className="p-6 min-h-[320px]">
                {wrappedPage === 0 && (
                  <div className="h-full rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white p-8 flex flex-col items-center justify-center text-center">
                    <p className="text-xs uppercase tracking-[0.2em] opacity-80 mb-2">You + {wrappedTarget.name}</p>
                    <p className="text-5xl font-extrabold leading-none">{score}%</p>
                    <p className="mt-3 text-lg font-semibold">Event Match Score</p>
                    <p className="mt-2 text-sm opacity-90">Based on this event&apos;s attendee pool</p>
                  </div>
                )}
                {wrappedPage === 1 && (
                  <div className="h-full rounded-lg p-7" style={{ background: 'var(--accent-light)', border: '1.5px solid var(--border-light)' }}>
                    <p className="section-heading mb-3">What you have in common</p>
                    {commonPoints.length > 0 ? (
                      <div className="space-y-2">
                        {commonPoints.map((point, idx) => (
                          <div key={`${point}-${idx}`} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface)', border: '1.5px solid var(--border-light)', color: 'var(--text)' }}>
                            {point}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--surface)', border: '1.5px solid var(--border-light)', color: 'var(--text-muted)' }}>
                        No obvious overlap detected, but this can still be a great "new perspective" conversation.
                      </div>
                    )}
                  </div>
                )}
                {wrappedPage === 2 && (
                  <div className="h-full rounded-lg p-7" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                    <p className="section-heading mb-3" style={{ color: '#15803d' }}>Talk starters</p>
                    <div className="space-y-2 mb-4">
                      {iceBreakers.map((line, idx) => (
                        <div key={`${line}-${idx}`} className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface)', border: '1.5px solid #86efac', color: 'var(--text)' }}>
                          {line}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg p-3" style={{ background: 'var(--surface)', border: '1.5px solid #86efac' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>AI summary</p>
                      <p className="text-sm" style={{ color: 'var(--text)' }}>
                        {wrappedReasonLoading && !reason ? 'Generating summary...' : (reason || 'You have enough overlap to start a meaningful conversation.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex items-center justify-between" style={{ borderTop: '2px solid var(--border-light)' }}>
                <button
                  onClick={() => setWrappedPage(prev => Math.max(0, prev - 1))}
                  disabled={wrappedPage === 0}
                  className="btn btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map(idx => (
                    <span
                      key={idx}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: wrappedPage === idx ? 'var(--accent)' : 'var(--border-light)' }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setWrappedPage(prev => Math.min(2, prev + 1))}
                  disabled={wrappedPage === 2}
                  className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
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
