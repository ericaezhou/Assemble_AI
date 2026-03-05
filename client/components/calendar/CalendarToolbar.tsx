'use client';

import { format } from 'date-fns';
import { useCalendar } from './CalendarProvider';
import type { ViewMode } from '@/types/calendar';

export default function CalendarToolbar() {
  const { currentMonth, viewMode, setViewMode, goToPrevMonth, goToNextMonth, goToToday } = useCalendar();

  const monthLabel = format(currentMonth, 'MMMM yyyy');

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left: month nav */}
      <div className="flex items-center gap-2">
        <button
          onClick={goToPrevMonth}
          className="btn btn-ghost"
          style={{ padding: '6px 10px' }}
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h2
          className="text-lg font-bold min-w-[180px] text-center select-none"
          style={{ color: 'var(--text)' }}
        >
          {monthLabel}
        </h2>

        <button
          onClick={goToNextMonth}
          className="btn btn-ghost"
          style={{ padding: '6px 10px' }}
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          onClick={goToToday}
          className="btn btn-ghost text-xs font-semibold"
          style={{ padding: '4px 12px', color: 'var(--accent)' }}
        >
          Today
        </button>
      </div>

      {/* Right: view mode toggle */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ border: '1.5px solid var(--border)' }}
      >
        {(['month', 'list'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="px-4 py-1.5 text-xs font-semibold transition-colors capitalize"
            style={{
              background: viewMode === mode ? 'var(--accent)' : 'transparent',
              color: viewMode === mode ? '#fff' : 'var(--text-muted)',
            }}
          >
            {mode === 'month' ? 'Month' : 'List'}
          </button>
        ))}
      </div>
    </div>
  );
}
