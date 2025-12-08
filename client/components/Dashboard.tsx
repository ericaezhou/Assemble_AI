'use client';

import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import ResearcherCard from './ResearcherCard';

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

interface DashboardProps {
  user: Researcher | null;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [recommendations, setRecommendations] = useState<Researcher[]>([]);
  const [searchResults, setSearchResults] = useState<Researcher[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
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
    } finally {
      setLoading(false);
    }
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

  const displayedResearchers = isSearching ? searchResults : recommendations;

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
          <div className="flex justify-between items-center mb-5 gap-5 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-800">
              {isSearching ? 'Search Results' : 'Recommended Researchers'}
            </h2>
            <SearchBar onSearch={handleSearch} />
          </div>

          {loading && !isSearching ? (
            <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
              Loading recommendations...
            </p>
          ) : displayedResearchers.length === 0 ? (
            <p className="text-center text-gray-600 py-10 bg-white rounded-xl">
              {isSearching
                ? 'No researchers found matching your search.'
                : 'No recommendations yet. More researchers will appear as they join!'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {displayedResearchers.map(researcher => (
                <ResearcherCard key={researcher.id} researcher={researcher} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
