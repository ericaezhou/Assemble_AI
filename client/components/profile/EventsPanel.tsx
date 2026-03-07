'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useAuthSWR } from '@/hooks/useAuthSWR';

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
  const date = new Date(dateStr + 'T12:00:00');
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

type ActiveBox = 'total' | 'hosted' | 'together' | null;

export default function EventsPanel({ events, isOwnProfile, userName }: EventsPanelProps) {
  const [activeBox, setActiveBox] = useState<ActiveBox>(null);
  const [bumping, setBumping] = useState<ActiveBox>(null);
  const { user: currentUser } = useUserStore();

  // Fetch current user's events to compute "Together" (only when viewing someone else's profile)
  const { data: myEvents = [] } = useAuthSWR<Conference[]>(
    !isOwnProfile && currentUser ? `/api/researchers/${currentUser.id}/conferences` : null
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hostedEvents = events.filter(e => e.is_host === 1);
  const upcoming = events.filter(e => {
    if (!e.start_date) return false;
    const d = new Date(e.start_date + 'T12:00:00');
    return !isNaN(d.getTime()) && d >= today;
  });

  // Events both users attended
  const myEventIds = new Set(myEvents.map(e => e.id));
  const togetherEvents = events.filter(e => myEventIds.has(e.id));

  const activityLevel = getActivityLevel(events.length);
  const firstName = userName.split(' ')[0];

  const boxes: { key: ActiveBox; label: string; count: number }[] = [
    { key: 'total',  label: 'Total',    count: events.length },
    { key: 'hosted', label: 'Hosted',   count: hostedEvents.length },
    ...(!isOwnProfile ? [{ key: 'together' as ActiveBox, label: 'Together', count: togetherEvents.length }] : []),
  ];

  const activeList =
    activeBox === 'hosted'   ? hostedEvents :
    activeBox === 'together' ? togetherEvents :
    activeBox === 'total'    ? events :
    [];

  const handleBoxClick = (key: ActiveBox) => {
    setBumping(key);
    setTimeout(() => setBumping(null), 300);
    setActiveBox(prev => prev === key ? null : key);
  };

  return (
    <div className="space-y-4 sticky top-0">
      {/* Activity level badge */}
      <div
        className="card px-5 py-4 flex items-center gap-3"
        style={{ background: 'var(--accent)', borderColor: 'var(--border)' }}
      >
        <span className="text-2xl">{activityLevel.emoji}</span>
        <div>
          <p className="text-sm font-black" style={{ color: '#fff' }}>{activityLevel.label}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {isOwnProfile ? 'Your event journey' : `${firstName}'s event journey`}
          </p>
        </div>
        {upcoming.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: '#4ade80' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {upcoming.length} upcoming
            </span>
          </div>
        )}
      </div>

      {/* Stat blocks */}
      <div className={`grid gap-3 ${boxes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {boxes.map(box => {
          const isActive = activeBox === box.key;
          const isBumping = bumping === box.key;
          return (
            <button
              key={box.key}
              onClick={() => handleBoxClick(box.key)}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-lg font-black transition-all select-none"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--surface)',
                border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: isActive ? 'none' : '4px 4px 0 var(--border)',
                transform: isBumping
                  ? 'translateY(-6px) scale(1.05)'
                  : isActive
                  ? 'translate(2px, 2px)'
                  : 'none',
                color: isActive ? '#fff' : 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <span className="text-2xl leading-none">{box.count}</span>
              <span className="text-xs font-semibold" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                {box.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating event list */}
      {activeBox && (
        <div className="card overflow-hidden" style={{ animation: 'slideDown 0.18s ease-out' }}>
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '2px solid var(--border-light)', background: 'var(--bg)' }}
          >
            <span className="text-sm font-black" style={{ color: 'var(--text)' }}>
              {boxes.find(b => b.key === activeBox)?.label} Events
            </span>
            <span
              className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {activeList.length}
            </span>
          </div>

          {activeList.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No events yet</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {activeList.map(event => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function EventRow({ event }: { event: Conference }) {
  const isHosted = event.is_host === 1;
  const isVirtual = event.location_type === 'virtual';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event.start_date ? new Date(event.start_date + 'T12:00:00') : null;
  const isUpcoming = eventDate && !isNaN(eventDate.getTime()) && eventDate >= today;

  return (
    <div className="px-4 py-3 flex gap-3 items-start">
      <div
        className="mt-1 w-1 self-stretch rounded-full flex-shrink-0 min-h-[2rem]"
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
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
            {event.name}
          </p>
          <span
            className="tag flex-shrink-0 text-xs"
            style={isHosted
              ? { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }
              : { background: '#f0fdf4', borderColor: '#86efac', color: '#15803d' }
            }
          >
            {isHosted ? 'Host' : 'Attended'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {event.start_date && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatEventDate(event.start_date)}
            </span>
          )}
          {(event.location || isVirtual) && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isVirtual ? 'Virtual' : event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
