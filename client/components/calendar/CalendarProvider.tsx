'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { useUserStore } from '@/store/userStore';
import { getDateRangeForMonth } from './calendarUtils';
import type { CalendarEvent, CalendarContextValue, ViewMode } from '@/types/calendar';

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}

export default function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewAnchor, setQuickViewAnchor] = useState<HTMLElement | null>(null);

  const { startDate, endDate } = useMemo(() => getDateRangeForMonth(currentMonth), [currentMonth]);

  const swrKey = user
    ? `/api/researchers/${user.id}/calendar-events?startDate=${startDate}&endDate=${endDate}`
    : null;

  const { data: events = [], isLoading, mutate } = useAuthSWR<CalendarEvent[]>(swrKey);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);

  const openQuickView = useCallback((event: CalendarEvent, anchor: HTMLElement) => {
    setSelectedEvent(event);
    setQuickViewAnchor(anchor);
    setQuickViewOpen(true);
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickViewOpen(false);
    setSelectedEvent(null);
    setQuickViewAnchor(null);
  }, []);

  const refreshEvents = useCallback(() => {
    mutate();
  }, [mutate]);

  const value = useMemo<CalendarContextValue>(() => ({
    currentMonth,
    viewMode,
    events,
    isLoading,
    selectedEvent,
    quickViewOpen,
    quickViewAnchor,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    setViewMode,
    openQuickView,
    closeQuickView,
    refreshEvents,
  }), [
    currentMonth, viewMode, events, isLoading,
    selectedEvent, quickViewOpen, quickViewAnchor,
    goToPrevMonth, goToNextMonth, goToToday,
    openQuickView, closeQuickView, refreshEvents,
  ]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
