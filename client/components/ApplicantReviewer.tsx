'use client';

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/utils/auth';

interface Category {
  name: string;
  target_pct: number;
}

interface ReviewCriteria {
  prompt: string;
  categories: Category[];
  special_requests: string;
}

interface AIReview {
  overall_score?: number;
  category?: string;
  recommendation?: 'accept' | 'waitlist' | 'decline';
  reasoning?: string;
}

interface Applicant {
  id: string;
  name: string;
  email?: string;
  occupation?: string;
  school?: string;
  major?: string;
  year?: string;
  company?: string;
  title?: string;
  degree?: string;
  research_area?: string;
  interest_areas?: string[];
  current_skills?: string[];
  bio?: string;
  linkedin?: string;
  github?: string;
  joined_at: string;
  status: string;
  rsvp_responses?: string[];
  host_notes?: string;
  ai_score?: number;
  ai_review?: AIReview;
  final_decision?: string;
  localDecision?: 'accept' | 'waitlist' | 'decline';
}

interface ApplicantReviewerProps {
  eventId: string;
  userId: string;
  eventName: string;
  onConfirmed?: () => void | Promise<void>;
}

type ReviewPhase = 'setup' | 'review';

const DECISION_STYLES = {
  accept:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-700', label: 'Accept'   },
  waitlist:{ bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-300',   badge: 'bg-amber-100  text-amber-700',   label: 'Waitlist' },
  decline: { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-300',     badge: 'bg-red-100   text-red-600',     label: 'Decline'  },
};

// Colour palette for ICP type badges — cycles through on index
const TYPE_COLOURS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100    text-sky-700',
  'bg-pink-100   text-pink-700',
  'bg-teal-100   text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

function typeColour(name: string, categories: Category[]): string {
  const idx = categories.findIndex(c => c.name.toLowerCase() === name?.toLowerCase());
  return TYPE_COLOURS[(idx < 0 ? 0 : idx) % TYPE_COLOURS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarGradient(name: string) {
  const g = ['from-indigo-400 to-purple-500','from-pink-400 to-rose-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-cyan-400 to-blue-500','from-violet-400 to-fuchsia-500'];
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return g[Math.abs(h) % g.length];
}

function tagline(a: Applicant): string {
  return [
    a.school || a.company,
    a.major || a.title,
    a.year,
  ].filter(Boolean).join(' · ');
}

// ── Profile Drawer ────────────────────────────────────────────────────────────
function ProfileDrawer({
  applicant,
  categories,
  onClose,
  onDecision,
}: {
  applicant: Applicant;
  categories: Category[];
  onClose: () => void;
  onDecision: (id: string, d: 'accept' | 'waitlist' | 'decline') => void;
}) {
  const decision = applicant.localDecision;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* drawer */}
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-100">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(applicant.name)} flex items-center justify-center text-white text-lg font-bold flex-shrink-0`}>
            {getInitials(applicant.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">{applicant.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{tagline(applicant)}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {applicant.ai_review?.category && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColour(applicant.ai_review.category, categories)}`}>
                  {applicant.ai_review.category}
                </span>
              )}
              {applicant.ai_score != null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  applicant.ai_score >= 7 ? 'bg-emerald-100 text-emerald-700' :
                  applicant.ai_score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                }`}>
                  {applicant.ai_score.toFixed(1)} / 10
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 p-6 space-y-5">
          {/* Bio */}
          {applicant.bio && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">About</p>
              <p className="text-sm text-gray-700 leading-relaxed">{applicant.bio}</p>
            </div>
          )}

          {/* Research / description */}
          {applicant.research_area && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Research</p>
              <p className="text-sm text-gray-700">{applicant.research_area}</p>
            </div>
          )}

          {/* Skills */}
          {applicant.current_skills && applicant.current_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {applicant.current_skills.map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {applicant.interest_areas && applicant.interest_areas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {applicant.interest_areas.map(i => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">{i}</span>
                ))}
              </div>
            </div>
          )}

          {/* RSVP answers */}
          {applicant.rsvp_responses && applicant.rsvp_responses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">RSVP Answers</p>
              <div className="space-y-1.5">
                {applicant.rsvp_responses.map((ans, i) => (
                  <p key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{ans}</p>
                ))}
              </div>
            </div>
          )}

          {/* AI reasoning */}
          {applicant.ai_review?.reasoning && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">AI Assessment</p>
              <p className="text-sm text-indigo-800 leading-relaxed italic">&ldquo;{applicant.ai_review.reasoning}&rdquo;</p>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-3">
            {applicant.linkedin && (
              <a href={applicant.linkedin} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            )}
            {applicant.github && (
              <a href={applicant.github} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            )}
          </div>
        </div>

        {/* Decision footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Decision</p>
          <div className="flex gap-2">
            {(['accept', 'waitlist', 'decline'] as const).map(d => {
              const s = DECISION_STYLES[d];
              const selected = decision === d;
              return (
                <button key={d}
                  onClick={() => onDecision(applicant.id, d)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                    selected ? `${s.bg} ${s.text} ${s.border} shadow-sm` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ApplicantReviewer({ eventId, onConfirmed }: ApplicantReviewerProps) {
  const [phase, setPhase]                   = useState<ReviewPhase>('setup');
  const [applicants, setApplicants]         = useState<Applicant[]>([]);
  const [reviewCriteria, setReviewCriteria] = useState<ReviewCriteria>({ prompt: '', categories: [], special_requests: '' });
  const [promptInput, setPromptInput]       = useState('');
  const [generatingCriteria, setGeneratingCriteria] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [runningReview, setRunningReview]   = useState(false);
  const [confirmingAll, setConfirmingAll]   = useState(false);
  const [confirmed, setConfirmed]           = useState(false);
  const [loading, setLoading]               = useState(true);
  // statusFilter is purely client-side — we always fetch all applicants
  const [statusFilter, setStatusFilter]     = useState<'all' | 'undecided' | 'accept' | 'waitlist' | 'decline'>('all');
  const [typeFilter, setTypeFilter]         = useState<string>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isExpanded, setIsExpanded]         = useState(false);

  // Always fetch ALL applicants — filtering happens client-side so stats never go stale
  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authenticatedFetch(`/api/conferences/${eventId}/applicants?status=all`);
      const data = await res.json();
      setApplicants((data.applicants || []).map((a: Applicant) => ({
        ...a,
        localDecision: (a.final_decision as 'accept' | 'waitlist' | 'decline' | undefined)
                    ?? (a.ai_review?.recommendation as 'accept' | 'waitlist' | 'decline' | undefined),
      })));
      if (data.review_criteria) {
        setReviewCriteria(data.review_criteria);
        setPromptInput(data.review_criteria.prompt || '');
        if (data.review_criteria.categories?.length > 0) setPhase('review');
      }
    } catch (err) {
      console.error('Error fetching applicants:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]); // no statusFilter dep — fetch is always all

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  // Sync drawer with latest local state
  useEffect(() => {
    if (selectedApplicant) {
      const updated = applicants.find(a => a.id === selectedApplicant.id);
      if (updated) setSelectedApplicant(updated);
    }
  }, [applicants]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateCriteria = async () => {
    if (!promptInput.trim()) return;
    setGeneratingCriteria(true);
    try {
      const res  = await authenticatedFetch(`/api/conferences/${eventId}/generate-criteria`, {
        method: 'POST',
        body: JSON.stringify({ prompt: promptInput }),
      });
      const data = await res.json();
      if (data.categories) setReviewCriteria(prev => ({ ...prev, prompt: promptInput, categories: data.categories }));
    } catch (err) {
      console.error('Error generating criteria:', err);
    } finally {
      setGeneratingCriteria(false);
    }
  };

  const handleSliderChange = (index: number, value: number) => {
    setReviewCriteria(prev => {
      const updated = [...prev.categories];
      updated[index] = { ...updated[index], target_pct: value };
      return { ...prev, categories: updated };
    });
  };

  const totalPct = reviewCriteria.categories.reduce((sum, c) => sum + c.target_pct, 0);

  const handleSaveCriteria = async () => {
    setSavingCriteria(true);
    try {
      await authenticatedFetch(`/api/conferences/${eventId}/review-criteria`, {
        method: 'PUT',
        body: JSON.stringify(reviewCriteria),
      });
      setPhase('review');
      await fetchApplicants();
    } catch (err) {
      console.error('Error saving criteria:', err);
    } finally {
      setSavingCriteria(false);
    }
  };

  const handleRunAIReview = async () => {
    setRunningReview(true);
    setConfirmed(false);
    try {
      const res  = await authenticatedFetch(`/api/conferences/${eventId}/run-ai-review`, { method: 'POST' });
      const data = await res.json();
      if (data.results) {
        setApplicants(prev => prev.map(a => {
          const r = data.results.find((x: { researcher_id: string }) => x.researcher_id === a.id);
          if (!r || r.error) return a;
          return { ...a, ai_score: r.overall_score, ai_review: r, localDecision: r.recommendation };
        }));
      }
    } catch (err) {
      console.error('Error running AI review:', err);
    } finally {
      setRunningReview(false);
    }
  };

  // Auto-save final_decision draft on each toggle (no status change yet — that's Publish)
  const handleDecisionChange = async (applicantId: string, decision: 'accept' | 'waitlist' | 'decline') => {
    // Optimistic update
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, localDecision: decision } : a));
    try {
      await authenticatedFetch(`/api/conferences/${eventId}/applicants/${applicantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ final_decision: decision }), // publish: false → only saves draft
      });
    } catch (err) {
      console.error('Error saving decision draft:', err);
    }
  };

  // Publish All — sets participant status based on final_decision, refreshes participants tab
  const handleConfirmAll = async () => {
    setConfirmingAll(true);
    try {
      await Promise.all(
        applicants
          .filter(a => a.localDecision)
          .map(a => authenticatedFetch(`/api/conferences/${eventId}/applicants/${a.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ final_decision: a.localDecision, publish: true }),
          }))
      );
      setConfirmed(true);
      await fetchApplicants();
      await onConfirmed?.();
    } catch (err) {
      console.error('Error publishing decisions:', err);
    } finally {
      setConfirmingAll(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const icpTypes = reviewCriteria.categories.map(c => c.name);

  // Stats reflect local decisions immediately (not DB status)
  const undecidedCount = applicants.filter(a => !a.localDecision).length;
  const acceptedCount  = applicants.filter(a => a.localDecision === 'accept').length;
  const waitlistCount  = applicants.filter(a => a.localDecision === 'waitlist').length;
  const declinedCount  = applicants.filter(a => a.localDecision === 'decline').length;
  const reviewedCount  = applicants.filter(a => a.ai_review).length;
  // pending = still in DB as pending (unreviewed by AI yet)
  const pendingCount   = applicants.filter(a => a.status === 'pending').length;

  const visibleApplicants = applicants.filter(a => {
    const typeMatch = typeFilter === 'all' || a.ai_review?.category === typeFilter;
    const statusMatch =
      statusFilter === 'all'       ? true :
      statusFilter === 'undecided' ? !a.localDecision :
      a.localDecision === statusFilter;
    return typeMatch && statusMatch;
  });

  // ── SETUP PHASE ────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Set Up Review Criteria</h2>
          <p className="text-sm text-gray-500">Describe your ideal attendee mix and Assemble AI will generate tunable scoring criteria.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ideal Attendee Profile</label>
          <textarea
            rows={3}
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            placeholder="e.g. 40% builders, 25% students, 20% founders, 15% VCs — strong AI/ML background preferred"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-indigo-400 focus:outline-none resize-none"
          />
          <button
            onClick={handleGenerateCriteria}
            disabled={generatingCriteria || !promptInput.trim()}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {generatingCriteria
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              : 'Generate Criteria →'}
          </button>
        </div>

        {reviewCriteria.categories.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tune Your Criteria</label>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${totalPct === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                Total: {totalPct}%
              </span>
            </div>
            <div className="space-y-3">
              {reviewCriteria.categories.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-28 flex-shrink-0 truncate text-center ${TYPE_COLOURS[i % TYPE_COLOURS.length]}`}>
                    {cat.name}
                  </span>
                  <input
                    type="range" min={0} max={100} value={cat.target_pct}
                    onChange={e => handleSliderChange(i, parseInt(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-sm font-semibold text-indigo-600 w-10 text-right">{cat.target_pct}%</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Special Requests</label>
              <textarea
                rows={2}
                value={reviewCriteria.special_requests}
                onChange={e => setReviewCriteria(prev => ({ ...prev, special_requests: e.target.value }))}
                placeholder="e.g. Prefer CMU/Stanford affiliations; no more than 2 people from the same company"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-indigo-400 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSaveCriteria}
              disabled={savingCriteria || totalPct !== 100}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {savingCriteria
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : 'Save & Start Reviewing →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── REVIEW PHASE ───────────────────────────────────────────────────────────
  const reviewContent = (
    <>
      {selectedApplicant && (
        <ProfileDrawer
          applicant={selectedApplicant}
          categories={reviewCriteria.categories}
          onClose={() => setSelectedApplicant(null)}
          onDecision={(id, d) => { handleDecisionChange(id, d); }}
        />
      )}

      <div className={`p-6 space-y-4 ${isExpanded ? 'max-w-5xl mx-auto' : ''}`}>
        {/* ── Header row ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stats — derived from localDecision so they update instantly on toggle */}
          <div className="flex gap-4 flex-1 min-w-0">
            {[
              { label: 'Undecided', count: undecidedCount, colour: 'text-gray-600'   },
              { label: 'Accepted',  count: acceptedCount,  colour: 'text-emerald-600' },
              { label: 'Waitlist',  count: waitlistCount,  colour: 'text-amber-600'   },
              { label: 'Declined',  count: declinedCount,  colour: 'text-red-500'     },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold ${s.colour}`}>{s.count}</p>
                <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Expand / collapse toggle */}
          <button
            onClick={() => setIsExpanded(e => !e)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0M4 4v5M15 9l5-5m0 0l-5 0m5 0v5M9 15l-5 5m0 0l5 0m-5 0v-5M15 15l5 5m0 0l-5 0m5 0v-5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
              </svg>
            )}
          </button>

          <button onClick={() => setPhase('setup')} className="text-xs text-indigo-600 hover:underline">
            Edit Criteria
          </button>
          <button
            onClick={handleRunAIReview}
            disabled={runningReview || pendingCount === 0}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {runningReview
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Reviewing...</>
              : `Run AI Review (${pendingCount})`}
          </button>
          {applicants.some(a => a.localDecision) && (
            <button
              onClick={handleConfirmAll}
              disabled={confirmingAll}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {confirmingAll
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</>
                : 'Publish Decisions ✓'}
            </button>
          )}
        </div>

        {confirmed && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
            Decisions published! Accepted applicants now appear in the Participants tab.
          </div>
        )}

        {/* ── Decision filter tabs ── */}
        <div className="flex gap-1 border-b border-gray-100">
          {([
            { key: 'all',       label: 'All'       },
            { key: 'undecided', label: 'Undecided' },
            { key: 'accept',    label: 'Accepted'  },
            { key: 'waitlist',  label: 'Waitlisted'},
            { key: 'decline',   label: 'Declined'  },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`px-3 py-2 text-xs font-semibold transition-colors relative ${
                statusFilter === key ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700'
              }`}>
              {label}
              {statusFilter === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* ── ICP Type filter (only shown after AI review has run) ── */}
        {reviewedCount > 0 && icpTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                typeFilter === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}>
              All Types
            </button>
            {icpTypes.map((t, i) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                  typeFilter === t
                    ? `${TYPE_COLOURS[i % TYPE_COLOURS.length]} border-current`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* ── Applicant list ── */}
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading applicants...</div>
        ) : visibleApplicants.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No applicants in this view.</div>
        ) : (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {visibleApplicants.map(applicant => {
              const decision = applicant.localDecision;
              const style = decision ? DECISION_STYLES[decision] : null;
              const category = applicant.ai_review?.category;

              return (
                <div
                  key={applicant.id}
                  onClick={() => setSelectedApplicant(applicant)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    style ? `${style.bg} ${style.border}` : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(applicant.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {getInitials(applicant.name)}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{applicant.name}</span>
                        {category && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColour(category, reviewCriteria.categories)}`}>
                            {category}
                          </span>
                        )}
                        {applicant.ai_score != null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            applicant.ai_score >= 7 ? 'bg-emerald-100 text-emerald-700' :
                            applicant.ai_score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {applicant.ai_score.toFixed(1)}/10
                          </span>
                        )}
                        {decision && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-auto ${style!.badge}`}>
                            {DECISION_STYLES[decision].label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{tagline(applicant)}</p>
                      {applicant.interest_areas && applicant.interest_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {applicant.interest_areas.slice(0, 3).map(area => (
                            <span key={area} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{area}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Decision buttons — stop propagation so clicking them doesn't open drawer */}
                  <div
                    className="flex gap-2 mt-3 pt-3 border-t border-black/5"
                    onClick={e => e.stopPropagation()}
                  >
                    {(['accept', 'waitlist', 'decline'] as const).map(d => {
                      const s = DECISION_STYLES[d];
                      const selected = decision === d;
                      return (
                        <button key={d}
                          onClick={() => handleDecisionChange(applicant.id, d)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            selected ? `${s.bg} ${s.text} ${s.border} border shadow-sm` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // ── Expanded = full-screen overlay, collapsed = inline ───────────────────
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Review Applicants</p>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 0M4 4v5M15 9l5-5m0 0l-5 0m5 0v5M9 15l-5 5m0 0l5 0m-5 0v-5M15 15l5 5m0 0l-5 0m5 0v-5" />
            </svg>
            Collapse
          </button>
        </div>
        {reviewContent}
      </div>
    );
  }

  return reviewContent;
}
