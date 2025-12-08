'use client';

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

interface ResearcherCardProps {
  researcher: Researcher;
}

export default function ResearcherCard({ researcher }: ResearcherCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col">
      <div className="flex justify-between items-start mb-3 gap-2">
        <h3 className="text-lg font-bold text-gray-800">{researcher.name}</h3>
        {researcher.similarity_score !== undefined && researcher.similarity_score > 0 && (
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap">
            Match Score: {researcher.similarity_score}
          </span>
        )}
      </div>

      <p className="text-gray-600 italic text-sm mb-4">
        {researcher.institution || 'Institution not specified'}
      </p>

      {researcher.research_areas && (
        <div className="mb-3">
          <strong className="block text-gray-700 text-xs mb-1.5">Research Areas:</strong>
          <div className="flex flex-wrap gap-1.5">
            {researcher.research_areas.split(',').map((area, index) => (
              <span key={index} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-medium">
                {area.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {researcher.interests && (
        <div className="mb-3">
          <strong className="block text-gray-700 text-xs mb-1.5">Interests:</strong>
          <div className="flex flex-wrap gap-1.5">
            {researcher.interests.split(',').map((interest, index) => (
              <span key={index} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded text-xs font-medium">
                {interest.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {researcher.bio && (
        <p className="text-gray-600 text-sm leading-relaxed mb-3 flex-grow">
          {researcher.bio.substring(0, 150)}{researcher.bio.length > 150 ? '...' : ''}
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <a
          href={`mailto:${researcher.email}`}
          className="inline-block px-5 py-2 bg-indigo-500 text-white rounded-lg font-semibold text-sm hover:bg-indigo-600 transition-colors"
        >
          Contact
        </a>
      </div>
    </div>
  );
}
