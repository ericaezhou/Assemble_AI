'use client';

import { useState } from 'react';
import { UserProfile } from '@/store/userStore';
import ChipList from './ChipList';
import ProfileEditForm from './ProfileEditForm';

interface FullProfileProps {
  user: UserProfile;
  isOwnProfile: boolean;
  onProfileUpdate: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getHeadline(user: UserProfile): string {
  switch (user.occupation) {
    case 'Student':
      return [user.major && `${user.major} Student`, user.school && `at ${user.school}`]
        .filter(Boolean)
        .join(' ') || 'Student';
    case 'Professional':
      return [user.title, user.company && `at ${user.company}`]
        .filter(Boolean)
        .join(' ') || 'Professional';
    case 'Researcher':
      return [
        'Researcher',
        user.research_area && `in ${user.research_area}`,
        user.school && `at ${user.school}`,
      ]
        .filter(Boolean)
        .join(' ');
    case 'Other':
      return user.other_description || 'Explorer';
    default:
      return user.occupation || '';
  }
}

function getMemberSince(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getWhimsicalHeader(type: 'interest' | 'skill' | 'hobby', isOwn: boolean): string {
  const headers = {
    interest: isOwn ? 'What gets you excited' : 'What gets them excited',
    skill: isOwn ? 'Your superpowers' : 'Their superpowers',
    hobby: isOwn ? 'Outside the code' : 'Outside the code',
  };
  return headers[type];
}

function getEmptyState(type: 'interest' | 'skill' | 'hobby'): string {
  const states = {
    interest: 'No interests shared yet — the world awaits!',
    skill: 'No superpowers revealed yet...',
    hobby: 'Hobbies? What hobbies? Too busy coding.',
  };
  return states[type];
}

export default function FullProfile({
  user,
  isOwnProfile,
  onProfileUpdate,
}: FullProfileProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showAllPubs, setShowAllPubs] = useState(false);

  const handleEditComplete = () => {
    setEditingSection(null);
    onProfileUpdate();
  };

  const memberSince = getMemberSince(user.created_at);

  const publications: string[] = Array.isArray(user.publications)
    ? user.publications
    : user.publications
    ? [user.publications]
    : [];

  const hasEducation = user.school || user.major || user.degree || user.year || user.expected_grad_date;
  const hasWork = user.company || user.title || user.work_experience_years;
  const hasAbout = hasEducation || hasWork || user.research_area;

  return (
    <div className="space-y-6">
      {/* ── Hero Section ── */}
      <div className="card overflow-hidden">
        {/* Accent banner */}
        <div className="h-20" style={{ background: 'var(--accent)', borderBottom: '2px solid var(--border)' }} />

        <div className="px-8 pb-8 -mt-10">
          <div className="flex items-end justify-between mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black border-4 select-none"
              style={{
                background: 'var(--accent-light)',
                borderColor: 'var(--surface)',
                color: 'var(--accent)',
                outline: '2px solid var(--border)',
              }}
            >
              {getInitials(user.name)}
            </div>

            {isOwnProfile && (
              <button
                onClick={() => setEditingSection('header')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Edit Profile
              </button>
            )}
          </div>

          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{user.name}</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{getHeadline(user)}</p>

          {user.bio && (
            <p className="mt-4 leading-relaxed text-sm" style={{ color: 'var(--text)' }}>{user.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {user.github && (
              <a
                href={user.github.startsWith('http') ? user.github : `https://github.com/${user.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            )}
            {user.linkedin && (
              <a
                href={user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
            )}
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </a>
            )}
            {memberSince && (
              <span className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>
                Member since {memberSince}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── About Card ── */}
      {hasAbout && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
              {isOwnProfile ? 'A bit about you' : 'A bit about them'}
            </h2>
            {isOwnProfile && (
              <button
                onClick={() => setEditingSection('about')}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasEducation && (
              <div className="space-y-3">
                <h3 className="section-heading flex items-center gap-2">
                  <span>🎓</span> Education
                </h3>
                <div className="space-y-2 text-sm" style={{ color: 'var(--text)' }}>
                  {user.school && <p><span style={{ color: 'var(--text-muted)' }}>School:</span> {user.school}</p>}
                  {user.major && <p><span style={{ color: 'var(--text-muted)' }}>Major:</span> {user.major}</p>}
                  {user.degree && <p><span style={{ color: 'var(--text-muted)' }}>Degree:</span> {user.degree}</p>}
                  {user.year && <p><span style={{ color: 'var(--text-muted)' }}>Year:</span> {user.year}</p>}
                  {user.expected_grad_date && <p><span style={{ color: 'var(--text-muted)' }}>Expected Grad:</span> {user.expected_grad_date}</p>}
                </div>
              </div>
            )}

            {hasWork && (
              <div className="space-y-3">
                <h3 className="section-heading flex items-center gap-2">
                  <span>💼</span> Work
                </h3>
                <div className="space-y-2 text-sm" style={{ color: 'var(--text)' }}>
                  {user.company && <p><span style={{ color: 'var(--text-muted)' }}>Company:</span> {user.company}</p>}
                  {user.title && <p><span style={{ color: 'var(--text-muted)' }}>Role:</span> {user.title}</p>}
                  {user.work_experience_years && <p><span style={{ color: 'var(--text-muted)' }}>Experience:</span> {user.work_experience_years}</p>}
                </div>
              </div>
            )}
          </div>

          {user.research_area && (
            <div className="mt-5 pt-5" style={{ borderTop: '2px solid var(--border-light)' }}>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)' }}
              >
                <span className="text-lg">🔬</span>
                <div>
                  <span className="section-heading block">Research Area</span>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{user.research_area}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Publications Card ── */}
      {publications.length > 0 && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <span>📄</span> Publications
            </h2>
            {isOwnProfile && (
              <button
                onClick={() => setEditingSection('publications')}
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                Edit
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {(showAllPubs ? publications : publications.slice(0, 3)).map(
              (pub, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: 'var(--accent)' }}
                  />
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{pub}</span>
                </li>
              )
            )}
          </ul>
          {publications.length > 3 && (
            <button
              onClick={() => setShowAllPubs(!showAllPubs)}
              className="mt-4 text-sm font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {showAllPubs ? 'Show less' : `Show all ${publications.length} publications`}
            </button>
          )}
        </div>
      )}

      {/* ── Interests ── */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
            {getWhimsicalHeader('interest', isOwnProfile)}
          </h2>
          {isOwnProfile && (
            <button
              onClick={() => setEditingSection('interests')}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            >
              Edit
            </button>
          )}
        </div>
        {user.interest_areas && user.interest_areas.length > 0 ? (
          <ChipList items={user.interest_areas} type="interest" showAll />
        ) : (
          <p className="italic text-sm" style={{ color: 'var(--text-muted)' }}>{getEmptyState('interest')}</p>
        )}
      </div>

      {/* ── Skills ── */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
            {getWhimsicalHeader('skill', isOwnProfile)}
          </h2>
          {isOwnProfile && (
            <button
              onClick={() => setEditingSection('skills')}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            >
              Edit
            </button>
          )}
        </div>
        {user.current_skills && user.current_skills.length > 0 ? (
          <ChipList items={user.current_skills} type="skill" showAll />
        ) : (
          <p className="italic text-sm" style={{ color: 'var(--text-muted)' }}>{getEmptyState('skill')}</p>
        )}
      </div>

      {/* ── Hobbies ── */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
            {getWhimsicalHeader('hobby', isOwnProfile)}
          </h2>
          {isOwnProfile && (
            <button
              onClick={() => setEditingSection('hobbies')}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            >
              Edit
            </button>
          )}
        </div>
        {user.hobbies && user.hobbies.length > 0 ? (
          <ChipList items={user.hobbies} type="hobby" showAll />
        ) : (
          <p className="italic text-sm" style={{ color: 'var(--text-muted)' }}>{getEmptyState('hobby')}</p>
        )}
      </div>

      {/* Edit Modal */}
      {editingSection && (
        <ProfileEditForm
          user={user}
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={handleEditComplete}
        />
      )}
    </div>
  );
}
