'use client';

import { format } from 'date-fns';
import { useCalendar } from './CalendarProvider';
import { getMonthGridDays, getEventsForDay } from './calendarUtils';
import DayCell from './DayCell';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthGrid() {
  const { currentMonth, events } = useCalendar();
  const days = getMonthGridDays(currentMonth);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
      {/* Weekday header */}
      <div className="grid grid-cols-7" style={{ background: 'var(--surface)' }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-bold uppercase tracking-wider py-2"
            style={{ color: 'var(--text-muted)', borderBottom: '1.5px solid var(--border)' }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={format(day, 'yyyy-MM-dd')}
            day={day}
            events={getEventsForDay(events, day)}
          />
        ))}
      </div>
    </div>
  );
}
