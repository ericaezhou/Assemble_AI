'use client';

import { useState, useEffect } from 'react';

interface LinkedInImportQuestionProps {
  question: string;
  subtitle?: string;
  onScrape: (url: string) => Promise<void>;
  onFallback: (toPath: 'resume' | 'manual') => void;
  scrapeStatus: 'idle' | 'loading' | 'done' | 'error';
  error?: string | null;
  exhaustedPaths: string[];
}

const MAX_ATTEMPTS = 3;

// Extract slug from various LinkedIn URL formats
function extractLinkedInSlug(value: string): string {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?$/i
  );
  if (urlMatch) return urlMatch[1];
  return trimmed.replace(/^@/, '');
}

export default function LinkedInImportQuestion({
  question,
  subtitle,
  onScrape,
  onFallback,
  scrapeStatus,
  error,
  exhaustedPaths,
}: LinkedInImportQuestionProps) {
  const [slug, setSlug] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [linkedinFocused, setLinkedinFocused] = useState(false);

  const exhausted = attempts >= MAX_ATTEMPTS;
  const resumeExhausted = exhaustedPaths.includes('resume');

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('linkedin-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    const trimmed = slug.trim();
    if (!trimmed) {
      setValidationError('Please enter your LinkedIn profile slug or URL');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setValidationError('Invalid LinkedIn profile slug');
      return;
    }
    setValidationError(null);

    const fullUrl = `https://www.linkedin.com/in/${trimmed}`;
    setAttempts((prev) => prev + 1);
    await onScrape(fullUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !exhausted && scrapeStatus !== 'loading') {
      handleSubmit();
    }
  };

  const isLoading = scrapeStatus === 'loading';

  return (
    <div className="text-center space-y-10">
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          {question}
        </h2>
        {subtitle && (
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {!exhausted ? (
        <>
          {/* LinkedIn input */}
          <div className="space-y-4">
            <div className="relative max-w-md mx-auto">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                style={{ color: 'var(--text-muted)' }}
              >
                linkedin.com/in/
              </span>
              <input
                id="linkedin-input"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(extractLinkedInSlug(e.target.value));
                  setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setLinkedinFocused(true)}
                onBlur={() => setLinkedinFocused(false)}
                placeholder="yourname"
                disabled={isLoading}
                className="w-full pl-40 pr-6 py-5 text-xl rounded-lg outline-none transition-all duration-200"
                style={{
                  background: 'var(--surface)',
                  border: `2px solid ${linkedinFocused ? 'var(--accent)' : validationError || error ? '#f87171' : 'var(--border-light)'}`,
                  color: 'var(--text)',
                }}
              />
            </div>

            {(validationError || (error && scrapeStatus === 'error')) && (
              <p className="text-sm animate-in fade-in duration-200" style={{ color: '#ef4444' }}>
                {validationError || error}
              </p>
            )}
            {scrapeStatus === 'error' && !validationError && attempts < MAX_ATTEMPTS && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Please check your profile link and try again ({MAX_ATTEMPTS - attempts}{' '}
                {MAX_ATTEMPTS - attempts === 1 ? 'attempt' : 'attempts'} remaining)
              </p>
            )}
          </div>

          {/* Action button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !slug.trim()}
              className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ padding: '16px 32px', fontSize: '1.125rem' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }}
                  />
                  Importing...
                </span>
              ) : (
                'Import from LinkedIn'
              )}
            </button>
          </div>

          {/* Skip link */}
          <button
            onClick={() => onFallback('manual')}
            disabled={isLoading}
            className="text-base transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            Skip &mdash; I&apos;ll fill it in manually
          </button>
        </>
      ) : (
        /* Exhausted state — show fallback options */
        <div className="space-y-6 max-w-md mx-auto">
          <div
            className="p-6 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-light)' }}
          >
            <p className="text-base mb-1" style={{ color: 'var(--text)' }}>
              We weren&apos;t able to import your LinkedIn profile.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No worries — you can try another way to get started.
            </p>
          </div>

          <div className="space-y-3">
            {!resumeExhausted && (
              <button
                onClick={() => onFallback('resume')}
                className="btn w-full"
                style={{
                  padding: '14px 24px',
                  fontSize: '1rem',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                }}
              >
                Upload resume instead
              </button>
            )}
            <button
              onClick={() => onFallback('manual')}
              className="btn w-full"
              style={{
                padding: '14px 24px',
                fontSize: '1rem',
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border-light)',
              }}
            >
              Fill in manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
