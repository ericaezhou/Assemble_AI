'use client';

import { useState } from 'react';

interface Conference {
  id: string;
  name: string;
  description?: string;
  location?: string;
  location_type: string;
  virtual_link?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  host_id: string;
  is_host: number;
  capacity?: number;
  price_type?: string;
}

interface EventsPanelProps {
  events: Conference[];
  isOwnProfile: boolean;
  userName: string;
}

function formatEventDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getActivityLevel(total: number): { label: string; emoji: string } {
  if (total === 0) return { label: 'Just Getting Started', emoji: '🌱' };
  if (total <= 2) return { label: 'Event Explorer', emoji: '🧭' };
  if (total <= 5) return { label: 'Community Regular', emoji: '⭐' };
  if (total <= 10) return { label: 'Community Builder', emoji: '🔥' };
  return { label: 'Super Connector', emoji: '💫' };
}

export default function EventsPanel({ events, isOwnProfile, userName }: EventsPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'hosted' | 'attended'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hostedEvents = events.filter(e => e.is_host === 1);
  const attendedEvents = events.filter(e => e.is_host === 0);

  const upcoming = events.filter(e => {
    if (!e.start_date) return false;
    const d = new Date(e.start_date);
    return !isNaN(d.getTime()) && d >= today;
  });

  const past = events.filter(e => {
    if (!e.start_date) return true;
    const d = new Date(e.start_date);
    return isNaN(d.getTime()) || d < today;
  });

  const displayEvents = activeTab === 'hosted'
    ? hostedEvents
    : activeTab === 'attended'
    ? attendedEvents
    : events;

  const activityLevel = getActivityLevel(events.length);
  const firstName = userName.split(' ')[0];

  return (
    <div className="space-y-4 sticky top-6">
      {/* Stats Hero */}
      <div className="card overflow-hidden">
        {/* Accent header strip */}
        <div
          className="px-5 py-4"
          style={{ background: 'var(--accent)', borderBottom: '2px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg">{activityLevel.emoji}</span>
            <span className="text-sm font-black tracking-wide" style={{ color: '#fff' }}>
              {activityLevel.label}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {isOwnProfile ? 'Your event journey' : `${firstName}'s event journey`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3" style={{ borderBottom: upcoming.length > 0 ? '2px solid var(--border-light)' : 'none' }}>
          {[
            { value: events.length, label: 'Total' },
            { value: hostedEvents.length, label: 'Hosted' },
            { value: attendedEvents.length, label: 'Attended' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="py-4 text-center"
              style={{ borderRight: i < 2 ? '2px solid var(--border-light)' : 'none' }}
            >
              <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>{stat.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {upcoming.length > 0 && (
          <div className="px-5 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {upcoming.length} upcoming event{upcoming.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Events Card */}
      <div className="card overflow-hidden">
        {/* Tab bar */}
        <div className="flex px-2" style={{ borderBottom: '2px solid var(--border-light)' }}>
          {[
            { key: 'all', label: 'All', count: events.length },
            { key: 'hosted', label: 'Hosted', count: hostedEvents.length },
            { key: 'attended', label: 'Attended', count: attendedEvents.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'all' | 'hosted' | 'attended')}
              className="relative px-4 py-3 text-xs font-bold transition-colors flex items-center gap-1.5"
              style={{ color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                  style={activeTab === tab.key
                    ? { background: 'var(--accent-light)', color: 'var(--accent)' }
                    : { background: 'var(--bg)', color: 'var(--text-muted)' }
                  }
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          ))}
        </div>

        {displayEvents.length === 0 ? (
          <div className="py-8 px-6 text-center">
            <div className="text-3xl mb-2">
              {activeTab === 'hosted' ? '🎪' : activeTab === 'attended' ? '🎫' : '📅'}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No events yet</p>
          </div>
        ) : (
          <div>
            {/* Upcoming section */}
            {activeTab === 'all' && upcoming.length > 0 && (
              <>
                <div
                  className="px-5 py-2 flex items-center gap-1.5"
                  style={{ background: 'var(--accent-light)', borderBottom: '1px solid var(--border-light)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                  <span className="section-heading" style={{ color: '#15803d' }}>Upcoming</span>
                </div>
                {upcoming.map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
                {past.filter(e => displayEvents.includes(e)).length > 0 && (
                  <div
                    className="px-5 py-2"
                    style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border-light)', borderTop: '1px solid var(--border-light)' }}
                  >
                    <span className="section-heading">Past</span>
                  </div>
                )}
              </>
            )}

            {/* Past / all events */}
            {(activeTab !== 'all'
              ? displayEvents
              : past.filter(e => events.includes(e))
            ).map(event => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: Conference }) {
  const isHosted = event.is_host === 1;
  const isVirtual = event.location_type === 'virtual';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event.start_date ? new Date(event.start_date) : null;
  const isUpcoming = eventDate && !isNaN(eventDate.getTime()) && eventDate >= today;

  return (
    <div
      className="px-5 py-4 flex gap-3 items-start"
      style={{ borderBottom: '1px solid var(--border-light)' }}
    >
      {/* Accent left bar */}
      <div
        className="mt-1 w-1 self-stretch rounded-full flex-shrink-0"
        style={{
          background: isHosted
            ? 'var(--accent)'
            : isUpcoming
            ? '#22c55e'
            : 'var(--border-light)',
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>{event.name}</p>
          <span
            className="tag flex-shrink-0"
            style={isHosted
              ? { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }
              : { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }
            }
          >
            {isHosted ? '👑 Host' : '✓ Attended'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {event.start_date && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatEventDate(event.start_date)}
            </span>
          )}
          {(event.location || isVirtual) && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {isVirtual ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Virtual
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </>
              )}
            </span>
          )}
          {event.price_type === 'free' && (
            <span className="text-xs font-semibold" style={{ color: '#15803d' }}>Free</span>
          )}
        </div>
      </div>
    </div>
  );
}
