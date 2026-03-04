'use client';

import Link from 'next/link';
import ChipList from './ChipList';
import { UserProfile } from '@/store/userStore';

interface MiniProfileProps {
  user: UserProfile;
}

export default function MiniProfile({ user }: MiniProfileProps) {
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
    return user.occupation || '';
  };

  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-5" style={{ background: 'var(--accent)', borderBottom: '2px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black border-2 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-base leading-tight" style={{ color: '#fff' }}>{user.name}</h3>
            <p className="text-sm mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{getInstitutionDisplay()}</p>
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="p-5 space-y-4">
        {user.interest_areas && user.interest_areas.length > 0 && (
          <ChipList items={user.interest_areas} type="interest" maxDisplay={3} label="Interests" />
        )}
        {user.current_skills && user.current_skills.length > 0 && (
          <ChipList items={user.current_skills} type="skill" maxDisplay={3} label="Skills" />
        )}
        {user.hobbies && user.hobbies.length > 0 && (
          <ChipList items={user.hobbies} type="hobby" maxDisplay={3} label="Hobbies" />
        )}
        {(!user.interest_areas || user.interest_areas.length === 0) && user.research_area && (
          <div className="space-y-1">
            <h4 className="section-heading">Research Area</h4>
            <p className="text-sm" style={{ color: 'var(--text)' }}>{user.research_area}</p>
          </div>
        )}
      </div>

      {/* View More Link */}
      <div className="px-5 pb-5">
        <Link
          href={`/profile/${user.id}`}
          className="btn btn-secondary w-full justify-center"
          style={{ fontSize: '0.8rem' }}
        >
          View Full Profile →
        </Link>
      </div>
    </div>
  );
}
