'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/utils/auth';

interface JoinEventProps {
  userId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinEvent({ userId, onClose, onSuccess }: JoinEventProps) {
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authenticatedFetch(`/api/conferences/${eventId}/join`, {
        method: 'POST',
        body: JSON.stringify({
          researcher_id: userId
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to join event');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Join Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="eventId" className="block mb-2 text-sm font-medium text-gray-700">
                Event ID
              </label>
              <input
                type="text"
                id="eventId"
                name="eventId"
                value={eventId}
                onChange={(e) => setEventId(e.target.value.toUpperCase())}
                required
                placeholder="e.g., A1B2C3D4"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 font-mono text-center text-lg tracking-widest focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors uppercase"
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 8-character event ID provided by the host
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="submit"
              disabled={loading || !eventId}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
