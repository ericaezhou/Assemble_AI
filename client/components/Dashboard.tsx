'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ResearcherRecommendations from './ResearcherRecommendations';
import EventCard from './EventCard';
import CreateEvent from './CreateEvent';
import JoinEvent from './JoinEvent';
import EventDetail from './EventDetail';
import MessagePanel from './MessagePanel';
import MiniProfile from './profile/MiniProfile';
import TopNav from './layout/TopNav';
import EventCoverFallback from './EventCoverFallback';
import { useAuthSWR } from '@/hooks/useAuthSWR';
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
  exp_similarity?: number;
  interest_similarity?: number;
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
  const { unhideConversation, setFloatingChat, chatDrafts } = useUserStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventFromUrl = searchParams.get('event');
  const [activeView, setActiveView] = useState<ActiveView>('events');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJoinEvent, setShowJoinEvent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventFromUrl);
  const [openConversationId, setOpenConversationId] = useState<number | null>(null);
  const [naturalLanguagePreference, setNaturalLanguagePreference] = useState('');
  const [eventsFilter, setEventsFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [peopleSearchMode, setPeopleSearchMode] = useState<'ai' | 'keyword'>('ai');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState<string | null>(null);
  // Track the submitted preference to use as SWR key
  const [submittedPreference, setSubmittedPreference] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEventId(eventFromUrl);
  }, [eventFromUrl]);

  // SWR: events
  const { data: events = [], mutate: mutateEvents } = useAuthSWR<Event[]>(
    user ? `/api/researchers/${user.id}/conferences` : null
  );

  // SWR: recommendations (fetched when Researchers tab opened or search submitted)
  const recommendationsKey = submittedPreference !== null && user
    ? (() => {
        const params = new URLSearchParams({
          top_k: '3', min_score: '0', apply_mmr: 'true', mmr_lambda: '0.5',
        });
        if (submittedPreference.trim()) params.set('preference', submittedPreference.trim());
        return `/api/researchers/${user.id}/recommendations?${params.toString()}`;
      })()
    : null;

  const {
    data: recommendations = [],
    isValidating: isRefreshingRecommendations,
  } = useAuthSWR<Researcher[]>(recommendationsKey);

  // SWR: keyword search results
  const { data: keywordResults = [], isValidating: isKeywordSearching } = useAuthSWR<Researcher[]>(
    submittedKeyword !== null && submittedKeyword.trim()
      ? `/api/researchers/search/${encodeURIComponent(submittedKeyword.trim())}`
      : null
  );
  const displayedKeywordResults = keywordResults.filter(r => r.id !== user?.id);

  // Auto-load recommendations when Researchers tab is first opened
  useEffect(() => {
    if (activeView === 'researchers' && submittedPreference === null && user) {
      setSubmittedPreference('');
    }
  }, [activeView, submittedPreference, user]);

  const handleRefreshRecommendations = async (preference: string) => {
    setSubmittedPreference(preference);
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
    mutateEvents();
    handleCopyId(eventId);
  };

  const handleJoinSuccess = () => {
    setShowJoinEvent(false);
    mutateEvents();
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
    router.push(`/?event=${eventId}`, { scroll: false });
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
    router.replace('/', { scroll: false });
    mutateEvents();
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
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <TopNav currentView="home" />
        <div className="flex flex-1 overflow-hidden">
          {/* Blank left margin ~15% */}
          <div className="hidden lg:block w-[8%] flex-shrink-0" />

          {/* Left 15%: back button + cover image */}
          <div className="hidden lg:flex w-[20%] flex-shrink-0 px-4 pt-8 pb-4 flex-col gap-3">
            <button
              onClick={handleBackToEvents}
              className="btn-ghost flex items-center gap-1.5 text-sm font-semibold self-start"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            {(() => {
              const coverUrl = events.find(e => e.id === selectedEventId)?.cover_photo_url;
              const eventName = events.find(e => e.id === selectedEventId)?.name || '';
              return (
                <div className="card overflow-hidden aspect-[3/4]" style={{ border: 'none' }}>
                  {coverUrl
                    ? <img src={coverUrl} alt="Event cover" className="w-full h-full object-cover" />
                    : <EventCoverFallback eventName={eventName} />
                  }
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
            <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-8 pb-4">
              <div className="card overflow-hidden h-[calc(100vh-84px)]" style={{ cursor: 'default' }}>
                <MessagePanel
                  currentUser={user}
                  openConversationId={openConversationId}
                  onConversationOpened={() => setOpenConversationId(null)}
                  onOpenChat={(id, name, userId, avatarUrl) => { unhideConversation(id); setFloatingChat({ id, name, userId, avatarUrl }); }}
                  drafts={chatDrafts}
                  className="h-full flex flex-col"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <TopNav currentView="home" />

      <div className="flex flex-1 overflow-hidden">

        {/* Blank left margin */}
        <div className="hidden lg:block w-[8%] flex-shrink-0" />

        {/* Left: profile card */}
        <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-8">
          {user && <MiniProfile user={user} />}
        </div>

        {/* Center: tab card pinned, cards scroll below */}
        <div className="w-[50%] flex-shrink-0 flex flex-col overflow-hidden">

          {/* Fixed: tab + action card */}
          <div className="flex-shrink-0 px-3 pt-8 pb-3">
            <div className="card" style={{ boxShadow: 'var(--shadow-card)' }}>
              {/* Tabs row */}
              <div className="flex px-2" style={{ borderBottom: '2px solid var(--border-light)' }}>
                {(['events', 'researchers'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className="relative px-5 py-3 text-sm font-bold transition-colors capitalize"
                    style={{ color: activeView === view ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    {view === 'events' ? 'Events' : 'People'}
                    {activeView === view && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5" style={{ background: 'var(--accent)' }} />
                    )}
                  </button>
                ))}
              </div>

              {/* Action row */}
              {activeView === 'events' ? (
                <div className="px-4 py-4 flex gap-2">
                  <button onClick={() => setShowCreateEvent(true)} className="btn btn-primary">
                    + Create Event
                  </button>
                  <button onClick={() => setShowJoinEvent(true)} className="btn btn-secondary">
                    Join Event
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-2">
                  {/* Mode toggle */}
                  <div
                    className="inline-flex items-center rounded-full p-0.5 text-xs font-semibold cursor-pointer select-none"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border-light)' }}
                  >
                    {(['ai', 'keyword'] as const).map(mode => (
                      <span
                        key={mode}
                        onClick={() => setPeopleSearchMode(mode)}
                        className="px-3 py-1 rounded-full capitalize transition-all"
                        style={peopleSearchMode === mode
                          ? { background: 'var(--accent)', color: '#fff' }
                          : { color: 'var(--text-muted)', cursor: 'pointer' }
                        }
                      >
                        {mode === 'ai' ? 'AI Match' : 'Keyword'}
                      </span>
                    ))}
                  </div>

                  {/* Search input row */}
                  {peopleSearchMode === 'ai' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Who's on your mind today?"
                        value={naturalLanguagePreference}
                        onChange={(e) => setNaturalLanguagePreference(e.target.value)}
                        className="input flex-1"
                        style={{ borderRadius: '6px', borderColor: 'var(--border-light)' }}
                      />
                      <button
                        onClick={() => handleRefreshRecommendations(naturalLanguagePreference)}
                        disabled={isRefreshingRecommendations}
                        className="btn btn-primary"
                        style={{ opacity: isRefreshingRecommendations ? 0.6 : 1 }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isRefreshingRecommendations ? 'Finding...' : 'Find'}
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={e => { e.preventDefault(); setSubmittedKeyword(keywordQuery); }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Search by name or school..."
                        value={keywordQuery}
                        onChange={e => setKeywordQuery(e.target.value)}
                        className="input flex-1"
                        style={{ borderRadius: '6px', borderColor: 'var(--border-light)' }}
                      />
                      <button
                        type="submit"
                        disabled={isKeywordSearching}
                        className="btn btn-primary"
                        style={{ opacity: isKeywordSearching ? 0.6 : 1 }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {isKeywordSearching ? 'Searching...' : 'Search'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
            {copiedId && (
              <div className="card-flat px-4 py-3 text-sm font-semibold" style={{ color: '#059669', borderColor: '#6ee7b7' }}>
                ✓ Event ID copied to clipboard!
              </div>
            )}
            {activeView === 'events' ? (
              <>
                {/* Upcoming / Past toggle */}
                <div
                  className="inline-flex items-center rounded-full p-0.5 text-xs font-semibold cursor-pointer select-none"
                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border-light)' }}
                  onClick={() => setEventsFilter(f => f === 'upcoming' ? 'past' : 'upcoming')}
                >
                  {(['upcoming', 'past'] as const).map(f => (
                    <span
                      key={f}
                      className="px-3 py-1 rounded-full capitalize transition-all"
                      style={eventsFilter === f
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { color: 'var(--text-muted)' }
                      }
                    >
                      {f}
                    </span>
                  ))}
                </div>

                {eventsFilter === 'upcoming' ? (
                  [...current, ...upcoming].length === 0 ? (
                    <div className="card-flat p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No upcoming events. Create or join one to get started!
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupEventsByMonth([...current, ...upcoming]).map(group => (
                        <div key={group.monthLabel}>
                          <h3 className="text-base font-black mb-3 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                            <span>{group.emoji}</span>
                            <span style={{ borderBottom: '2px solid var(--accent)', paddingBottom: '1px' }}>{group.monthLabel}</span>
                          </h3>
                          <div className="relative">
                            <div className="absolute right-32 top-4 bottom-4 w-0.5" style={{ background: 'var(--border-light)' }} />
                            <div className="space-y-10">
                              {group.events.map(event => {
                                const dl = formatEventDateLabel(event.start_date);
                                return (
                                  <div key={event.id} className="flex items-start">
                                    <div className="flex-1 min-w-0 mr-3">
                                      <EventCard event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                                    </div>
                                    <div className="w-8 flex-shrink-0 flex justify-center pt-4 z-10 relative">
                                      <div className="w-3 h-3 rounded-full border-2" style={{ background: 'var(--accent)', borderColor: 'var(--border)' }} />
                                    </div>
                                    <div className="w-28 flex-shrink-0 pt-2">
                                      <p className="font-black text-lg leading-tight" style={{ color: 'var(--text)' }}>{dl.main}</p>
                                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{dl.sub}</p>
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
                    <div className="card-flat p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No past events yet.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupEventsByMonth(past).map(group => (
                        <div key={group.monthLabel}>
                          <h3 className="text-base font-black mb-3 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                            <span>{group.emoji}</span>
                            <span style={{ borderBottom: '2px solid var(--accent)', paddingBottom: '1px' }}>{group.monthLabel}</span>
                          </h3>
                          <div className="relative">
                            <div className="absolute right-32 top-4 bottom-4 w-0.5" style={{ background: 'var(--border-light)' }} />
                            <div className="space-y-5">
                              {group.events.map(event => {
                                const dl = formatEventDateLabel(event.start_date);
                                return (
                                  <div key={event.id} className="flex items-start">
                                    <div className="flex-1 min-w-0 mr-3">
                                      <EventCard event={event} onCopyId={handleCopyId} onClick={handleEventClick} />
                                    </div>
                                    <div className="w-8 flex-shrink-0 flex justify-center pt-4 z-10 relative">
                                      <div className="w-3 h-3 rounded-full border-2" style={{ background: 'var(--text-muted)', borderColor: 'var(--border)' }} />
                                    </div>
                                    <div className="w-28 flex-shrink-0 pt-2">
                                      <p className="font-black text-lg leading-tight" style={{ color: 'var(--text)' }}>{dl.main}</p>
                                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{dl.sub}</p>
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
            ) : peopleSearchMode === 'keyword' ? (
              <ResearcherRecommendations
                researchers={displayedKeywordResults}
                currentUserId={user?.id || ''}
                onConnect={handleConnect}
                hasRequestedRecommendations={submittedKeyword !== null && submittedKeyword.trim().length > 0}
              />
            ) : (
              <ResearcherRecommendations
                researchers={recommendations}
                currentUserId={user?.id || ''}
                onConnect={handleConnect}
                hasRequestedRecommendations={submittedPreference !== null}
              />
            )}
          </div>
        </div>

        {/* Right: messaging panel */}
        {user && (
          <div className="hidden lg:block w-[20%] flex-shrink-0 px-4 pt-8 pb-4">
            <div className="card overflow-hidden h-[calc(100vh-84px)]" style={{ cursor: 'default' }}>
              <MessagePanel
                currentUser={user}
                openConversationId={openConversationId}
                onConversationOpened={() => setOpenConversationId(null)}
                onOpenChat={(id, name, userId, avatarUrl) => { unhideConversation(id); setFloatingChat({ id, name, userId, avatarUrl }); }}
                drafts={chatDrafts}
                className="h-full flex flex-col"
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
