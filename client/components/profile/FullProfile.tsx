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

export default function FullProfile({
  user,
  isOwnProfile,
  onProfileUpdate,
}: FullProfileProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Determine occupation display
  const getOccupationDetails = () => {
    switch (user.occupation) {
      case 'Student':
        return {
          title: 'Student',
          subtitle: user.school || '',
          details: [
            user.major && `Major: ${user.major}`,
            user.year && `Year: ${user.year}`,
          ].filter(Boolean),
        };
      case 'Professional':
        return {
          title: user.title || 'Professional',
          subtitle: user.company || '',
          details: [
            user.work_experience_years && `${user.work_experience_years} years experience`,
          ].filter(Boolean),
        };
      case 'Researcher':
        return {
          title: 'Researcher',
          subtitle: user.school || '',
          details: [
            user.degree && `${user.degree}`,
            user.research_area && `Research: ${user.research_area}`,
          ].filter(Boolean),
        };
      case 'Other':
        return {
          title: 'Explorer',
          subtitle: user.other_description || '',
          details: [],
        };
      default:
        return {
          title: user.occupation || '',
          subtitle: user.institution || '',
          details: [],
        };
    }
  };

  const occupationInfo = getOccupationDetails();

  const handleEditComplete = () => {
    setEditingSection(null);
    onProfileUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 p-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-indigo-100 text-lg mt-1">
                {occupationInfo.title}
                {occupationInfo.subtitle && ` at ${occupationInfo.subtitle}`}
              </p>
              {occupationInfo.details.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {occupationInfo.details.map((detail, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white/20 rounded-full text-sm"
                    >
                      {detail}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => setEditingSection('header')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="px-8 py-4 border-b border-gray-100">
          <p className="text-gray-600 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {user.email}
          </p>
        </div>
      </div>

      {/* Interests Section */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Interests</h2>
          {isOwnProfile && (
            <button
              onClick={() => setEditingSection('interests')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
        {user.interest_areas && user.interest_areas.length > 0 ? (
          <ChipList items={user.interest_areas} type="interest" showAll />
        ) : (
          <p className="text-gray-500 italic">No interests added yet</p>
        )}
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Skills</h2>
          {isOwnProfile && (
            <button
              onClick={() => setEditingSection('skills')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
        {user.current_skills && user.current_skills.length > 0 ? (
          <ChipList items={user.current_skills} type="skill" showAll />
        ) : (
          <p className="text-gray-500 italic">No skills added yet</p>
        )}
      </div>

      {/* Hobbies Section */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Hobbies</h2>
          {isOwnProfile && (
            <button
              onClick={() => setEditingSection('hobbies')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>
        {user.hobbies && user.hobbies.length > 0 ? (
          <ChipList items={user.hobbies} type="hobby" showAll />
        ) : (
          <p className="text-gray-500 italic">No hobbies added yet</p>
        )}
      </div>

      {/* Legacy Fields (if present) */}
      {(user.bio || user.research_areas) && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">About</h2>
          {user.bio && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Bio
              </h3>
              <p className="text-gray-700">{user.bio}</p>
            </div>
          )}
          {user.research_areas && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Research Areas
              </h3>
              <p className="text-gray-700">{user.research_areas}</p>
            </div>
          )}
        </div>
      )}

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
