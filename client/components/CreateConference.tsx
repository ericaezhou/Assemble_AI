'use client';

import { useState } from 'react';

interface CreateConferenceProps {
  userId: number;
  onClose: () => void;
  onSuccess: (conferenceId: string) => void;
}

export default function CreateConference({ userId, onClose, onSuccess }: CreateConferenceProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/conferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          host_id: userId
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data.id);
      } else {
        setError(data.error || 'Failed to create conference');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create Conference</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-2 text-gray-700 font-medium text-sm">
              Conference Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., AI Research Summit 2025"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="location" className="block mb-2 text-gray-700 font-medium text-sm">
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="e.g., San Francisco, CA"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="start_date" className="block mb-2 text-gray-700 font-medium text-sm">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block mb-2 text-gray-700 font-medium text-sm">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
