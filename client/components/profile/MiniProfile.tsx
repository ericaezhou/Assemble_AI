'use client';

import Link from 'next/link';
import ChipList from './ChipList';
import { UserProfile } from '@/store/userStore';

interface MiniProfileProps {
  user: UserProfile;
}

export default function MiniProfile({ user }: MiniProfileProps) {
  // Determine institution display based on occupation
  const getInstitutionDisplay = () => {
    if (user.occupation === 'Student' && user.school) {
      return `Student at ${user.school}`;
    }
    if (user.occupation === 'Professional' && user.company) {
      return `${user.title || 'Professional'} at ${user.company}`;
    }
    if (user.occupation === 'Researcher' && user.school) {
      return `Researcher at ${user.school}`;
    }
    if (user.occupation === 'Other') {
      return user.other_description?.slice(0, 50) || 'Explorer';
    }
    // Legacy fallback
    if (user.institution) {
      return user.institution;
    }
    return user.occupation || '';
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <h3 className="text-xl font-bold">{user.name}</h3>
        <p className="text-indigo-100 text-sm mt-1">{getInstitutionDisplay()}</p>
      </div>

      {/* Content sections */}
      <div className="p-5 space-y-5">
        {/* Academic Interests */}
        {user.interest_areas && user.interest_areas.length > 0 && (
          <ChipList
            items={user.interest_areas}
            type="interest"
            maxDisplay={3}
            label="Interests"
          />
        )}

        {/* Skills */}
        {user.current_skills && user.current_skills.length > 0 && (
          <ChipList
            items={user.current_skills}
            type="skill"
            maxDisplay={3}
            label="Skills"
          />
        )}

        {/* Hobbies */}
        {user.hobbies && user.hobbies.length > 0 && (
          <ChipList
            items={user.hobbies}
            type="hobby"
            maxDisplay={3}
            label="Hobbies"
          />
        )}

        {/* Legacy fields fallback */}
        {(!user.interest_areas || user.interest_areas.length === 0) &&
          user.research_areas && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Research Areas
              </h4>
              <p className="text-sm text-gray-700">{user.research_areas}</p>
            </div>
          )}
      </div>

      {/* View More Link */}
      <div className="px-5 pb-5">
        <Link
          href={`/profile/${user.id}`}
          className="block w-full text-center px-4 py-3 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          View Full Profile →
        </Link>
      </div>
    </div>
  );
}
