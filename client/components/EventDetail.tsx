'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/utils/auth';
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

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  const topRecommended = [...participants]
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
              style={{ background: 'var(--bg)', border: '2px solid var(--border-light)', color: 'var(--text-muted)' }}
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
                  <div className="rounded-lg overflow-hidden" style={{ border: '2px solid var(--border)' }}>
                    <iframe
                      title="Event location"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                      width="100%"
                      height="220"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--bg)', borderTop: '2px solid var(--border-light)' }}>
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
                            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                            style={{ background: 'var(--surface)', border: '2px solid var(--accent)', color: 'var(--accent)' }}
                          >
                            {getInitials(person.name)}
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
                            <button
                              onClick={() => onConnect(person.id, event?.name)}
                              className="btn btn-primary w-full justify-center"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
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
                  <h2 className="section-heading">Who&apos;s going?</h2>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredParticipants.length} shown</span>
                </div>

                <input
                  type="text"
                  placeholder="Search by name, school, research areas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input mb-4"
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
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
                          >
                            {getInitials(participant.name)}
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
                            <button
                              onClick={() => onConnect(participant.id, event?.name)}
                              className="btn btn-primary flex-shrink-0"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
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
