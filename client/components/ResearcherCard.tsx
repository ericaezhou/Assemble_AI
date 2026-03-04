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
    <div className="card p-5 flex flex-col">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>{researcher.name}</h3>
          {matchPercent !== null && (
            <span className="tag tag-accent flex-shrink-0">{matchPercent}% match</span>
          )}
        </div>
      </div>

      <p className="text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
        {getInstitution(researcher) || 'Institution not specified'}
      </p>

      {researcher.research_area && (
        <div className="mb-3">
          <strong className="section-heading block mb-1.5">Research Area</strong>
          <div className="flex flex-wrap gap-1.5">
            <span className="tag">{researcher.research_area}</span>
          </div>
        </div>
      )}

      {researcher.interest_areas && researcher.interest_areas.length > 0 && (
        <div className="mb-3">
          <strong className="section-heading block mb-1.5">Interests</strong>
          <div className="flex flex-wrap gap-1.5">
            {researcher.interest_areas.map((interest: string, index: number) => (
              <span key={index} className="tag">{interest}</span>
            ))}
          </div>
        </div>
      )}

      {researcher.other_description && (
        <p className="text-sm leading-relaxed mb-3 flex-grow" style={{ color: 'var(--text-muted)' }}>
          {researcher.other_description.substring(0, 150)}{researcher.other_description.length > 150 ? '...' : ''}
        </p>
      )}

      {researcher.match_reason && (
        <div
          className="mb-3 p-3 rounded-lg"
          style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)' }}
        >
          <strong className="block text-xs mb-1" style={{ color: 'var(--accent)' }}>Why matched:</strong>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{researcher.match_reason}</p>
        </div>
      )}

      <div className="mt-auto pt-4" style={{ borderTop: '2px solid var(--border-light)' }}>
        {onConnect ? (
          <button
            onClick={() => onConnect(researcher.id)}
            className="btn btn-primary"
          >
            Connect
          </button>
        ) : (
          <a
            href={`mailto:${researcher.email}`}
            className="btn btn-primary"
          >
            Contact
          </a>
        )}
      </div>
    </div>
  );
}
