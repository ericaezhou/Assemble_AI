'use client';

import { useState } from 'react';

interface OnboardingFormProps {
  onComplete: (userId: number) => void;
}

export default function OnboardingForm({ onComplete }: OnboardingFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    research_areas: '',
    bio: '',
    interests: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/researchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        onComplete(data.id);
      } else {
        setError(data.error || 'Failed to create profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700 p-5">
      <div className="bg-white rounded-xl p-10 max-w-2xl w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Research Connect</h1>
        <p className="text-gray-600 mb-8">Create your profile to connect with fellow researchers</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block mb-2 text-gray-700 font-medium text-sm">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-2 text-gray-700 font-medium text-sm">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="institution" className="block mb-2 text-gray-700 font-medium text-sm">
              Institution
            </label>
            <input
              type="text"
              id="institution"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="research_areas" className="block mb-2 text-gray-700 font-medium text-sm">
              Research Areas (comma-separated)
            </label>
            <input
              type="text"
              id="research_areas"
              name="research_areas"
              value={formData.research_areas}
              onChange={handleChange}
              placeholder="e.g., Machine Learning, Computer Vision, NLP"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="interests" className="block mb-2 text-gray-700 font-medium text-sm">
              Research Interests (comma-separated)
            </label>
            <input
              type="text"
              id="interests"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              placeholder="e.g., Deep Learning, Image Recognition, Healthcare"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block mb-2 text-gray-700 font-medium text-sm">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about your research background and goals..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base focus:border-indigo-500 focus:outline-none transition-colors resize-y"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? 'Creating Profile...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
