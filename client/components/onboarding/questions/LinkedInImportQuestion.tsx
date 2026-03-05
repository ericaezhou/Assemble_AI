import { useState, useEffect, KeyboardEvent } from 'react';

interface LinkedInImportQuestionProps {
  question: string;
  subtitle?: string;
  onSubmit: (slug: string) => void;
  onSkip: () => void;
}

// Validate LinkedIn profile slug format
function isValidLinkedInSlug(slug: string): boolean {
  if (!slug) return false;
  return /^[a-zA-Z0-9_-]{3,100}$/.test(slug);
}

// Extract slug from various LinkedIn URL formats
function extractLinkedInSlug(value: string): string {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?$/i);
  if (urlMatch) return urlMatch[1];
  return trimmed.replace(/^@/, '');
}

export default function LinkedInImportQuestion({
  question,
  subtitle,
  onSubmit,
  onSkip,
}: LinkedInImportQuestionProps) {
  const [slug, setSlug] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('linkedin-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (value: string) => {
    const extracted = extractLinkedInSlug(value);
    setSlug(extracted);
    setError(null);
  };

  const handleSubmit = () => {
    const trimmed = slug.trim();
    if (!trimmed) return;

    if (!isValidLinkedInSlug(trimmed)) {
      setError('Invalid format. Please enter just your LinkedIn profile ID (e.g. johnny-tsunami-6767).');
      return;
    }

    onSubmit(trimmed);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && slug.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="text-center space-y-12">
      {/* Question */}
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          {question}
        </h2>
        {subtitle && (
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>

      {/* Input */}
      <div className="space-y-4">
        <div className="relative max-w-md mx-auto">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--text-muted)' }}>
            linkedin.com/in/
          </span>
          <input
            id="linkedin-input"
            type="text"
            value={slug}
            onChange={(e) => handleChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="johnny-tsunami-6767"
            className="w-full pl-40 pr-6 py-5 text-xl rounded-lg outline-none transition-all duration-200"
            style={{
              background: 'var(--surface)',
              border: `2px solid ${isFocused ? 'var(--accent)' : error ? '#f87171' : 'var(--border-light)'}`,
              color: 'var(--text)',
            }}
          />
        </div>

        {error && (
          <p className="text-sm animate-in fade-in duration-200" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center pt-8">
        <button
          onClick={handleSubmit}
          disabled={!slug.trim()}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ padding: '16px 32px', fontSize: '1.125rem' }}
        >
          Save LinkedIn
        </button>
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="text-base transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        Skip &mdash; I&apos;ll add it later
      </button>
    </div>
  );
}
