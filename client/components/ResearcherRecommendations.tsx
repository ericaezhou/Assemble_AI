'use client';

import { useState } from 'react';
import ResearcherCard from './ResearcherCard';

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
  github?: string;
  linkedin?: string;
  similarity_score?: number;
}

interface ResearcherRecommendationsProps {
  researchers: Researcher[];
  currentUserId: string;
  title?: string;
  onConnect?: (researcherId: string) => void;
}

export default function ResearcherRecommendations({
  researchers,
  currentUserId,
  title = "Recommended for You",
  onConnect
}: ResearcherRecommendationsProps) {
  const [naturalLanguagePreference, setNaturalLanguagePreference] = useState('');
  const [recommendationSeed, setRecommendationSeed] = useState(0);

  const getRecommendedResearchers = () => {
    // TODO: In the future, this will use naturalLanguagePreference to filter/sort
    // For now, use similarity scores
    const otherResearchers = researchers.filter(r => r.id !== currentUserId);
    const sorted = [...otherResearchers].sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

    const startIndex = (recommendationSeed * 3) % Math.max(1, sorted.length);
    return sorted.slice(startIndex, startIndex + 3);
  };

  const handleRefreshRecommendations = () => {
    // TODO: Backend will process naturalLanguagePreference here
    setRecommendationSeed(prev => prev + 1);
  };

  const recommendedResearchers = getRecommendedResearchers();

  if (recommendedResearchers.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-5">{title}</h2>

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
            onConnect={onConnect}
          />
        ))}
      </div>
    </div>
  );
}
