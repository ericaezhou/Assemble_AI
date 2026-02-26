'use client';

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
      className={`bg-white rounded-xl border border-gray-100 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(event.id)}
    >
      {/* Top: cover photo + event info */}
      <div className="flex flex-1">

        {/* Cover photo */}
        <div className="w-48 flex-shrink-0 border-r border-gray-100 overflow-hidden">
          {event.cover_photo_url ? (
            <img src={event.cover_photo_url} alt="Event cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-50 flex flex-col items-center justify-center gap-1.5 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[9px] text-center leading-tight px-1">Cover</span>
            </div>
          )}
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0 px-4 py-4 space-y-2">
          {/* Time */}
          {event.start_time && (
            <p className="text-[20px] font-semibold text-indigo-500 tracking-wide">{event.start_time}</p>
          )}

          {/* Title */}
          <h3 className="text-[30px] font-bold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors">
            {event.name}
          </h3>

          {/* Host */}
          {hostLabel && (
            <p className="text-xs text-gray-400">
              By <span className="text-gray-600 font-medium">{hostLabel}</span>
            </p>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
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
          <div className="flex items-center gap-1.5 pt-0.5">
            {isHost ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                Hosting
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                Attending
              </span>
            )}
            {isVirtual && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 border border-purple-100">
                Virtual
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: invite code bar — always visible */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="text-[11px] text-gray-400 font-medium">Invite code</span>
          <code className="text-[11px] font-mono font-semibold text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
            {event.id}
          </code>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCopyId(event.id); }}
          className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </button>
      </div>
    </div>
  );
}
