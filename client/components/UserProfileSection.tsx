'use client';

import { useState } from 'react';
import { getInitialsFromName } from '@/utils/name';
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
  publications?: string[];
  bio?: string;
  // Legacy fields
  institution?: string;
  research_areas?: string;
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
    <div style={{ borderBottom: '1px solid var(--border-light)' }} className="last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-2 rounded-lg transition-colors btn-ghost"
      >
        <span className="section-heading">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--text-muted)' }}
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

  const initials = getInitialsFromName(user.name);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-6" style={{ background: 'var(--accent)', borderBottom: '2px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)' }}
          >
            {initials}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{user.name}</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{user.email}</p>
          </div>
        </div>
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
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Occupation</span>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.occupation}</p>
            </div>
          )}
          {user.degree && (
            <div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Education</span>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.degree}</p>
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
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>School</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.school}</p>
                  </div>
                )}
                {user.major && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Major</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.major}</p>
                  </div>
                )}
                {user.year && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Year</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.year}</p>
                  </div>
                )}
              </>
            )}

            {/* Professional */}
            {user.occupation === 'Professional' && (
              <>
                {user.company && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Company</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.company}</p>
                  </div>
                )}
                {user.title && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Title</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.title}</p>
                  </div>
                )}
                {user.work_experience_years && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Experience</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.work_experience_years}</p>
                  </div>
                )}
                {user.school && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>School</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.school}</p>
                  </div>
                )}
              </>
            )}

            {/* Researcher */}
            {user.occupation === 'Researcher' && (
              <>
                {user.school && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Institution</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.school}</p>
                  </div>
                )}
                {user.research_area && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Research Area</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.research_area}</p>
                  </div>
                )}
              </>
            )}

            {/* Other */}
            {user.occupation === 'Other' && (
              <>
                {user.other_description && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>About</span>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{user.other_description}</p>
                  </div>
                )}
                {user.school && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>School</span>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.school}</p>
                  </div>
                )}
              </>
            )}

            {/* Legacy fields fallback */}
            {!user.occupation && user.institution && (
              <div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Institution</span>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{user.institution}</p>
              </div>
            )}
            {!user.occupation && user.bio && (
              <div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bio</span>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{user.bio}</p>
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
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.research_areas || user.interests}</p>
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
      <div className="p-4" style={{ borderTop: '2px solid var(--border-light)', background: 'var(--bg)' }}>
        <button className="btn btn-ghost w-full text-sm" style={{ color: 'var(--accent)' }}>
          Edit Profile
        </button>
      </div>
    </div>
  );
}
