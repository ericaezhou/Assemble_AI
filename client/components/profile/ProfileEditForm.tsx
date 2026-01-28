'use client';

import { useState, useEffect } from 'react';
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
        <h3 className="text-lg font-semibold text-gray-800">{label}</h3>
        <span className="text-sm text-gray-500">{selected.length}/10 selected</span>
      </div>
      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleItem(option.value, selected, setSelected)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
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
      case 'header':
        return (
          <div className="space-y-6">
            {renderChipSelector(
              INTEREST_AREAS,
              selectedInterests,
              setSelectedInterests,
              'Interests'
            )}
            {renderChipSelector(
              SKILLS,
              selectedSkills,
              setSelectedSkills,
              'Skills'
            )}
            {renderChipSelector(
              HOBBIES,
              selectedHobbies,
              setSelectedHobbies,
              'Hobbies'
            )}
          </div>
        );
      default:
        return <p className="text-gray-500">Unknown section</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {section === 'header' ? 'Edit Profile' : `Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
            <p className="mt-4 text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
