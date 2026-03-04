'use client';

import { useState } from 'react';
import { UserProfile, useUserStore } from '@/store/userStore';
import {
  INTEREST_AREAS,
  SKILLS,
  HOBBIES,
  Option,
} from '@/utils/profileOptions';

interface ProfileEditFormProps {
  user: UserProfile;
  section: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ProfileEditForm({
  user,
  section,
  onClose,
  onSave,
}: ProfileEditFormProps) {
  const { saveProfile, isLoading } = useUserStore();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    user.interest_areas || []
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    user.current_skills || []
  );
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(
    user.hobbies || []
  );
  const [bio, setBio] = useState(user.bio || '');
  const [github, setGithub] = useState(user.github || '');
  const [linkedin, setLinkedin] = useState(user.linkedin || '');
  const [publicationsText, setPublicationsText] = useState(
    (user.publications || []).join('\n')
  );
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (
    item: string,
    selected: string[],
    setSelected: (items: string[]) => void,
    maxItems: number = 10
  ) => {
    if (selected.includes(item)) {
      setSelected(selected.filter((i) => i !== item));
    } else if (selected.length < maxItems) {
      setSelected([...selected, item]);
    }
  };

  const handleSave = async () => {
    setError(null);

    const updates: Partial<UserProfile> = {};

    if (section === 'interests' || section === 'header') {
      updates.interest_areas = selectedInterests;
    }
    if (section === 'skills' || section === 'header') {
      updates.current_skills = selectedSkills;
    }
    if (section === 'hobbies' || section === 'header') {
      updates.hobbies = selectedHobbies;
    }
    if (section === 'about') {
      updates.bio = bio;
      updates.github = github;
      updates.linkedin = linkedin;
    }
    if (section === 'publications') {
      updates.publications = publicationsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }

    const success = await saveProfile(updates);
    if (success) {
      onSave();
    } else {
      setError('Failed to save changes. Please try again.');
    }
  };

  const renderChipSelector = (
    options: Option[],
    selected: string[],
    setSelected: (items: string[]) => void,
    label: string
  ) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>{label}</h3>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{selected.length}/10 selected</span>
      </div>
      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleItem(option.value, selected, setSelected)}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={isSelected
                ? { background: 'var(--accent-light)', color: 'var(--accent)', border: '2px solid var(--accent)' }
                : { background: 'var(--bg)', color: 'var(--text-muted)', border: '2px solid var(--border-light)' }
              }
            >
              {option.icon && <span className="mr-1">{option.icon}</span>}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (section) {
      case 'interests':
        return renderChipSelector(
          INTEREST_AREAS,
          selectedInterests,
          setSelectedInterests,
          'Edit Interests'
        );
      case 'skills':
        return renderChipSelector(
          SKILLS,
          selectedSkills,
          setSelectedSkills,
          'Edit Skills'
        );
      case 'hobbies':
        return renderChipSelector(
          HOBBIES,
          selectedHobbies,
          setSelectedHobbies,
          'Edit Hobbies'
        );
      case 'about':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell people a bit about yourself..."
                className="input w-full resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>GitHub</label>
              <input
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="username or https://github.com/username"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>LinkedIn</label>
              <input
                type="text"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="username or https://linkedin.com/in/username"
                className="input w-full"
              />
            </div>
          </div>
        );
      case 'publications':
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>Edit Publications</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>One publication per line</p>
            <textarea
              value={publicationsText}
              onChange={(e) => setPublicationsText(e.target.value)}
              rows={8}
              placeholder={"Impacts of Pandemic Instruction Mode on Student Learning\nConfigural Drivers of Team Performance"}
              className="input w-full resize-none"
            />
          </div>
        );
      case 'header':
        return (
          <div className="space-y-6">
            {renderChipSelector(INTEREST_AREAS, selectedInterests, setSelectedInterests, 'Interests')}
            {renderChipSelector(SKILLS, selectedSkills, setSelectedSkills, 'Skills')}
            {renderChipSelector(HOBBIES, selectedHobbies, setSelectedHobbies, 'Hobbies')}
          </div>
        );
      default:
        return <p style={{ color: 'var(--text-muted)' }}>Unknown section</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '2px solid var(--border)' }}>
          <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>
            {section === 'header'
              ? 'Edit Profile'
              : section === 'about'
              ? 'Edit About'
              : `Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`}
          </h2>
          <button
            onClick={onClose}
            className="btn-ghost p-2 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {renderSectionContent()}
          {error && (
            <p className="mt-4 text-sm" style={{ color: '#ef4444' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '2px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
