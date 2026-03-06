'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCalendar } from './CalendarProvider';
import { useUserStore } from '@/store/userStore';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { authenticatedFetch } from '@/utils/auth';
import { getGoogleCalendarUrl, downloadICS } from './calendarUtils';
import { getEventCategory, EVENT_CATEGORY_COLORS } from '@/types/calendar';
import type { ParticipantCount } from '@/types/calendar';
import EventCoverFallback from '@/components/EventCoverFallback';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function EventQuickView() {
  const { selectedEvent, quickViewOpen, quickViewAnchor, closeQuickView, refreshEvents } = useCalendar();
  const { user } = useUserStore();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const popoverRef = useRef<HTMLDivElement>(null);
  const [addCalOpen, setAddCalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const isHost = selectedEvent?.is_host ?? false;

  const { data: counts } = useAuthSWR<ParticipantCount>(
    quickViewOpen && isHost && selectedEvent
      ? `/api/conferences/${selectedEvent.id}/participant-count`
      : null
  );

  const updatePopoverPosition = useCallback(() => {
    if (!quickViewAnchor || isMobile || !popoverRef.current) return;
    const anchorRect = quickViewAnchor.getBoundingClientRect();
    const popW = 340;
    const popH = popoverRef.current.offsetHeight || 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left + anchorRect.width / 2 - popW / 2;

    if (left < 12) left = 12;
    if (left + popW > vw - 12) left = vw - popW - 12;
    if (top + popH > vh - 12) {
      top = anchorRect.top - popH - 8;
      if (top < 12) top = 12;
    }

    setPopoverStyle({ top, left, width: popW });
  }, [quickViewAnchor, isMobile]);

  useEffect(() => {
    if (!quickViewOpen || isMobile) return;
    updatePopoverPosition();
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [quickViewOpen, isMobile, updatePopoverPosition]);

  useEffect(() => {
    if (!quickViewOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closeQuickView();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [quickViewOpen, closeQuickView]);

  useEffect(() => {
    if (!quickViewOpen) {
      setAddCalOpen(false);
      setCancelling(false);
    }
  }, [quickViewOpen]);

  if (!quickViewOpen || !selectedEvent) return null;

  const category = getEventCategory(selectedEvent);
  const colors = EVENT_CATEGORY_COLORS[category];
  const categoryLabel = category === 'hosting' ? 'Hosting' : category === 'attending' ? 'Attending' : 'Invited';

  const locationDisplay = selectedEvent.location_type === 'virtual'
    ? 'Virtual Event'
    : selectedEvent.location_type === 'hybrid'
      ? `${selectedEvent.location} + Virtual`
      : selectedEvent.location || 'Location TBD';

  const dateDisplay = (() => {
    const start = new Date(selectedEvent.start_date + 'T12:00:00');
    const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    let s = start.toLocaleDateString('en-US', opts);
    if (selectedEvent.start_time) s += ` · ${selectedEvent.start_time}`;
    if (selectedEvent.end_date !== selectedEvent.start_date) {
      const end = new Date(selectedEvent.end_date + 'T12:00:00');
      s += ` — ${end.toLocaleDateString('en-US', opts)}`;
    }
    if (selectedEvent.end_time) s += ` · ${selectedEvent.end_time}`;
    return s;
  })();

  const handleCancelRSVP = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await authenticatedFetch(`/api/conferences/${selectedEvent.id}/leave`, { method: 'DELETE' });
      if (res.ok) {
        refreshEvents();
        closeQuickView();
      }
    } catch {
      // silently fail
    } finally {
      setCancelling(false);
    }
  };

  const content = (
    <div className="flex flex-col">
      {/* Cover image */}
      <div className="h-32 overflow-hidden rounded-t-lg flex-shrink-0">
        {selectedEvent.cover_photo_url
          ? <img src={selectedEvent.cover_photo_url} alt="" className="w-full h-full object-cover" />
          : <EventCoverFallback eventName={selectedEvent.name} />
        }
      </div>

      <div className="p-4 space-y-3">
        {/* Title + status */}
        <div>
          <h3 className="text-base font-bold leading-snug" style={{ color: 'var(--text)' }}>
            {selectedEvent.name}
          </h3>
          <span
            className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Date & location */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{dateDisplay}</span>
          </div>
          <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{locationDisplay}</span>
          </div>
          {selectedEvent.host_name && !isHost && (
            <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Hosted by <strong style={{ color: 'var(--text)' }}>{selectedEvent.host_name}</strong></span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Host view: participant count + edit */}
        {isHost && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              {counts ? (
                <span>
                  <strong style={{ color: 'var(--text)' }}>{counts.registered}</strong> registered
                  {counts.pending > 0 && (
                    <> · <strong style={{ color: '#f59e0b' }}>{counts.pending}</strong> pending</>
                  )}
                  {selectedEvent.capacity && (
                    <> / {selectedEvent.capacity} capacity</>
                  )}
                </span>
              ) : (
                <span>Loading...</span>
              )}
            </div>
            <button
              onClick={() => { closeQuickView(); router.push(`/?event=${selectedEvent.id}`); }}
              className="btn btn-primary w-full text-xs"
              style={{ padding: '8px 0' }}
            >
              Edit Event
            </button>
          </div>
        )}

        {/* Attendee / pending view: cancel RSVP + add to calendar */}
        {!isHost && (
          <div className="space-y-2">
            {category === 'attending' && (
              <button
                onClick={handleCancelRSVP}
                disabled={cancelling}
                className="btn w-full text-xs"
                style={{
                  padding: '8px 0',
                  background: 'transparent',
                  color: '#ef4444',
                  border: '1.5px solid #ef4444',
                  opacity: cancelling ? 0.5 : 1,
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel RSVP'}
              </button>
            )}
            {category === 'pending' && (
              <div
                className="text-xs text-center py-2 rounded"
                style={{ background: colors.bg, color: colors.text }}
              >
                Awaiting host approval
              </div>
            )}

            {/* Add to calendar dropdown */}
            <div className="relative">
              <button
                onClick={() => setAddCalOpen(!addCalOpen)}
                className="btn btn-ghost w-full text-xs flex items-center justify-center gap-1.5"
                style={{ padding: '8px 0', color: 'var(--text)' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="12" y1="14" x2="12" y2="18" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </svg>
                Add to Calendar
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {addCalOpen && (
                <div
                  className="absolute left-0 right-0 mt-1 rounded-lg shadow-lg z-10 overflow-hidden"
                  style={{ background: 'var(--surface)', border: '1.5px solid var(--border)' }}
                >
                  <a
                    href={getGoogleCalendarUrl(selectedEvent)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--text)', borderBottom: '1px solid var(--border-light)' }}
                  >
                    Google Calendar
                  </a>
                  <button
                    onClick={() => { downloadICS(selectedEvent); setAddCalOpen(false); }}
                    className="block w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--text)' }}
                  >
                    Apple Calendar (.ics)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View details link */}
        <button
          onClick={() => { closeQuickView(); router.push(`/?event=${selectedEvent.id}`); }}
          className="text-xs font-semibold text-center w-full py-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          View Full Details →
        </button>
      </div>
    </div>
  );

  // Mobile: bottom drawer
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 transition-opacity"
          onClick={closeQuickView}
        />
        {/* Drawer */}
        <div
          ref={popoverRef}
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up"
          style={{ background: 'var(--surface)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>
          {content}
        </div>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slideUp 0.25s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Desktop: popover
  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] rounded-lg shadow-xl overflow-hidden"
      style={{
        ...popoverStyle,
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
      }}
    >
      {content}
    </div>
  );
}
