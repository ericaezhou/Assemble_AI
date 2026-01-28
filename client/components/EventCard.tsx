'use client';

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
  is_host: number;
  price_type?: string;
  capacity?: number;
}

interface EventCardProps {
  event: Event;
  onCopyId: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function EventCard({ event, onCopyId, onClick }: EventCardProps) {
  const formatDate = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (timeString) {
      return `${formatted} at ${timeString}`;
    }
    return formatted;
  };

  const getLocationIcon = () => {
    if (event.location_type === 'virtual') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  };

  const getLocationDisplay = () => {
    if (event.location_type === 'virtual') {
      return 'Virtual Event';
    }
    if (event.location_type === 'hybrid') {
      return `${event.location} + Virtual`;
    }
    return event.location || 'Location TBD';
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(event.id);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-gray-800">{event.name}</h3>
        <div className="flex gap-2">
          {event.price_type === 'free' && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
              Free
            </span>
          )}
          {event.is_host === 1 && (
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-semibold">
              Host
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {getLocationIcon()}
          <span>{getLocationDisplay()}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {formatDate(event.start_date, event.start_time)}
            {event.end_date && event.end_date !== event.start_date && (
              <> - {formatDate(event.end_date, event.end_time)}</>
            )}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <code className="text-xs bg-gray-100 px-3 py-1.5 rounded font-mono text-gray-700">
          ID: {event.id}
        </code>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyId(event.id);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy ID
        </button>
      </div>
    </div>
  );
}
