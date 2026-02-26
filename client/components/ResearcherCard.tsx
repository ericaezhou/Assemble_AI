'use client';

import { Researcher, getInstitution } from '@/types/profile';

interface ResearcherCardProps {
  researcher: Researcher;
  onConnect?: (researcherId: string) => void;
}

export default function ResearcherCard({ researcher, onConnect }: ResearcherCardProps) {
  const similarityScore =
    typeof researcher.similarity_score === 'number' ? researcher.similarity_score : null;

  const matchPercent = similarityScore !== null && similarityScore > 0
    ? Math.round(similarityScore * 100)
    : null;

  return (
    <div className="bg-white rounded-xl p-5 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-gray-800 min-w-0">{researcher.name}</h3>
          {matchPercent !== null && (
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2 py-0.5 rounded-lg text-xs font-semibold flex-shrink-0">
              {matchPercent}% match
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-600 italic text-sm mb-4">
        {getInstitution(researcher) || 'Institution not specified'}
      </p>

      {researcher.research_area && (
        <div className="mb-3">
          <strong className="block text-gray-700 text-xs mb-1.5">Research Area:</strong>
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-medium">
              {researcher.research_area}
            </span>
          </div>
        </div>
      )}

      {researcher.interest_areas && researcher.interest_areas.length > 0 && (
        <div className="mb-3">
          <strong className="block text-gray-700 text-xs mb-1.5">Interests:</strong>
          <div className="flex flex-wrap gap-1.5">
            {researcher.interest_areas.map((interest: string, index: number) => (
              <span key={index} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded text-xs font-medium">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {researcher.other_description && (
        <p className="text-gray-600 text-sm leading-relaxed mb-3 flex-grow">
          {researcher.other_description.substring(0, 150)}{researcher.other_description.length > 150 ? '...' : ''}
        </p>
      )}

      {researcher.match_reason && (
        <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
          <strong className="block text-indigo-700 text-xs mb-1">Why matched:</strong>
          <p className="text-indigo-700 text-sm leading-relaxed">{researcher.match_reason}</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        {onConnect ? (
          <button
            onClick={() => onConnect(researcher.id)}
            className="inline-block px-5 py-2 bg-indigo-500 text-white rounded-lg font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Connect
          </button>
        ) : (
          <a
            href={`mailto:${researcher.email}`}
            className="inline-block px-5 py-2 bg-indigo-500 text-white rounded-lg font-semibold text-sm hover:bg-indigo-600 transition-colors"
          >
            Contact
          </a>
        )}
      </div>
    </div>
  );
}
