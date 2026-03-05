export type ParticipantStatus = 'pending' | 'registered' | 'waitlisted' | 'rejected';

export type EventCategory = 'hosting' | 'attending' | 'pending';

export interface CalendarEvent {
  id: string;
  name: string;
  location: string;
  location_type?: string;
  virtual_link?: string;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  host_id: string;
  host_name: string;
  cover_photo_url?: string;
  capacity?: number;
  description?: string;
  is_host: boolean;
  participant_status: ParticipantStatus;
}

export type ViewMode = 'month' | 'list';

export interface CalendarContextValue {
  currentMonth: Date;
  viewMode: ViewMode;
  events: CalendarEvent[];
  isLoading: boolean;
  selectedEvent: CalendarEvent | null;
  quickViewOpen: boolean;
  quickViewAnchor: HTMLElement | null;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  setViewMode: (mode: ViewMode) => void;
  openQuickView: (event: CalendarEvent, anchor: HTMLElement) => void;
  closeQuickView: () => void;
  refreshEvents: () => void;
}

export interface ParticipantCount {
  total: number;
  registered: number;
  pending: number;
}

export function getEventCategory(event: CalendarEvent): EventCategory {
  if (event.is_host) return 'hosting';
  if (event.participant_status === 'registered') return 'attending';
  return 'pending';
}

export const EVENT_CATEGORY_COLORS: Record<EventCategory, { bg: string; border: string; text: string; dot: string }> = {
  hosting: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: '#8b5cf6',
    text: '#7c3aed',
    dot: '#8b5cf6',
  },
  attending: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#10b981',
    text: '#059669',
    dot: '#10b981',
  },
  pending: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: '#f59e0b',
    text: '#d97706',
    dot: '#f59e0b',
  },
};
