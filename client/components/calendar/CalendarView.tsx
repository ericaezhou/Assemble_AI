'use client';

import { useCalendar } from './CalendarProvider';
import CalendarToolbar from './CalendarToolbar';
import MonthGrid from './MonthGrid';
import ListView from './ListView';
import EventQuickView from './EventQuickView';
import { EVENT_CATEGORY_COLORS } from '@/types/calendar';

export default function CalendarView() {
  const { viewMode, isLoading } = useCalendar();

  return (
    <div className="space-y-4">
      <CalendarToolbar />

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        {([
          { key: 'hosting', label: 'Hosting' },
          { key: 'attending', label: 'Attending' },
          { key: 'pending', label: 'Invited' },
        ] as const).map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: EVENT_CATEGORY_COLORS[key].dot }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
        </div>
      )}

      {/* Views */}
      {!isLoading && viewMode === 'month' && <MonthGrid />}
      {!isLoading && viewMode === 'list' && <ListView />}

      {/* Quick view popover/drawer */}
      <EventQuickView />
    </div>
  );
}
