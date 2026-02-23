'use client';

import { useState } from 'react';

interface Conference {
  id: string;
  name: string;
  description?: string;
  location?: string;
  location_type: string;
  virtual_link?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  host_id: string;
  is_host: number;
  capacity?: number;
  price_type?: string;
}

interface EventsPanelProps {
  events: Conference[];
  isOwnProfile: boolean;
  userName: string;
}

function formatEventDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getActivityLevel(total: number): { label: string; color: string; emoji: string } {
  if (total === 0) return { label: 'Just Getting Started', color: 'text-gray-500', emoji: '🌱' };
  if (total <= 2) return { label: 'Event Explorer', color: 'text-blue-600', emoji: '🧭' };
  if (total <= 5) return { label: 'Community Regular', color: 'text-indigo-600', emoji: '⭐' };
  if (total <= 10) return { label: 'Community Builder', color: 'text-purple-600', emoji: '🔥' };
  return { label: 'Super Connector', color: 'text-pink-600', emoji: '💫' };
}

export default function EventsPanel({ events, isOwnProfile, userName }: EventsPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'hosted' | 'attended'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hostedEvents = events.filter(e => e.is_host === 1);
  const attendedEvents = events.filter(e => e.is_host === 0);

  const upcoming = events.filter(e => {
    if (!e.start_date) return false;
    const d = new Date(e.start_date);
    return !isNaN(d.getTime()) && d >= today;
  });

  const past = events.filter(e => {
    if (!e.start_date) return true;
    const d = new Date(e.start_date);
    return isNaN(d.getTime()) || d < today;
  });

  const displayEvents = activeTab === 'hosted'
    ? hostedEvents
    : activeTab === 'attended'
    ? attendedEvents
    : events;

  const activityLevel = getActivityLevel(events.length);
  const firstName = userName.split(' ')[0];

  return (
    <div className="space-y-4 sticky top-6">
      {/* Stats Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{activityLevel.emoji}</span>
            <span className="text-white/90 text-sm font-semibold tracking-wide uppercase">
              {activityLevel.label}
            </span>
          </div>
          <p className="text-white/70 text-xs mb-5">
            {isOwnProfile ? 'Your event journey' : `${firstName}'s event journey`}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-white/70 text-xs mt-0.5">Total</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{hostedEvents.length}</div>
              <div className="text-white/70 text-xs mt-0.5">Hosted</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{attendedEvents.length}</div>
              <div className="text-white/70 text-xs mt-0.5">Attended</div>
            </div>
          </div>

          {upcoming.length > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse flex-shrink-0" />
              <span className="text-sm text-white/90">
                {upcoming.length} upcoming event{upcoming.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Events Card */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'all', label: 'All Events', count: events.length },
            { key: 'hosted', label: 'Hosted', count: hostedEvents.length },
            { key: 'attended', label: 'Attended', count: attendedEvents.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'all' | 'hosted' | 'attended')}
              className={`flex-1 py-3 text-xs font-semibold transition-colors relative ${
                activeTab === tab.key
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {displayEvents.length === 0 ? (
          <div className="py-8 px-6 text-center">
            <div className="text-3xl mb-2">
              {activeTab === 'hosted' ? '🎪' : activeTab === 'attended' ? '🎫' : '📅'}
            </div>
            <p className="text-gray-400 text-sm">No events yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Upcoming section */}
            {activeTab === 'all' && upcoming.length > 0 && (
              <>
                <div className="px-5 py-2 bg-green-50">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Upcoming
                  </span>
                </div>
                {upcoming.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
                {past.filter(e => displayEvents.includes(e)).length > 0 && (
                  <div className="px-5 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Past</span>
                  </div>
                )}
              </>
            )}

            {/* Past / all events */}
            {(activeTab !== 'all'
              ? displayEvents
              : past.filter(e => events.includes(e))
            ).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: Conference }) {
  const isHosted = event.is_host === 1;
  const isVirtual = event.location_type === 'virtual';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = event.start_date ? new Date(event.start_date) : null;
  const isUpcoming = eventDate && !isNaN(eventDate.getTime()) && eventDate >= today;

  return (
    <div className={`px-5 py-4 hover:bg-gray-50 transition-colors flex gap-3 items-start`}>
      {/* Color accent */}
      <div className={`mt-1 w-1 flex-shrink-0 self-stretch rounded-full ${
        isHosted
          ? 'bg-gradient-to-b from-indigo-400 to-purple-500'
          : isUpcoming
          ? 'bg-gradient-to-b from-green-400 to-emerald-500'
          : 'bg-gray-200'
      }`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{event.name}</p>
          <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
            isHosted
              ? 'bg-indigo-50 text-indigo-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}>
            {isHosted ? '👑 Host' : '✓ Attended'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {event.start_date && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatEventDate(event.start_date)}
            </span>
          )}
          {(event.location || isVirtual) && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {isVirtual ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Virtual
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </>
              )}
            </span>
          )}
          {event.price_type === 'free' && (
            <span className="text-xs text-green-600 font-medium">Free</span>
          )}
        </div>
      </div>
    </div>
  );
}
