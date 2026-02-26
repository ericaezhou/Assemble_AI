'use client';

import { useState, useEffect } from 'react';
import ResearcherRecommendations from './ResearcherRecommendations';
import EventCard from './EventCard';
import CreateEvent from './CreateEvent';
import JoinEvent from './JoinEvent';
import EventDetail from './EventDetail';
import MessagePanel from './MessagePanel';
import FloatingChatWindow from './FloatingChatWindow';
import MiniProfile from './profile/MiniProfile';
import TopNav from './layout/TopNav';
import { authenticatedFetch } from '@/utils/auth';
import { UserProfile, useUserStore } from '@/store/userStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Researcher {
  id: string;
  name: string;
  email: string;
  occupation?: string;
  school?: string;
  major?: string;
  year?: string;
  company?: string;
  title?: string;
  work_experience_years?: string;
  degree?: string;
  research_area?: string;
  other_description?: string;
  interest_areas?: string[];
  current_skills?: string[];
  hobbies?: string[];
  institution?: string;
  research_areas?: string;
  bio?: string;
  interests?: string;
  similarity_score?: number;
  match_reason?: string;
}

interface Event {
  id: string;
  name: string;
  location: string;
  location_type?: string;
  virtual_link?: string;
  start_date: string;
  start_time?: string;
  end_date: string;
  end_time?: string;
  is_host: number;
  host_name?: string;
  cover_photo_url?: string;
  price_type?: string;
  capacity?: number;
}

interface DashboardProps {
  user: UserProfile | null;
}

type ActiveView = 'events' | 'researchers';

function getMonthEmoji(monthIndex: number): string {
  const emojis = ['❄️','❄️','🌸','🌸','🌸','☀️','☀️','☀️','🍂','🍂','🍂','❄️'];
  return emojis[monthIndex];
}

function groupEventsByMonth(events: Event[]): { monthLabel: string; emoji: string; events: Event[] }[] {
  const groups: { monthLabel: string; emoji: string; events: Event[] }[] = [];
  for (const event of events) {
    const date = new Date(event.start_date + 'T12:00:00');
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last && last.monthLabel === label) {
      last.events.push(event);
    } else {
      groups.push({ monthLabel: label, emoji: getMonthEmoji(date.getMonth()), events: [event] });
    }
  }
  return groups;
}

function formatEventDateLabel(dateString: string): { main: string; sub: string } {
  const date = new Date(dateString + 'T12:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (d.getTime() === today.getTime()) return { main: 'Today', sub: dayName };
  if (d.getTime() === tomorrow.getTime()) return { main: 'Tomorrow', sub: dayName };
  return { main: shortDate, sub: dayName };
}


export default function Dashboard({ user }: DashboardProps) {
  const { unhideConversation } = useUserStore();
  const [activeView, setActiveView] = useState<ActiveView>('events');
  const [recommendations, setRecommendations] = useState<Researcher[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJoinEvent, setShowJoinEvent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [openConversationId, setOpenConversationId] = useState<number | null>(null);
  const [floatingChat, setFloatingChat] = useState<{ id: number; name: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('assemble-message-drafts');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem('assemble-message-drafts', JSON.stringify(drafts));
  }, [drafts]);
  const handleDraftChange = (conversationId: number, text: string) => {
    setDrafts(prev => ({ ...prev, [conversationId]: text }));
  };
  const [isRefreshingRecommendations, setIsRefreshingRecommendations] = useState(false);
  const [hasRequestedRecommendations, setHasRequestedRecommendations] = useState(false);
  const [naturalLanguagePreference, setNaturalLanguagePreference] = useState('');
  const [eventsFilter, setEventsFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Auto-load recommendations when Researchers tab is first opened
  useEffect(() => {
    if (activeView === 'researchers' && !hasRequestedRecommendations && user) {
      handleRefreshRecommendations('');
    }
  }, [activeView]);

  const fetchRecommendations = async (options?: {
    topK?: number;
    minScore?: number;
    applyMmr?: boolean;
    mmrLambda?: number;
    preferenceText?: string;
  }) => {
    if (!user) return;

    try {
      const params = new URLSearchParams({
        top_k: String(options?.topK ?? 3),
        min_score: String(options?.minScore ?? 0),
        apply_mmr: String(options?.applyMmr ?? true),
        mmr_lambda: String(options?.mmrLambda ?? 0.5),
      });
      const preferenceText = options?.preferenceText?.trim();
      if (preferenceText) {
        params.set('preference', preferenceText);
      }
      const response = await authenticatedFetch(`/api/researchers/${user.id}/recommendations?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        console.error('Recommendations request failed:', data?.error || response.statusText);
        setRecommendations([]);
        return;
      }
      if (!Array.isArray(data)) {
        console.error('Invalid recommendations payload:', data);
        setRecommendations([]);
        return;
      }
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setRecommendations([]);
    }
  };

  const handleRefreshRecommendations = async (naturalLanguagePreference: string) => {
    setIsRefreshingRecommendations(true);
    setHasRequestedRecommendations(true);
    try {
      await fetchRecommendations({
        topK: 3,
        minScore: 0,
        applyMmr: true,
        mmrLambda: 0.5,
        preferenceText: naturalLanguagePreference,
      });
    } finally {
      setIsRefreshingRecommendations(false);
    }
  };

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const response = await authenticatedFetch(`/api/researchers/${user.id}/conferences`);
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // Clipboard access denied - ignore
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSuccess = (eventId: string) => {
    setShowCreateEvent(false);
    fetchEvents();
    handleCopyId(eventId);
  };

  const handleJoinSuccess = () => {
    setShowJoinEvent(false);
    fetchEvents();
  };

  const groupEvents = () => {
    const now = new Date();
    const upcoming: Event[] = [];
    const current: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      // Append T00:00:00 / T23:59:59 to parse as local time, not UTC midnight
      const startDate = new Date(event.start_date + 'T00:00:00');
      const endDate = new Date((event.end_date || event.start_date) + 'T23:59:59');

      if (now < startDate) {
        upcoming.push(event);
      } else if (now >= startDate && now <= endDate) {
        current.push(event);
      } else {
        past.push(event);
      }
    });

    return { upcoming, current, past };
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
    fetchEvents();
  };

  const handleConnect = async (otherUserId: string, eventName?: string) => {
    if (!user) return;

    try {
      const body: Record<string, string> = {
        user1_id: user.id,
        user2_id: otherUserId,
      };
      if (eventName) body.event_name = eventName;

      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const conversation = await response.json();
      setOpenConversationId(conversation.id);
    } catch (err) {
      console.error('Error creating/getting conversation:', err);
    }
  };

  const { upcoming, current, past } = groupEvents();

  // Show event detail page if an event is selected — same 3-column layout
  if (selectedEventId && user) {
    return (
      <div className="h-screen bg-[#f3f2ef] flex flex-col overflow-hidden">
        <TopNav currentView="home" />
        <div className="flex flex-1 overflow-hidden">
          {/* Blank left margin ~15% */}
          <div className="hidden lg:block w-[8%] flex-shrink-0" />

          {/* Left 15%: back button + cover image */}
          <div className="hidden lg:flex w-[20%] flex-shrink-0 px-4 pt-5 pb-4 flex-col gap-3">
            <button
              onClick={handleBackToEvents}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-colors self-start"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            {(() => {
              const coverUrl = events.find(e => e.id === selectedEventId)?.cover_photo_url;
              return coverUrl ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden aspect-[3/4]">
                  <img src={coverUrl} alt="Event cover" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden aspect-[3/4] flex flex-col items-center justify-center gap-3 text-gray-300">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-gray-400">Cover photo</span>
                </div>
              );
            })()}
          </div>

          {/* Center 45%: event detail fills and scrolls naturally */}
          <div className="w-[50%] flex-shrink-0 overflow-y-auto">
            <EventDetail
              eventId={selectedEventId}
              userId={user.id}
              onBack={handleBackToEvents}
              onConnect={(researcherId, eventName) => handleConnect(researcherId, eventName)}
            />
          </div>

          {/* Right 20%: message panel (same as normal view) */}
          {user && (
            <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-5 pb-4">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[calc(100vh-84px)]">
                <MessagePanel
                  currentUser={user}
                  openConversationId={openConversationId}
                  onConversationOpened={() => setOpenConversationId(null)}
                  onOpenChat={(id, name) => { unhideConversation(id); setFloatingChat({ id, name }); }}
                  drafts={drafts}
                  className="h-full flex flex-col bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {floatingChat && (
          <FloatingChatWindow
            conversationId={floatingChat.id}
            otherUserName={floatingChat.name}
            currentUser={user}
            draft={drafts[floatingChat.id] || ''}
            onDraftChange={handleDraftChange}
            onClose={() => setFloatingChat(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f3f2ef] flex flex-col overflow-hidden">
      <TopNav currentView="home" />

      <div className="flex flex-1 overflow-hidden">

        {/* Blank left margin ~15% */}
        <div className="hidden lg:block w-[8%] flex-shrink-0" />

        {/* Left 15%: profile card */}
        <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-5">
          {user && <MiniProfile user={user} />}
        </div>

        {/* Center 45%: tab card pinned, cards scroll below */}
        <div className="w-[50%] flex-shrink-0 flex flex-col overflow-hidden">

          {/* Fixed: tab + action card */}
          <div className="flex-shrink-0 px-3 pt-5 pb-3">
            <div className="bg-white rounded-xl shadow-sm">
              {/* Tabs row */}
              <div className="flex px-2 border-b border-gray-100">
                <button
                  onClick={() => setActiveView('events')}
                  className={`px-5 py-3 text-sm font-semibold transition-colors ${
                    activeView === 'events'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setActiveView('researchers')}
                  className={`px-5 py-3 text-sm font-semibold transition-colors ${
                    activeView === 'researchers'
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  People
                </button>
              </div>
              {/* Create/Join actions (events) or People search bar */}
              {activeView === 'events' ? (
                <div className="px-4 py-3 flex gap-3">
                  <button
                    onClick={() => setShowCreateEvent(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-colors"
                  >
                    + Create Event
                  </button>
                  <button
                    onClick={() => setShowJoinEvent(true)}
                    className="px-4 py-2 border border-indigo-600 text-indigo-600 text-sm font-semibold rounded-full hover:bg-indigo-50 transition-colors"
                  >
                    Join Event
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Who's on your mind today?"
                    value={naturalLanguagePreference}
                    onChange={(e) => setNaturalLanguagePreference(e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full text-sm text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleRefreshRecommendations(naturalLanguagePreference)}
                    disabled={isRefreshingRecommendations}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshingRecommendations ? 'Finding...' : 'Find'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable: only cards scroll */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
            {copiedId && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm shadow-sm">
                Event ID copied to clipboard!
              </div>
            )}
            {activeView === 'events' ? (
              <>
                {/* Upcoming / Past pill toggle */}
                <div className="inline-flex items-center bg-gray-100 rounded-full p-1 mb-1">
                  <button
                    onClick={() => setEventsFilter('upcoming')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${
                      eventsFilter === 'upcoming'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => setEventsFilter('past')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${
                      eventsFilter === 'past'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Past
                  </button>
                </div>

                {eventsFilter === 'upcoming' ? (
                  [...current, ...upcoming].length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 text-sm">
                      No upcoming events. Create or join an event to get started!
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupEventsByMonth([...current, ...upcoming]).map(group => (
                        <div key={group.monthLabel}>
                          <h3 className="text-xl font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                            <span>{group.emoji}</span> {group.monthLabel}
                          </h3>
                          <div className="relative">
                            <div className="absolute right-32 top-4 bottom-4 w-px bg-gray-200" />
                            <div className="space-y-10">
                              {group.events.map(event => {
                                const dl = formatEventDateLabel(event.start_date);
                                return (
                                  <div key={event.id} className="flex items-start">
                                    <div className="flex-1 min-w-0 mr-3">
                                      <EventCard event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                                    </div>
                                    <div className="w-8 flex-shrink-0 flex justify-center pt-4 z-10 relative">
                                      <div className="w-3 h-3 rounded-full bg-indigo-400 ring-2 ring-indigo-100" />
                                    </div>
                                    <div className="w-28 flex-shrink-0 pt-2">
                                      <p className="font-bold text-gray-800 text-lg leading-tight">{dl.main}</p>
                                      <p className="text-sm text-gray-400 mt-0.5">{dl.sub}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  past.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 text-sm">
                      No past events yet.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupEventsByMonth(past).map(group => (
                        <div key={group.monthLabel}>
                          <h3 className="text-xl font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                            <span>{group.emoji}</span> {group.monthLabel}
                          </h3>
                          <div className="relative">
                            <div className="absolute right-32 top-4 bottom-4 w-px bg-gray-200" />
                            <div className="space-y-5">
                              {group.events.map(event => {
                                const dl = formatEventDateLabel(event.start_date);
                                return (
                                  <div key={event.id} className="flex items-start">
                                    <div className="flex-1 min-w-0 mr-3">
                                      <EventCard event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                                    </div>
                                    <div className="w-8 flex-shrink-0 flex justify-center pt-4 z-10 relative">
                                      <div className="w-3 h-3 rounded-full bg-indigo-400 ring-2 ring-indigo-100" />
                                    </div>
                                    <div className="w-28 flex-shrink-0 pt-2">
                                      <p className="font-bold text-gray-800 text-lg leading-tight">{dl.main}</p>
                                      <p className="text-sm text-gray-400 mt-0.5">{dl.sub}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            ) : (
              <ResearcherRecommendations
                researchers={recommendations}
                currentUserId={user?.id || ''}
                onConnect={handleConnect}
                hasRequestedRecommendations={hasRequestedRecommendations}
              />
            )}
          </div>
        </div>

        {/* Right 20%: messaging panel in inset card */}
        {user && (
          <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-5 pb-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[calc(100vh-84px)]">
              <MessagePanel
                currentUser={user}
                openConversationId={openConversationId}
                onConversationOpened={() => setOpenConversationId(null)}
                onOpenChat={(id, name) => { unhideConversation(id); setFloatingChat({ id, name }); }}
                drafts={drafts}
                className="h-full flex flex-col bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {showCreateEvent && user && (
        <CreateEvent
          userId={user.id}
          onClose={() => setShowCreateEvent(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showJoinEvent && user && (
        <JoinEvent
          userId={user.id}
          onClose={() => setShowJoinEvent(false)}
          onSuccess={handleJoinSuccess}
        />
      )}

      {/* Floating LinkedIn-style chat window */}
      {floatingChat && user && (
        <FloatingChatWindow
          conversationId={floatingChat.id}
          otherUserName={floatingChat.name}
          currentUser={user}
          draft={drafts[floatingChat.id] || ''}
          onDraftChange={handleDraftChange}
          onClose={() => setFloatingChat(null)}
        />
      )}
    </div>
  );
}
