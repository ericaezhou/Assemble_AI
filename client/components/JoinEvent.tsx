'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/utils/auth';

type JoinStep = 'enter-id' | 'questions';
type QuestionType = 'text' | 'options' | 'checkbox' | 'social';

interface ParsedQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  selectionType?: 'single' | 'multiple';
  platform?: string;
  required: boolean;
}

interface EventPreview {
  id: string;
  name: string;
  require_approval: boolean;
  rsvp_questions?: string[];
}

interface JoinEventProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinEvent({ userId, onClose, onSuccess }: JoinEventProps) {
  const [step, setStep] = useState<JoinStep>('enter-id');
  const [eventId, setEventId] = useState('');
  const [eventPreview, setEventPreview] = useState<EventPreview | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedQuestions: ParsedQuestion[] = (eventPreview?.rsvp_questions || []).flatMap(q => {
    try { return [JSON.parse(q) as ParsedQuestion]; } catch { return []; }
  });

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/conferences/${eventId.trim()}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Event not found'); setLoading(false); return; }

      setEventPreview(data);
      const questions: ParsedQuestion[] = (data.rsvp_questions || []).flatMap((q: string) => {
        try { return [JSON.parse(q) as ParsedQuestion]; } catch { return []; }
      });

      if (data.require_approval && questions.length > 0) {
        const initial: Record<string, string | string[]> = {};
        questions.forEach(q => {
          initial[q.id] = q.type === 'options' && q.selectionType === 'multiple' ? [] : '';
        });
        setAnswers(initial);
        setStep('questions');
        setLoading(false);
      } else {
        await doJoin([], data.id);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const doJoin = async (rsvpResponses: string[], id?: string) => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`/api/conferences/${id ?? eventId.trim()}/join`, {
        method: 'POST',
        body: JSON.stringify({
          researcher_id: userId,
          ...(rsvpResponses.length > 0 ? { rsvp_responses: rsvpResponses } : {}),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to join event');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (const q of parsedQuestions) {
      if (q.required) {
        const ans = answers[q.id];
        const isEmpty = !ans || (Array.isArray(ans) && ans.length === 0) || ans === '';
        if (isEmpty) {
          setError(`Please answer: "${q.question}"`);
          return;
        }
      }
    }

    const responses = parsedQuestions.map(q => {
      const ans = answers[q.id];
      if (Array.isArray(ans)) return ans.length > 0 ? `${q.question}: ${ans.join(', ')}` : '';
      if (q.type === 'checkbox') return ans === 'checked' ? `${q.question}: Yes` : `${q.question}: No`;
      return ans ? `${q.question}: ${ans}` : '';
    }).filter(Boolean);

    await doJoin(responses);
  };

  const setAnswer = (qId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const toggleOption = (qId: string, option: string) => {
    setAnswers(prev => {
      const current = (prev[qId] as string[]) || [];
      return {
        ...prev,
        [qId]: current.includes(option) ? current.filter(o => o !== option) : [...current, option],
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: '2px solid var(--border)' }}>
          <div>
            <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>
              {step === 'enter-id' ? 'Join Event' : 'Apply to Join'}
            </h2>
            {step === 'questions' && eventPreview && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{eventPreview.name}</p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Enter event ID */}
        {step === 'enter-id' && (
          <form onSubmit={handleContinue}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>Event ID</label>
                <input
                  type="text"
                  value={eventId}
                  onChange={e => setEventId(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g., A1B2C3D4"
                  className="input w-full text-center text-lg tracking-widest font-mono uppercase"
                />
                <p className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Enter the 8-character event ID provided by the host
                </p>
              </div>
              {error && <ErrorBox message={error} />}
            </div>
            <div className="px-6 py-4" style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
              <button
                type="submit"
                disabled={loading || !eventId.trim()}
                className="btn btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner text="Looking up..." /> : 'Continue'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Answer questions */}
        {step === 'questions' && (
          <form onSubmit={handleSubmitAnswers}>
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'var(--bg)', border: '2px solid var(--border-light)' }}>
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  This event requires host approval. Answer the questions below and your application will be reviewed.
                </p>
              </div>

              {parsedQuestions.map(q => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={val => setAnswer(q.id, val)}
                  onToggleOption={opt => toggleOption(q.id, opt)}
                />
              ))}

              {error && <ErrorBox message={error} />}
            </div>
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
              <button
                type="button"
                onClick={() => { setStep('enter-id'); setError(''); }}
                className="btn btn-ghost flex-shrink-0"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner text="Submitting..." /> : 'Submit Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: '#fef2f2', color: '#dc2626', border: '2px solid #fca5a5' }}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {text}
    </span>
  );
}

function QuestionField({
  question: q,
  value,
  onChange,
  onToggleOption,
}: {
  question: ParsedQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
  onToggleOption: (option: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
        {q.question}
        {q.required && <span className="ml-1" style={{ color: '#ef4444' }}>*</span>}
        {q.type === 'social' && q.platform && (
          <span className="ml-1.5 font-normal text-xs" style={{ color: 'var(--text-muted)' }}>({q.platform})</span>
        )}
      </label>

      {/* Text / Social */}
      {(q.type === 'text' || q.type === 'social') && (
        <input
          type="text"
          className="input w-full text-sm"
          placeholder={q.type === 'social' ? `Your ${q.platform} URL or username` : 'Your answer'}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {/* Checkbox (yes/no) */}
      {q.type === 'checkbox' && (
        <button
          type="button"
          onClick={() => onChange(value === 'checked' ? '' : 'checked')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              border: '2px solid',
              borderColor: value === 'checked' ? 'var(--accent)' : 'var(--border)',
              background: value === 'checked' ? 'var(--accent)' : 'transparent',
            }}
          >
            {value === 'checked' && (
              <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm" style={{ color: 'var(--text)' }}>Yes, I agree</span>
        </button>
      )}

      {/* Options — Single */}
      {q.type === 'options' && q.options && q.selectionType !== 'multiple' && (
        <div className="space-y-2">
          {q.options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="flex items-center gap-3 w-full p-2.5 rounded-lg text-left transition-colors"
              style={{
                border: '2px solid',
                borderColor: (value as string) === opt ? 'var(--accent)' : 'var(--border-light)',
                background: (value as string) === opt ? 'var(--accent-light)' : 'transparent',
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ border: '2px solid', borderColor: (value as string) === opt ? 'var(--accent)' : 'var(--border)' }}
              >
                {(value as string) === opt && (
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </div>
              <span className="text-sm" style={{ color: 'var(--text)' }}>{opt}</span>
            </button>
          ))}
        </div>
      )}

      {/* Options — Multiple */}
      {q.type === 'options' && q.options && q.selectionType === 'multiple' && (
        <div className="flex flex-wrap gap-2">
          {q.options.map(opt => {
            const selected = (value as string[])?.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggleOption(opt)}
                className="tag flex items-center gap-1.5 transition-colors"
                style={selected
                  ? { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : {}}
              >
                {selected && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
