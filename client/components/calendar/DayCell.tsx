'use client';

import { isToday, isSameMonth, format } from 'date-fns';
import EventDot from './EventDot';
import { useCalendar } from './CalendarProvider';
import type { CalendarEvent } from '@/types/calendar';

interface DayCellProps {
  day: Date;
  events: CalendarEvent[];
}

const MAX_VISIBLE = 2;

export default function DayCell({ day, events }: DayCellProps) {
  const { currentMonth, openQuickView } = useCalendar();
  const inCurrentMonth = isSameMonth(day, currentMonth);
  const today = isToday(day);
  const dayNum = format(day, 'd');
  const overflow = events.length - MAX_VISIBLE;

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    openQuickView(event, e.currentTarget);
  };

  return (
    <div
      className="min-h-[90px] p-1 border-b border-r flex flex-col"
      style={{
        borderColor: 'var(--border-light)',
        background: today
          ? 'var(--accent-light)'
          : inCurrentMonth
            ? 'transparent'
            : 'var(--surface)',
        opacity: inCurrentMonth ? 1 : 0.45,
      }}
    >
      <div className="flex items-center justify-center mb-0.5">
        <span
          className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${today ? 'text-white' : ''}`}
          style={{
            background: today ? 'var(--accent)' : 'transparent',
            color: today ? '#fff' : 'var(--text)',
          }}
        >
          {dayNum}
        </span>
      </div>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        {events.slice(0, MAX_VISIBLE).map((event) => (
          <EventDot
            key={event.id}
            event={event}
            onClick={(e) => handleEventClick(event, e)}
          />
        ))}
        {overflow > 0 && (
          <span
            className="text-[10px] font-medium px-1.5 cursor-default"
            style={{ color: 'var(--text-muted)' }}
          >
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}
