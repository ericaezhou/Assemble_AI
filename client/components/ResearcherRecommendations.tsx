'use client';

import { useState } from 'react';
import ResearcherCard from './ResearcherCard';
import { Researcher } from '@/types/profile';
import { authenticatedFetch } from '@/utils/auth';

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
  const [reasonsByUserId, setReasonsByUserId] = useState<Record<string, string>>({});
  const [loadingByUserId, setLoadingByUserId] = useState<Record<string, boolean>>({});
  const [visibleByUserId, setVisibleByUserId] = useState<Record<string, boolean>>({});
  const safeResearchers = Array.isArray(researchers) ? researchers : [];
  const displayed = safeResearchers.filter(r => r.id !== currentUserId).slice(0, 3);

  const handleWhyMatch = async (researcher: Researcher) => {
    if (!currentUserId || !researcher?.id) return;
    if (loadingByUserId[researcher.id]) return;

    const existingReason = reasonsByUserId[researcher.id] || researcher.match_reason;
    if (existingReason) {
      if (!reasonsByUserId[researcher.id]) {
        setReasonsByUserId(prev => ({ ...prev, [researcher.id]: existingReason }));
      }
      setVisibleByUserId(prev => ({ ...prev, [researcher.id]: !prev[researcher.id] }));
      return;
    }

    setLoadingByUserId(prev => ({ ...prev, [researcher.id]: true }));
    try {
      const response = await authenticatedFetch(
        `/api/researchers/${currentUserId}/recommendations/${researcher.id}/why-match`,
        {
          method: 'POST',
          body: JSON.stringify({
            score: researcher.similarity_score,
            exp_similarity: researcher.exp_similarity,
            interest_similarity: researcher.interest_similarity,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      const reason = typeof data?.reason === 'string' ? data.reason : '';
      if (reason) {
        setReasonsByUserId(prev => ({ ...prev, [researcher.id]: reason }));
        setVisibleByUserId(prev => ({ ...prev, [researcher.id]: true }));
      } else {
        setReasonsByUserId(prev => ({ ...prev, [researcher.id]: 'No match reason available.' }));
        setVisibleByUserId(prev => ({ ...prev, [researcher.id]: true }));
      }
    } catch (error) {
      console.error('Failed to generate why-match reason:', error);
      setReasonsByUserId(prev => ({ ...prev, [researcher.id]: 'No match reason available.' }));
      setVisibleByUserId(prev => ({ ...prev, [researcher.id]: true }));
    } finally {
      setLoadingByUserId(prev => ({ ...prev, [researcher.id]: false }));
    }
  };

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
          onWhyMatch={() => handleWhyMatch(researcher)}
          whyMatchReason={reasonsByUserId[researcher.id]}
          whyMatchLoading={Boolean(loadingByUserId[researcher.id])}
          whyMatchVisible={Boolean(visibleByUserId[researcher.id])}
        />
      ))}
    </div>
  );
}
