'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/utils/auth';

interface JoinEventProps {
  userId: string;
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
      <div className="card w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: '2px solid var(--border)' }}>
          <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Join Event</h2>
          <button
            onClick={onClose}
            className="btn-ghost p-2 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="eventId" className="block mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
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
                className="input w-full text-center text-lg tracking-widest font-mono uppercase"
              />
              <p className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Enter the 8-character event ID provided by the host
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: '#fef2f2', color: '#dc2626', border: '2px solid #fca5a5' }}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4" style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
            <button
              type="submit"
              disabled={loading || !eventId}
              className="btn btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
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
