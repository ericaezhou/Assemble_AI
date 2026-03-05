'use client';

import type { CalendarEvent } from '@/types/calendar';
import { getEventCategory, EVENT_CATEGORY_COLORS } from '@/types/calendar';

interface EventDotProps {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function EventDot({ event, onClick }: EventDotProps) {
  const category = getEventCategory(event);
  const colors = EVENT_CATEGORY_COLORS[category];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium truncate transition-opacity hover:opacity-80 cursor-pointer"
      style={{
        background: colors.bg,
        color: colors.text,
        borderLeft: `2.5px solid ${colors.border}`,
      }}
      title={event.name}
    >
      {event.start_time && (
        <span className="opacity-70 mr-0.5">{event.start_time}</span>
      )}
      {event.name}
    </button>
  );
}
