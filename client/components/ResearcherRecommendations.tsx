'use client';

import { useState } from 'react';
import ResearcherCard from './ResearcherCard';
import { Researcher } from '@/types/profile';

interface ResearcherRecommendationsProps {
  researchers: Researcher[];
  currentUserId: string;
  title?: string;
  onConnect?: (researcherId: string) => void;
  onRefreshRecommendations?: (naturalLanguagePreference: string) => Promise<void> | void;
  isRefreshingRecommendations?: boolean;
  hasRequestedRecommendations?: boolean;
}

export default function ResearcherRecommendations({
  researchers,
  currentUserId,
  title = "Recommended for You",
  onConnect,
  onRefreshRecommendations,
  isRefreshingRecommendations = false,
  hasRequestedRecommendations = false
}: ResearcherRecommendationsProps) {
  const [naturalLanguagePreference, setNaturalLanguagePreference] = useState('');
  const [recommendationSeed, setRecommendationSeed] = useState(0);
  const safeResearchers = Array.isArray(researchers) ? researchers : [];

  const getRecommendedResearchers = () => {
    // TODO: In the future, this will use naturalLanguagePreference to filter/sort
    // For now, use similarity scores
    const otherResearchers = safeResearchers.filter(r => r.id !== currentUserId);
    const sorted = [...otherResearchers].sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

    const startIndex = (recommendationSeed * 3) % Math.max(1, sorted.length);
    return sorted.slice(startIndex, startIndex + 3);
  };

  const handleRefreshRecommendations = async () => {
    if (onRefreshRecommendations) {
      await onRefreshRecommendations(naturalLanguagePreference);
      return;
    }
    setRecommendationSeed(prev => prev + 1);
  };

  const recommendedResearchers = getRecommendedResearchers();

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
            disabled={isRefreshingRecommendations}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshingRecommendations ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {naturalLanguagePreference && (
          <p className="mt-2 text-sm text-gray-500">
            Note: Natural language search will be implemented in a future update. Currently showing recommendations based on research similarity.
          </p>
        )}
      </div>

      {recommendedResearchers.length === 0 ? (
        <div className="bg-white rounded-xl p-5 shadow-md text-sm text-gray-600">
          {hasRequestedRecommendations
            ? "No recommendations returned. Try adjusting your profile or refreshing again."
            : "Click Refresh to request recommendations from the matching service."}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {recommendedResearchers.map(researcher => (
            <ResearcherCard
              key={researcher.id}
              researcher={researcher}
              onConnect={onConnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
