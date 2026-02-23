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
import { UserProfile } from '@/store/userStore';

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
  price_type?: string;
  capacity?: number;
}

interface DashboardProps {
  user: UserProfile | null;
}

type ActiveView = 'events' | 'researchers';

// ── Event Cover Card (Luma-style left sidebar for event view) ──────────────

function getEventGradient(name: string): string {
  const gradients = [
    'from-indigo-500 via-purple-600 to-pink-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-orange-400 via-amber-500 to-yellow-400',
    'from-rose-500 via-pink-500 to-fuchsia-500',
    'from-blue-500 via-indigo-500 to-violet-600',
    'from-green-500 via-emerald-500 to-teal-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function formatSidebarDate(dateStr: string, timeStr?: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  return timeStr ? `${formatted} · ${timeStr}` : formatted;
}

function EventCoverCard({ event }: { event: Event }) {
  const isHost = event.is_host === 1;
  const isVirtual = event.location_type === 'virtual';
  const gradient = getEventGradient(event.name);
  const initial = event.name.charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Cover image */}
      <div className={`bg-gradient-to-br ${gradient} h-32 flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-3 right-3 w-20 h-20 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
        <div className="absolute bottom-2 left-4 w-14 h-14 bg-white/10 rounded-full translate-y-4 -translate-x-2" />
        <span className="relative text-5xl font-black text-white/80 select-none">{initial}</span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-900 leading-tight">{event.name}</h3>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatSidebarDate(event.start_date, event.start_time)}</span>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-600">
            {isVirtual ? (
              <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            <span>{isVirtual ? 'Virtual Event' : event.location || 'Location TBD'}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg w-full justify-center ${
          isHost
            ? 'bg-indigo-50 text-indigo-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}>
          {isHost ? (
            <>
              <span>👑</span>
              <span>You&apos;re hosting</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>You&apos;re attending</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ user }: DashboardProps) {
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
  }) => {
    if (!user) return;

    try {
      const params = new URLSearchParams({
        top_k: String(options?.topK ?? 3),
        min_score: String(options?.minScore ?? 0),
        apply_mmr: String(options?.applyMmr ?? true),
        mmr_lambda: String(options?.mmrLambda ?? 0.5),
      });
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

  const handleRefreshRecommendations = async (_naturalLanguagePreference: string) => {
    setIsRefreshingRecommendations(true);
    setHasRequestedRecommendations(true);
    try {
      await fetchRecommendations({
        topK: 3,
        minScore: 0,
        applyMmr: true,
        mmrLambda: 0.5,
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
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

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
    const selectedEvent = events.find(e => e.id === selectedEventId);
    return (
      <div className="h-screen bg-[#f3f2ef] flex flex-col overflow-hidden">
        <TopNav currentView="home" />
        <div className="flex flex-1 overflow-hidden">
          {/* Left 20%: back button + Luma-style event cover card */}
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
            {selectedEvent && <EventCoverCard event={selectedEvent} />}
          </div>

          {/* Center 60%: event detail fills and scrolls naturally */}
          <div className="w-[60%] flex-shrink-0 overflow-y-auto">
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
                  onOpenChat={(id, name) => setFloatingChat({ id, name })}
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

        {/* Left 20%: profile card, inset from edges */}
        <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-5">
          {user && <MiniProfile user={user} />}
        </div>

        {/* Center 60%: tab card pinned, cards scroll below */}
        <div className="w-[60%] flex-shrink-0 flex flex-col overflow-hidden">

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
                  Researchers
                </button>
              </div>
              {/* Create/Join actions (events only) */}
              {activeView === 'events' && (
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
              events.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 text-sm">
                  No events yet. Create or join an event to get started!
                </div>
              ) : (
                <div className="space-y-6">
                  {current.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Current</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {current.map(event => (
                          <EventCard key={event.id} event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                        ))}
                      </div>
                    </div>
                  )}
                  {upcoming.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Upcoming</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {upcoming.map(event => (
                          <EventCard key={event.id} event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                        ))}
                      </div>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Past</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {past.map(event => (
                          <EventCard key={event.id} event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <ResearcherRecommendations
                researchers={recommendations}
                currentUserId={user?.id || ''}
                title="Recommended for You"
                onConnect={handleConnect}
                onRefreshRecommendations={handleRefreshRecommendations}
                isRefreshingRecommendations={isRefreshingRecommendations}
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
                onOpenChat={(id, name) => setFloatingChat({ id, name })}
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
