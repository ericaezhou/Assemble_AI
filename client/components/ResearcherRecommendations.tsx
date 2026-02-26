'use client';

import ResearcherCard from './ResearcherCard';
import { Researcher } from '@/types/profile';

interface ResearcherRecommendationsProps {
  researchers: Researcher[];
  currentUserId: string;
  onConnect?: (researcherId: string) => void;
  hasRequestedRecommendations?: boolean;
}

export default function ResearcherRecommendations({
  researchers,
  currentUserId,
  onConnect,
  hasRequestedRecommendations = false,
}: ResearcherRecommendationsProps) {
  const safeResearchers = Array.isArray(researchers) ? researchers : [];
  const displayed = safeResearchers.filter(r => r.id !== currentUserId).slice(0, 3);

  if (displayed.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-md text-sm text-gray-600">
        {hasRequestedRecommendations
          ? "No recommendations returned. Try adjusting your profile or refreshing again."
          : "Click Refresh to request recommendations."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {displayed.map(researcher => (
        <ResearcherCard
          key={researcher.id}
          researcher={researcher}
          onConnect={onConnect}
        />
      ))}
    </div>
  );
}
