'use client';

import { useState } from 'react';
import ProfileChip from './ProfileChip';

interface UserData {
  id: number;
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
  // Legacy fields
  institution?: string;
  research_areas?: string;
  bio?: string;
  interests?: string;
}

interface UserProfileSectionProps {
  user: UserData;
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isOpen, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span className="font-semibold text-sm text-gray-800">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-2 pb-4 space-y-2 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function UserProfileSection({ user }: UserProfileSectionProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true,
    background: false,
    interests: false,
    skills: false,
    hobbies: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <h3 className="text-2xl font-bold mb-1">{user.name}</h3>
        <p className="text-indigo-100 text-sm">{user.email}</p>
      </div>

      {/* Collapsible sections */}
      <div className="p-4">
        {/* Basics */}
        <CollapsibleSection
          title="Basics"
          isOpen={openSections.basics}
          onToggle={() => toggleSection('basics')}
        >
          {user.occupation && (
            <div>
              <span className="text-xs text-gray-500">Occupation</span>
              <p className="text-sm text-gray-800 font-medium">{user.occupation}</p>
            </div>
          )}
          {user.degree && (
            <div>
              <span className="text-xs text-gray-500">Education</span>
              <p className="text-sm text-gray-800 font-medium">{user.degree}</p>
            </div>
          )}
        </CollapsibleSection>

        {/* Background - conditional based on occupation */}
        {user.occupation && (
          <CollapsibleSection
            title="Background"
            isOpen={openSections.background}
            onToggle={() => toggleSection('background')}
          >
            {/* Student */}
            {user.occupation === 'Student' && (
              <>
                {user.school && (
                  <div>
                    <span className="text-xs text-gray-500">School</span>
                    <p className="text-sm text-gray-800 font-medium">{user.school}</p>
                  </div>
                )}
                {user.major && (
                  <div>
                    <span className="text-xs text-gray-500">Major</span>
                    <p className="text-sm text-gray-800 font-medium">{user.major}</p>
                  </div>
                )}
                {user.year && (
                  <div>
                    <span className="text-xs text-gray-500">Year</span>
                    <p className="text-sm text-gray-800 font-medium">{user.year}</p>
                  </div>
                )}
              </>
            )}

            {/* Professional */}
            {user.occupation === 'Professional' && (
              <>
                {user.company && (
                  <div>
                    <span className="text-xs text-gray-500">Company</span>
                    <p className="text-sm text-gray-800 font-medium">{user.company}</p>
                  </div>
                )}
                {user.title && (
                  <div>
                    <span className="text-xs text-gray-500">Title</span>
                    <p className="text-sm text-gray-800 font-medium">{user.title}</p>
                  </div>
                )}
                {user.work_experience_years && (
                  <div>
                    <span className="text-xs text-gray-500">Experience</span>
                    <p className="text-sm text-gray-800 font-medium">{user.work_experience_years}</p>
                  </div>
                )}
                {user.school && (
                  <div>
                    <span className="text-xs text-gray-500">School</span>
                    <p className="text-sm text-gray-800 font-medium">{user.school}</p>
                  </div>
                )}
              </>
            )}

            {/* Researcher */}
            {user.occupation === 'Researcher' && (
              <>
                {user.school && (
                  <div>
                    <span className="text-xs text-gray-500">Institution</span>
                    <p className="text-sm text-gray-800 font-medium">{user.school}</p>
                  </div>
                )}
                {user.research_area && (
                  <div>
                    <span className="text-xs text-gray-500">Research Area</span>
                    <p className="text-sm text-gray-800 font-medium">{user.research_area}</p>
                  </div>
                )}
              </>
            )}

            {/* Other */}
            {user.occupation === 'Other' && (
              <>
                {user.other_description && (
                  <div>
                    <span className="text-xs text-gray-500">About</span>
                    <p className="text-sm text-gray-800">{user.other_description}</p>
                  </div>
                )}
                {user.school && (
                  <div>
                    <span className="text-xs text-gray-500">School</span>
                    <p className="text-sm text-gray-800 font-medium">{user.school}</p>
                  </div>
                )}
              </>
            )}

            {/* Legacy fields fallback */}
            {!user.occupation && user.institution && (
              <div>
                <span className="text-xs text-gray-500">Institution</span>
                <p className="text-sm text-gray-800 font-medium">{user.institution}</p>
              </div>
            )}
            {!user.occupation && user.bio && (
              <div>
                <span className="text-xs text-gray-500">Bio</span>
                <p className="text-sm text-gray-800">{user.bio}</p>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Interests */}
        {((user.interest_areas && user.interest_areas.length > 0) ||
          (user.research_areas && user.research_areas.length > 0)) && (
          <CollapsibleSection
            title="Interests"
            isOpen={openSections.interests}
            onToggle={() => toggleSection('interests')}
          >
            <div className="flex flex-wrap gap-2">
              {user.interest_areas && user.interest_areas.length > 0 ? (
                user.interest_areas.map((interest) => (
                  <ProfileChip key={interest} value={interest} type="interest" />
                ))
              ) : (
                <p className="text-sm text-gray-600">{user.research_areas || user.interests}</p>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Skills */}
        {user.current_skills && user.current_skills.length > 0 && (
          <CollapsibleSection
            title="Skills"
            isOpen={openSections.skills}
            onToggle={() => toggleSection('skills')}
          >
            <div className="flex flex-wrap gap-2">
              {user.current_skills.map((skill) => (
                <ProfileChip key={skill} value={skill} type="skill" />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Hobbies */}
        {user.hobbies && user.hobbies.length > 0 && (
          <CollapsibleSection
            title="Hobbies"
            isOpen={openSections.hobbies}
            onToggle={() => toggleSection('hobbies')}
          >
            <div className="flex flex-wrap gap-2">
              {user.hobbies.map((hobby) => (
                <ProfileChip key={hobby} value={hobby} type="hobby" />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Edit button */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button className="w-full px-4 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors">
          Edit Profile
        </button>
      </div>
    </div>
  );
}
