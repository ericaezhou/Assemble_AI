'use client';

import EventCoverFallback from './EventCoverFallback';

interface Event {
  id: string;
  name: string;
  location: string;
  location_type?: string;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  is_host: number;
  host_name?: string;
  cover_photo_url?: string;
  price_type?: string;
  capacity?: number;
}

interface EventCardProps {
  event: Event;
  onCopyId: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function EventCard({ event, onCopyId, onClick }: EventCardProps) {
  const isHost = event.is_host === 1;
  const isVirtual = event.location_type === 'virtual';
  const isHybrid = event.location_type === 'hybrid';

  const locationDisplay = isVirtual
    ? 'Virtual Event'
    : isHybrid
    ? `${event.location} + Virtual`
    : event.location || 'Location TBD';

  const hostLabel = isHost ? 'You' : event.host_name || null;

  return (
    <div
      className={`card overflow-hidden flex flex-col${onClick ? ' cursor-pointer' : ''}`}
      onClick={() => onClick?.(event.id)}
    >
      {/* Top: cover photo + event info */}
      <div className="flex flex-1">
        {/* Cover photo */}
        <div className="w-48 flex-shrink-0 overflow-hidden" style={{ borderRight: '2px solid var(--border)' }}>
          {event.cover_photo_url ? (
            <img src={event.cover_photo_url} alt="Event cover" className="w-full h-full object-cover" />
          ) : (
            <EventCoverFallback eventName={event.name} />
          )}
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0 px-4 py-4 space-y-2">
          {/* Time */}
          {event.start_time && (
            <p className="text-[20px] font-semibold tracking-wide" style={{ color: 'var(--accent)' }}>
              {event.start_time}
            </p>
          )}

          {/* Title */}
          <h3 className="text-[28px] font-black leading-snug" style={{ color: 'var(--text)' }}>
            {event.name}
          </h3>

          {/* Host */}
          {hostLabel && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              By <span className="font-semibold" style={{ color: 'var(--text)' }}>{hostLabel}</span>
            </p>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {isVirtual ? (
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            <span className="truncate">{locationDisplay}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
            {isHost ? (
              <span className="tag tag-accent">Hosting</span>
            ) : (
              <span className="tag" style={{ background: '#f0fdf4', borderColor: '#059669', color: '#059669' }}>Attending</span>
            )}
            {isVirtual && <span className="tag">Virtual</span>}
            {isHybrid && <span className="tag">Hybrid</span>}
            <button
              onClick={e => { e.stopPropagation(); onCopyId(event.id); }}
              className="tag flex items-center gap-1 transition-colors"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = ''; }}
              title={`Copy invite code: ${event.id}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
