'use client';

import { useRef, useState } from 'react';
import { UserProfile, useUserStore } from '@/store/userStore';
import { getInitialsFromName } from '@/utils/name';
import { API_BASE_URL } from '@/utils/api';
import AvatarCropModal from '@/components/AvatarCropModal';
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

  // Avatar upload state (used in 'header' section)
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatar_url || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatar_url || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected
    e.target.value = '';
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setAvatarPreview(URL.createObjectURL(blob));
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const res = await fetch(`${API_BASE_URL}/api/upload/avatar`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAvatarUrl(data.url);
    } catch (err: any) {
      setAvatarError(err.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

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
    if (section === 'header' && avatarUrl !== (user.avatar_url || '')) {
      updates.avatar_url = avatarUrl;
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
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-black"
                style={{
                  background: avatarPreview ? 'transparent' : 'var(--accent-light)',
                  border: '3px solid var(--accent)',
                  cursor: avatarUploading ? 'not-allowed' : 'pointer',
                  opacity: avatarUploading ? 0.7 : 1,
                  outline: '2px solid var(--border)',
                  color: 'var(--accent)',
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitialsFromName(user.name)
                )}
                {!avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full"
                    style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                  </div>
                )}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {avatarUploading ? 'Uploading...' : avatarPreview ? 'Click to change photo' : 'Click to add photo'}
              </p>
              {avatarError && <p className="text-xs" style={{ color: '#ef4444' }}>{avatarError}</p>}
            </div>
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
            disabled={isLoading || avatarUploading}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
