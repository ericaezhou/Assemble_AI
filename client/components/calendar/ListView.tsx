'use client';

import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { useCalendar } from './CalendarProvider';
import { getEventCategory, EVENT_CATEGORY_COLORS } from '@/types/calendar';
import type { CalendarEvent } from '@/types/calendar';

function groupByDate(events: CalendarEvent[]): { dateLabel: string; dateKey: string; events: CalendarEvent[] }[] {
  const dayMap = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date || event.start_date);
    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd');
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(event);
    }
  }

  const sortedKeys = [...dayMap.keys()].sort();
  return sortedKeys.map(dateKey => {
    const dayEvents = dayMap.get(dateKey)!.sort((a, b) =>
      (a.start_time || '') < (b.start_time || '') ? -1 : 1
    );
    return {
      dateKey,
      dateLabel: format(parseISO(dateKey), 'EEEE, MMM d'),
      events: dayEvents,
    };
  });
}

function getMultiDayLabel(event: CalendarEvent, currentDateKey: string): string | null {
  if (event.start_date === (event.end_date || event.start_date)) return null;
  const start = parseISO(event.start_date);
  const end = parseISO(event.end_date || event.start_date);
  const total = eachDayOfInterval({ start, end }).length;
  const current = parseISO(currentDateKey);
  const dayNum = eachDayOfInterval({ start, end: current }).length;
  return `Day ${dayNum}/${total}`;
}

export default function ListView() {
  const { events, openQuickView } = useCalendar();
  const groups = groupByDate(events);

  if (events.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
        </svg>
        <p className="text-sm font-medium">No events this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.dateKey}>
          <h3
            className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {group.dateLabel}
          </h3>
          <div className="space-y-2">
            {group.events.map((event) => (
              <ListEventCard
                key={`${event.id}-${group.dateKey}`}
                event={event}
                multiDayLabel={getMultiDayLabel(event, group.dateKey)}
                onSelect={(e) => openQuickView(event, e.currentTarget)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListEventCard({
  event,
  multiDayLabel,
  onSelect,
}: {
  event: CalendarEvent;
  multiDayLabel: string | null;
  onSelect: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const category = getEventCategory(event);
  const colors = EVENT_CATEGORY_COLORS[category];
  const categoryLabel = category === 'hosting' ? 'Hosting' : category === 'attending' ? 'Attending' : 'Invited';

  const locationDisplay = event.location_type === 'virtual'
    ? 'Virtual'
    : event.location_type === 'hybrid'
      ? `${event.location} + Virtual`
      : event.location || 'TBD';

  return (
    <div
      onClick={onSelect}
      className="card overflow-hidden flex cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderLeft: `3px solid ${colors.border}` }}
    >
      {/* Cover thumbnail */}
      {event.cover_photo_url && (
        <div className="w-20 flex-shrink-0 overflow-hidden">
          <img src={event.cover_photo_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0 px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          {event.start_time && (
            <span className="text-xs font-semibold" style={{ color: colors.text }}>
              {event.start_time}
            </span>
          )}
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.text }}
          >
            {categoryLabel}
          </span>
          {multiDayLabel && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
            >
              {multiDayLabel}
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
          {event.name}
        </h4>

        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1 truncate">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locationDisplay}
          </span>
          {event.host_name && !event.is_host && (
            <span className="truncate">
              by <strong style={{ color: 'var(--text)' }}>{event.host_name}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
