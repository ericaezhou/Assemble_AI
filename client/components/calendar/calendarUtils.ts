import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';

export function getMonthGridDays(month: Date): Date[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function getDateRangeForMonth(month: Date): { startDate: string; endDate: string } {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return {
    startDate: format(gridStart, 'yyyy-MM-dd'),
    endDate: format(gridEnd, 'yyyy-MM-dd'),
  };
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStr = format(day, 'yyyy-MM-dd');
  return events.filter(event => {
    return event.start_date <= dayStr && event.end_date >= dayStr;
  });
}

export { addMonths, subMonths, format };

function toICSDate(dateStr: string, timeStr?: string): string {
  const d = dateStr.replace(/-/g, '');
  if (!timeStr) return d;
  const t = timeStr.replace(/:/g, '').replace(/\s/g, '');
  const match = t.match(/^(\d{1,2})(\d{2})?(AM|PM)?$/i);
  if (!match) return d;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  }
  return `${d}T${String(hours).padStart(2, '0')}${minutes}00`;
}

export function generateICS(event: CalendarEvent): string {
  const dtStart = toICSDate(event.start_date, event.start_time ?? undefined);
  const dtEnd = toICSDate(event.end_date, event.end_time ?? undefined);
  const location = event.location_type === 'virtual'
    ? event.virtual_link || 'Virtual'
    : event.location || '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Assemble AI//Calendar//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(event.name)}`,
    `LOCATION:${escapeICS(location)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    `UID:${event.id}@assemble.ai`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return `\\${match}`;
  });
}

export function downloadICS(event: CalendarEvent): void {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const dtStart = toICSDate(event.start_date, event.start_time ?? undefined);
  const dtEnd = toICSDate(event.end_date, event.end_time ?? undefined);
  const location = event.location_type === 'virtual'
    ? event.virtual_link || 'Virtual'
    : event.location || '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${dtStart}/${dtEnd}`,
    location,
  });

  if (event.description) {
    params.set('details', event.description);
  }

  return `https://calendar.google.com/calendar/event?${params.toString()}`;
}
