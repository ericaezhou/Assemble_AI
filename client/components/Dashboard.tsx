'use client';

import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import ResearcherCard from './ResearcherCard';
import ConferenceCard from './ConferenceCard';
import CreateConference from './CreateConference';
import JoinConference from './JoinConference';
import ConferenceDetail from './ConferenceDetail';
import Chat from './Chat';

interface Researcher {
  id: number;
  name: string;
  email: string;
  institution: string;
  research_areas: string;
  bio: string;
  interests: string;
  similarity_score?: number;
}

interface Conference {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  is_host: number;
}

interface Conversation {
  id: number;
  other_user_id: number;
  other_user_name: string;
  last_message: string;
  last_message_time: string;
}

interface DashboardProps {
  user: Researcher | null;
  onLogout: () => void;
}

type ActiveView = 'conferences' | 'researchers' | 'connections';

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('conferences');
  const [recommendations, setRecommendations] = useState<Researcher[]>([]);
  const [searchResults, setSearchResults] = useState<Researcher[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [showCreateConference, setShowCreateConference] = useState(false);
  const [showJoinConference, setShowJoinConference] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedConferenceId, setSelectedConferenceId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<{ id: number; otherUserName: string } | null>(null);
  const [naturalLanguagePreference, setNaturalLanguagePreference] = useState('');
  const [recommendationSeed, setRecommendationSeed] = useState(0);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
      fetchConferences();
      fetchConversations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:5000/api/researchers/${user.id}/recommendations`);
      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  };

  const fetchConferences = async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:5000/api/researchers/${user.id}/conferences`);
      const data = await response.json();
      setConferences(data);
    } catch (err) {
      console.error('Error fetching conferences:', err);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const response = await fetch(`http://localhost:5000/api/conversations/user/${user.id}`);
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSuccess = (conferenceId: string) => {
    setShowCreateConference(false);
    fetchConferences();
    handleCopyId(conferenceId);
  };

  const handleJoinSuccess = () => {
    setShowJoinConference(false);
    fetchConferences();
  };

  const groupConferences = () => {
    const now = new Date();
    const upcoming: Conference[] = [];
    const current: Conference[] = [];
    const past: Conference[] = [];

    conferences.forEach(conf => {
      const startDate = new Date(conf.start_date);
      const endDate = new Date(conf.end_date);

      if (now < startDate) {
        upcoming.push(conf);
      } else if (now >= startDate && now <= endDate) {
        current.push(conf);
      } else {
        past.push(conf);
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
      const response = await fetch(`http://localhost:5000/api/researchers/search/${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.filter((r: Researcher) => r.id !== user?.id));
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const handleConferenceClick = (conferenceId: string) => {
    setSelectedConferenceId(conferenceId);
  };

  const handleBackToConferences = () => {
    setSelectedConferenceId(null);
    fetchConferences(); // Refresh conferences when coming back
  };

  const handleConnect = async (otherUserId: number) => {
    if (!user) return;

    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
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

      // Find the other user's name
      const otherUser = displayedResearchers.find(r => r.id === otherUserId);

      if (otherUser) {
        setActiveConversation({
          id: conversation.id,
          otherUserName: otherUser.name
        });
        fetchConversations(); // Refresh conversation list
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
    fetchConversations(); // Refresh conversations
  };

  const getRecommendedResearchers = () => {
    // TODO: In the future, this will use naturalLanguagePreference to filter/sort
    // For now, use similarity scores
    const sorted = [...recommendations].sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    const startIndex = (recommendationSeed * 3) % Math.max(1, sorted.length);
    return sorted.slice(startIndex, startIndex + 3);
  };

  const handleRefreshRecommendations = () => {
    // TODO: Backend will process naturalLanguagePreference here
    setRecommendationSeed(prev => prev + 1);
  };

  const displayedResearchers = isSearching ? searchResults : recommendations;
  const recommendedResearchers = getRecommendedResearchers();
  const { upcoming, current, past } = groupConferences();

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

  // Show conference detail page if a conference is selected
  if (selectedConferenceId && user) {
    return (
      <ConferenceDetail
        conferenceId={selectedConferenceId}
        userId={user.id}
        onBack={handleBackToConferences}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-5 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Research Connect</h1>
          <div className="flex items-center gap-5">
            <span className="text-sm">Welcome, {user?.name}</span>
            <button
              onClick={onLogout}
              className="bg-white/20 border-2 border-white px-5 py-2 rounded-lg font-semibold hover:bg-white/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-5 md:p-10 grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-5">Your Profile</h2>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{user?.name}</h3>
            <p className="text-gray-600 italic mb-4">{user?.institution}</p>
            <p className="text-gray-700 text-sm mb-3 leading-relaxed">
              <strong>Research Areas:</strong> {user?.research_areas || 'Not specified'}
            </p>
            <p className="text-gray-700 text-sm mb-3 leading-relaxed">
              <strong>Interests:</strong> {user?.interests || 'Not specified'}
            </p>
            <p className="text-gray-600 mt-4 leading-relaxed">{user?.bio}</p>
          </div>
        </div>

        <div>
          <div className="flex gap-3 mb-5 border-b border-gray-200">
            <button
              onClick={() => setActiveView('conferences')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeView === 'conferences'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Conferences
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

          {activeView === 'conferences' ? (
            <>
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setShowCreateConference(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  Create Conference
                </button>
                <button
                  onClick={() => setShowJoinConference(true)}
                  className="px-5 py-2.5 border-2 border-indigo-500 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Join Conference
                </button>
              </div>

              {copiedId && (
                <div className="mb-5 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                  Conference ID copied to clipboard!
                </div>
              )}

              {conferences.length === 0 ? (
                <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
                  No conferences yet. Create or join a conference to get started!
                </p>
              ) : (
                <div className="space-y-8">
                  {current.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Current</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {current.map(conference => (
                          <ConferenceCard
                            key={conference.id}
                            conference={conference}
                            onCopyId={handleCopyId}
                            onClick={handleConferenceClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {upcoming.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Upcoming</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {upcoming.map(conference => (
                          <ConferenceCard
                            key={conference.id}
                            conference={conference}
                            onCopyId={handleCopyId}
                            onClick={handleConferenceClick}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {past.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Past</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {past.map(conference => (
                          <ConferenceCard
                            key={conference.id}
                            conference={conference}
                            onCopyId={handleCopyId}
                            onClick={handleConferenceClick}
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
              {/* Recommended Researchers Section */}
              {recommendedResearchers.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-5">Recommended for You</h2>

                  {/* Natural Language Preference Input */}
                  <div className="mb-5 bg-white rounded-xl p-5 shadow-md">
                    <label htmlFor="nlPreference" className="block text-sm font-medium text-gray-700 mb-2">
                      Describe who you&apos;d like to meet (optional)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        id="nlPreference"
                        placeholder="e.g., find someone from my school with similar interests as me"
                        value={naturalLanguagePreference}
                        onChange={(e) => setNaturalLanguagePreference(e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleRefreshRecommendations}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    </div>
                    {naturalLanguagePreference && (
                      <p className="mt-2 text-sm text-gray-500">
                        Note: Natural language search will be implemented in a future update. Currently showing recommendations based on research similarity.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {recommendedResearchers.map(researcher => (
                      <ResearcherCard
                        key={researcher.id}
                        researcher={researcher}
                        onConnect={handleConnect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Search Section */}
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

      {showCreateConference && user && (
        <CreateConference
          userId={user.id}
          onClose={() => setShowCreateConference(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showJoinConference && user && (
        <JoinConference
          userId={user.id}
          onClose={() => setShowJoinConference(false)}
          onSuccess={handleJoinSuccess}
        />
      )}
    </div>
  );
}
