'use client';

import { useState, useEffect } from 'react';
import ResearcherRecommendations from './ResearcherRecommendations';
import EventCard from './EventCard';
import CreateEvent from './CreateEvent';
import JoinEvent from './JoinEvent';
import EventDetail from './EventDetail';
import MessagePanel from './MessagePanel';
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

export default function Dashboard({ user }: DashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('events');
  const [recommendations, setRecommendations] = useState<Researcher[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJoinEvent, setShowJoinEvent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [openConversationId, setOpenConversationId] = useState<number | null>(null);
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

  // Show event detail page if an event is selected
  if (selectedEventId && user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav currentView="home" />
        <EventDetail
          eventId={selectedEventId}
          userId={user.id}
          onBack={handleBackToEvents}
          onConnect={(researcherId, eventName) => handleConnect(researcherId, eventName)}
        />
        {/* Keep MessagePanel accessible while viewing event */}
        <div className="fixed right-5 bottom-5 w-[300px] z-40">
          <MessagePanel
            currentUser={user}
            openConversationId={openConversationId}
            onConversationOpened={() => setOpenConversationId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav currentView="home" />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Profile sidebar — static, never scrolls */}
        <div className="hidden lg:block w-[240px] flex-shrink-0 p-5 pt-8">
          {user && <MiniProfile user={user} />}
        </div>

        {/* Center: Main scrollable content */}
        <div className="flex-1 min-w-0 overflow-y-auto p-5 md:p-8">
          <div className="flex gap-3 mb-5 border-b border-gray-200">
            <button
              onClick={() => setActiveView('events')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeView === 'events'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveView('researchers')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeView === 'researchers'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Researchers
            </button>
          </div>

          {activeView === 'events' ? (
            <>
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  Create Event
                </button>
                <button
                  onClick={() => setShowJoinEvent(true)}
                  className="px-5 py-2.5 border-2 border-indigo-500 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Join Event
                </button>
              </div>

              {copiedId && (
                <div className="mb-5 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                  Event ID copied to clipboard!
                </div>
              )}

              {events.length === 0 ? (
                <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
                  No events yet. Create or join an event to get started!
                </p>
              ) : (
                <div className="space-y-8">
                  {current.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Current</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {current.map(event => (
                          <EventCard key={event.id} event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                        ))}
                      </div>
                    </div>
                  )}
                  {upcoming.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {upcoming.map(event => (
                          <EventCard key={event.id} event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                        ))}
                      </div>
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Past</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {past.map(event => (
                          <EventCard key={event.id} event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
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

        {/* Right: Persistent MessagePanel — true right sidebar */}
        {user && (
          <div className="hidden lg:block w-[300px] flex-shrink-0 border-l border-gray-200 bg-white">
            <div className="sticky top-16 h-[calc(100vh-64px)]">
              <MessagePanel
                currentUser={user}
                openConversationId={openConversationId}
                onConversationOpened={() => setOpenConversationId(null)}
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
    </div>
  );
}
