'use client';

import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import ResearcherRecommendations from './ResearcherRecommendations';
import EventCard from './EventCard';
import CreateEvent from './CreateEvent';
import JoinEvent from './JoinEvent';
import EventDetail from './EventDetail';
import Chat from './Chat';
import MiniProfile from './profile/MiniProfile';
import TopNav from './layout/TopNav';
import { authenticatedFetch } from '@/utils/auth';
import { UserProfile } from '@/store/userStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Researcher {
  id: string; // UUID from Supabase Auth
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

interface Conversation {
  id: number; // Conversation IDs are still bigint/number from database
  other_user_id: string; // User IDs are now UUIDs
  other_user_name: string;
  last_message: string;
  last_message_time: string;
}

interface DashboardProps {
  user: UserProfile | null;
}

type ActiveView = 'events' | 'researchers' | 'connections';

export default function Dashboard({ user }: DashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('events');
  const [recommendations, setRecommendations] = useState<Researcher[]>([]);
  const [searchResults, setSearchResults] = useState<Researcher[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJoinEvent, setShowJoinEvent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<{ id: number; otherUserName: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
      fetchEvents();
      fetchConversations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      const response = await authenticatedFetch(`/api/researchers/${user.id}/recommendations`);
      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
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

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations/user/${user.id}`);
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
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

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/researchers/search/${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.filter((r: Researcher) => r.id !== user?.id));
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleBackToEvents = () => {
    setSelectedEventId(null);
    fetchEvents();
  };

  const handleConnect = async (otherUserId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user1_id: user.id,
          user2_id: otherUserId
        })
      });

      const conversation = await response.json();

      const otherUser = [...recommendations, ...searchResults].find((r: Researcher) => r.id === otherUserId);

      if (otherUser) {
        setActiveConversation({
          id: conversation.id,
          otherUserName: otherUser.name
        });
        fetchConversations();
      }
    } catch (err) {
      console.error('Error creating/getting conversation:', err);
    }
  };

  const handleSelectResearcher = (researcher: Researcher) => {
    handleConnect(researcher.id);
  };

  const handleOpenConversation = (conversationId: number, otherUserName: string) => {
    setActiveConversation({ id: conversationId, otherUserName });
  };

  const handleBackToDashboard = () => {
    setActiveConversation(null);
    fetchConversations();
  };

  const { upcoming, current, past } = groupEvents();

  // Show chat if a conversation is active
  if (activeConversation && user) {
    return (
      <Chat
        conversationId={activeConversation.id}
        currentUserId={user.id}
        otherUserName={activeConversation.otherUserName}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Show event detail page if an event is selected
  if (selectedEventId && user) {
    return (
      <EventDetail
        eventId={selectedEventId}
        userId={user.id}
        onBack={handleBackToEvents}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav currentView="home" />

      <div className="max-w-7xl mx-auto p-5 md:p-10 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Profile</h2>
          {user && <MiniProfile user={user} />}
        </div>

        <div>
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
            <button
              onClick={() => setActiveView('connections')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeView === 'connections'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Connections
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
                          <EventCard
                            key={event.id}
                            event={event}
                            onCopyId={handleCopyId}
                            onClick={handleEventClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {upcoming.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {upcoming.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onCopyId={handleCopyId}
                            onClick={handleEventClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {past.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Past</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {past.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onCopyId={handleCopyId}
                            onClick={handleEventClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeView === 'researchers' ? (
            <>
              <ResearcherRecommendations
                researchers={recommendations}
                currentUserId={user?.id || ''}
                title="Recommended for You"
                onConnect={handleConnect}
              />

              <div>
                <SearchBar
                  onSearch={handleSearch}
                  searchResults={searchResults}
                  isSearching={isSearching}
                  onSelectResearcher={handleSelectResearcher}
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-5">Your Connections</h2>

              {conversations.length === 0 ? (
                <div className="bg-white rounded-xl p-10 text-center">
                  <p className="text-gray-600">No conversations yet.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Click &quot;Connect&quot; on a researcher&apos;s profile to start chatting!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map(conversation => (
                    <div
                      key={conversation.id}
                      onClick={() => handleOpenConversation(conversation.id, conversation.other_user_name)}
                      className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{conversation.other_user_name}</h3>
                        <span className="text-xs text-gray-400">
                          {conversation.last_message_time && new Date(conversation.last_message_time).toLocaleDateString()}
                        </span>
                      </div>
                      {conversation.last_message && (
                        <p className="text-gray-600 text-sm truncate">
                          {conversation.last_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
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
