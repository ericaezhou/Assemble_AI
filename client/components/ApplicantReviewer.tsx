'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authenticatedFetch } from '@/utils/auth';
import { getInitialsFromName } from '@/utils/name';

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
  source?: 'registered' | 'csv';
  name: string;
  email?: string;
  occupation?: string;
  occupation_tags?: string[];
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

const TYPE_COLOURS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100    text-sky-700',
  'bg-pink-100   text-pink-700',
  'bg-teal-100   text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100  text-amber-700',
];

function typeColour(name: string, categories: Category[]): string {
  const idx = categories.findIndex(c => c.name.toLowerCase() === name?.toLowerCase());
  return TYPE_COLOURS[(idx < 0 ? 0 : idx) % TYPE_COLOURS.length];
}

function tagline(a: Applicant): string {
  return [a.school || a.company, a.major || a.title, a.year].filter(Boolean).join(' · ');
}

// ── Profile Drawer ─────────────────────────────────────────────────────────────
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-md h-full overflow-y-auto flex flex-col" style={{ background: 'var(--surface)', borderLeft: '2px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-start gap-4 p-6" style={{ borderBottom: '2px solid var(--border-light)' }}>
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-lg font-black flex-shrink-0"
            style={{ background: 'var(--accent-light)', border: '2px solid var(--accent)', color: 'var(--accent)' }}
          >
            {getInitialsFromName(applicant.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black" style={{ color: 'var(--text)' }}>{applicant.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{tagline(applicant)}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {applicant.ai_review?.category && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColour(applicant.ai_review.category, categories)}`}>
                  {applicant.ai_review.category}
                </span>
              )}
              {applicant.occupation_tags && applicant.occupation_tags.map(tag => (
                <span key={tag} className="tag capitalize" style={{ fontSize: '0.7rem' }}>{tag}</span>
              ))}
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
          <button onClick={onClose} className="btn-ghost p-1 rounded" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-5">
          {applicant.bio && (
            <div>
              <p className="section-heading mb-1">About</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{applicant.bio}</p>
            </div>
          )}
          {applicant.research_area && (
            <div>
              <p className="section-heading mb-1">Research</p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{applicant.research_area}</p>
            </div>
          )}
          {applicant.current_skills && applicant.current_skills.length > 0 && (
            <div>
              <p className="section-heading mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {applicant.current_skills.map(s => (
                  <span key={s} className="tag" style={{ fontSize: '0.7rem' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {applicant.interest_areas && applicant.interest_areas.length > 0 && (
            <div>
              <p className="section-heading mb-1.5">Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {applicant.interest_areas.map(i => (
                  <span key={i} className="tag tag-accent" style={{ fontSize: '0.7rem' }}>{i}</span>
                ))}
              </div>
            </div>
          )}
          {applicant.rsvp_responses && applicant.rsvp_responses.length > 0 && (
            <div>
              <p className="section-heading mb-1.5">RSVP Answers</p>
              <div className="space-y-1.5">
                {applicant.rsvp_responses.map((ans, i) => (
                  <p key={i} className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border-light)' }}>{ans}</p>
                ))}
              </div>
            </div>
          )}
          {applicant.ai_review?.reasoning && (
            <div className="rounded-lg px-4 py-3" style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)' }}>
              <p className="section-heading mb-1" style={{ color: 'var(--accent)' }}>AI Assessment</p>
              <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text)' }}>&ldquo;{applicant.ai_review.reasoning}&rdquo;</p>
            </div>
          )}
          <div className="flex gap-2">
            {applicant.linkedin && (
              <a href={applicant.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            )}
            {applicant.github && (
              <a href={applicant.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            )}
          </div>
        </div>

        {/* Decision footer */}
        <div className="p-5" style={{ borderTop: '2px solid var(--border-light)', background: 'var(--bg)' }}>
          <p className="section-heading mb-3">Decision</p>
          <div className="flex gap-2">
            {(['accept', 'waitlist', 'decline'] as const).map(d => {
              const s = DECISION_STYLES[d];
              const selected = decision === d;
              return (
                <button key={d}
                  onClick={() => onDecision(applicant.id, d)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-all ${
                    selected ? `${s.bg} ${s.text} ${s.border}` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [statusFilter, setStatusFilter]     = useState<'all' | 'undecided' | 'accept' | 'waitlist' | 'decline'>('all');
  const [typeFilter, setTypeFilter]         = useState<string>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isExpanded, setIsExpanded]         = useState(false);
  const [uploadingCSV, setUploadingCSV]     = useState(false);
  const [csvResult, setCsvResult]           = useState<{ imported: number; skipped: number } | null>(null);
  const csvInputRef                         = useRef<HTMLInputElement>(null);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authenticatedFetch(`/api/conferences/${eventId}/applicants?status=all`);
      const data = await res.json();
      setApplicants((data.applicants || []).map((a: Applicant) => ({
        ...a,
        source: a.source ?? 'registered',
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
  }, [eventId]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  useEffect(() => {
    if (selectedApplicant) {
      const updated = applicants.find(a => a.id === selectedApplicant.id);
      if (updated) setSelectedApplicant(updated);
    }
  }, [applicants]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCSVUpload = async (file: File) => {
    setUploadingCSV(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append('csv', file);
      const res  = await authenticatedFetch(`/api/conferences/${eventId}/upload-applicants`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setCsvResult({ imported: data.imported, skipped: data.skipped });
      await fetchApplicants();
    } catch (err) {
      console.error('CSV upload error:', err);
      setCsvResult({ imported: 0, skipped: 0 });
    } finally {
      setUploadingCSV(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

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

  const handleDecisionChange = async (applicantId: string, decision: 'accept' | 'waitlist' | 'decline') => {
    const applicant = applicants.find(a => a.id === applicantId);
    setApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, localDecision: decision } : a));
    try {
      await authenticatedFetch(`/api/conferences/${eventId}/applicants/${applicantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ final_decision: decision, source: applicant?.source ?? 'registered' }),
      });
    } catch (err) {
      console.error('Error saving decision draft:', err);
    }
  };

  const handleConfirmAll = async () => {
    setConfirmingAll(true);
    try {
      await Promise.all(
        applicants
          .filter(a => a.localDecision)
          .map(a => authenticatedFetch(`/api/conferences/${eventId}/applicants/${a.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ final_decision: a.localDecision, publish: true, source: a.source ?? 'registered' }),
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

  const icpTypes = reviewCriteria.categories.map(c => c.name);
  const undecidedCount = applicants.filter(a => !a.localDecision).length;
  const acceptedCount  = applicants.filter(a => a.localDecision === 'accept').length;
  const waitlistCount  = applicants.filter(a => a.localDecision === 'waitlist').length;
  const declinedCount  = applicants.filter(a => a.localDecision === 'decline').length;
  const reviewedCount  = applicants.filter(a => a.ai_review).length;
  const pendingCount   = applicants.filter(a => a.status === 'pending').length;

  const visibleApplicants = applicants.filter(a => {
    const typeMatch = typeFilter === 'all' || a.ai_review?.category === typeFilter;
    const statusMatch =
      statusFilter === 'all'       ? true :
      statusFilter === 'undecided' ? !a.localDecision :
      a.localDecision === statusFilter;
    return typeMatch && statusMatch;
  });

  // ── SETUP PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="p-6 space-y-4">
        {/* CSV Import */}
        <div>
          <h2 className="text-base font-black mb-1" style={{ color: 'var(--text)' }}>Import Applicants</h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Upload a CSV with columns: <span className="font-semibold" style={{ color: 'var(--text)' }}>full name, email, linkedin</span>
          </p>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVUpload(f); }} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={uploadingCSV}
              className="btn btn-secondary disabled:opacity-50"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              {uploadingCSV
                ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} /> Importing & enriching...</>
                : <>📄 Upload CSV</>}
            </button>
            {csvResult && (
              <span className="text-xs font-medium">
                {csvResult.imported > 0
                  ? <span className="text-emerald-600">✓ Imported {csvResult.imported}{csvResult.skipped > 0 ? `, skipped ${csvResult.skipped} duplicates` : ''}</span>
                  : <span className="text-amber-600">No new applicants imported</span>
                }
              </span>
            )}
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-light)' }} />

        <div>
          <h2 className="text-base font-black mb-1" style={{ color: 'var(--text)' }}>Review Criteria</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Describe your ideal attendee mix</p>
        </div>

        <div className="space-y-2">
          <textarea
            rows={3}
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            placeholder="e.g. 40% builders, 25% students, 20% founders, 15% VCs — strong AI/ML background preferred"
            className="input resize-none"
            style={{ padding: '12px' }}
          />
          <button
            onClick={handleGenerateCriteria}
            disabled={generatingCriteria || !promptInput.trim()}
            className="btn btn-primary w-full justify-center disabled:opacity-50"
          >
            {generatingCriteria
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              : 'Generate Criteria →'}
          </button>
        </div>

        {reviewCriteria.categories.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="section-heading">Fine-tuning</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${totalPct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                Total: {totalPct}%
              </span>
            </div>
            <div className="space-y-3">
              {reviewCriteria.categories.map((cat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <textarea
                    rows={1}
                    value={cat.name}
                    ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
                    onChange={e => {
                      const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`;
                      setReviewCriteria(prev => {
                        const updated = [...prev.categories];
                        updated[i] = { ...updated[i], name: e.target.value };
                        return { ...prev, categories: updated };
                      });
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg w-28 flex-shrink-0 text-center border-none focus:outline-none resize-none overflow-hidden ${TYPE_COLOURS[i % TYPE_COLOURS.length]}`}
                  />
                  <input
                    type="range" min={0} max={100} value={cat.target_pct}
                    onChange={e => handleSliderChange(i, parseInt(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <div className="flex items-center flex-shrink-0">
                    <input
                      type="number" min={0} max={100} value={cat.target_pct}
                      onChange={e => handleSliderChange(i, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-8 text-sm font-semibold text-right bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ color: 'var(--accent)' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="section-heading">Special Requests</label>
              <textarea
                rows={2}
                value={reviewCriteria.special_requests}
                onChange={e => setReviewCriteria(prev => ({ ...prev, special_requests: e.target.value }))}
                placeholder="e.g. prefer Stanford affiliations"
                className="input resize-none"
                style={{ padding: '12px' }}
              />
            </div>

            <button
              onClick={handleSaveCriteria}
              disabled={savingCriteria || totalPct !== 100}
              className="btn btn-primary w-full justify-center disabled:opacity-50"
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

  // ── REVIEW PHASE ─────────────────────────────────────────────────────────────
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

      <div className={`p-6 ${isExpanded ? 'flex flex-col gap-4 flex-1 min-h-0 max-w-5xl mx-auto w-full' : 'space-y-4'}`}>
        {/* Action row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setPhase('setup')} className="text-xs font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Edit Criteria
            </button>
            <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVUpload(f); }} />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={uploadingCSV}
              className="btn btn-secondary disabled:opacity-50"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              {uploadingCSV
                ? <><div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} /> Enriching...</>
                : '📄 Import CSV'}
            </button>
            <button
              onClick={handleRunAIReview}
              disabled={runningReview || pendingCount === 0}
              className="btn btn-primary disabled:opacity-50"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              {runningReview
                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Reviewing...</>
                : `Run AI Review (${pendingCount})`}
            </button>
            {applicants.some(a => a.localDecision) && (
              <button
                onClick={handleConfirmAll}
                disabled={confirmingAll}
                className="btn disabled:opacity-50"
                style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#059669', color: '#fff', borderColor: '#047857' }}
              >
                {confirmingAll
                  ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</>
                  : 'Publish Decisions ✓'}
              </button>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(e => !e)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            className="btn-ghost p-1.5 rounded-lg"
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
        </div>

        {/* Filter tabs */}
        <div className="flex w-full" style={{ borderBottom: '2px solid var(--border-light)' }}>
          {([
            { key: 'all',       label: 'All',        count: applicants.length  },
            { key: 'undecided', label: 'Pending',    count: undecidedCount     },
            { key: 'accept',    label: 'Accepted',   count: acceptedCount      },
            { key: 'waitlist',  label: 'Waitlisted', count: waitlistCount      },
            { key: 'decline',   label: 'Declined',   count: declinedCount      },
          ] as Array<{ key: typeof statusFilter; label: string; count: number }>).map(({ key, label, count }) => {
            const active = statusFilter === key;
            return (
              <button key={key} onClick={() => setStatusFilter(key)}
                className="flex-1 flex flex-col items-center px-2 py-2 border-b-2 transition-all"
                style={{
                  borderBottomColor: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  opacity: active ? 1 : 0.6,
                }}
              >
                <span className="text-xl font-black leading-tight">{count}</span>
                <span className="text-xs font-medium mt-0.5">{label}</span>
              </button>
            );
          })}
        </div>

        {confirmed && (
          <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', color: '#15803d' }}>
            Decisions published! Accepted applicants now appear in the Participants tab.
          </div>
        )}

        {/* ICP Type filter */}
        {reviewedCount > 0 && icpTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`btn ${typeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '2px 10px' }}
            >
              All Types
            </button>
            {icpTypes.map((t, i) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                  typeFilter === t
                    ? `${TYPE_COLOURS[i % TYPE_COLOURS.length]} border-current`
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                style={typeFilter !== t ? { color: 'var(--text-muted)', background: 'transparent' } : {}}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Applicant list */}
        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Loading applicants...</div>
        ) : visibleApplicants.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No applicants in this view.</div>
        ) : (
          <div className={`space-y-2 overflow-y-auto pr-1 ${isExpanded ? 'flex-1 min-h-0' : 'max-h-[560px]'}`}>
            {visibleApplicants.map(applicant => {
              const decision = applicant.localDecision;
              const style = decision ? DECISION_STYLES[decision] : null;
              const category = applicant.ai_review?.category;

              return (
                <div
                  key={applicant.id}
                  onClick={() => setSelectedApplicant(applicant)}
                  className={`rounded-lg border p-4 cursor-pointer transition-all ${
                    style ? `${style.bg} ${style.border}` : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={!style ? { background: 'var(--bg)' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
                    >
                      {getInitialsFromName(applicant.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{applicant.name}</span>
                        {category && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColour(category, reviewCriteria.categories)}`}>
                            {category}
                          </span>
                        )}
                        {!category && applicant.occupation_tags && applicant.occupation_tags.length > 0 && applicant.occupation_tags.map(tag => (
                          <span key={tag} className="tag capitalize" style={{ fontSize: '0.65rem' }}>{tag}</span>
                        ))}
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
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{tagline(applicant)}</p>
                      {applicant.interest_areas && applicant.interest_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {applicant.interest_areas.slice(0, 3).map(area => (
                            <span key={area} className="tag tag-accent" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{area}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--border-light)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }} onClick={e => e.stopPropagation()}>
                    {(['accept', 'waitlist', 'decline'] as const).map(d => {
                      const s = DECISION_STYLES[d];
                      const selected = decision === d;
                      return (
                        <button key={d}
                          onClick={() => handleDecisionChange(applicant.id, d)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            selected ? `${s.bg} ${s.text} ${s.border}` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="flex-shrink-0 px-6 py-3 flex items-center justify-between" style={{ borderBottom: '2px solid var(--border-light)' }}>
          <p className="text-sm font-black" style={{ color: 'var(--text)' }}>Review Applicants</p>
          <button
            onClick={() => setIsExpanded(false)}
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
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
