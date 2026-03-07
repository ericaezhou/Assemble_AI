import { useState, useEffect, KeyboardEvent } from 'react';

interface GitHubData {
  name?: string;
  bio?: string;
  company?: string;
  languages: string[];
  topics: string[];
}

interface GitHubImportQuestionProps {
  question: string;
  subtitle?: string;
  onFetch: (username: string) => void;
  onSkip: () => void;
  onContinue: () => void;
  fetchStatus: 'idle' | 'loading' | 'success' | 'error';
  fetchedData: GitHubData | null;
  error?: string | null;
}

// Extract username from various GitHub URL formats
function extractGitHubUsername(value: string): string {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/?$/i);
  if (urlMatch) return urlMatch[1];
  return trimmed.replace(/^@/, '');
}

export default function GitHubImportQuestion({
  question,
  subtitle,
  onFetch,
  onSkip,
  onContinue,
  fetchStatus,
  fetchedData,
  error,
}: GitHubImportQuestionProps) {
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById('github-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && username.trim() && fetchStatus !== 'loading') {
      onFetch(username.trim().replace(/^@/, ''));
    }
  };

  const handleFetch = () => {
    const trimmed = username.trim().replace(/^@/, '');
    if (trimmed) {
      onFetch(trimmed);
    }
  };

  const isLoading = fetchStatus === 'loading';

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
            github.com/
          </span>
          <input
            id="github-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(extractGitHubUsername(e.target.value))}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="username"
            disabled={isLoading}
            className="w-full pl-32 pr-6 py-5 text-xl rounded-lg outline-none transition-all duration-200"
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

        {/* Success preview */}
        {fetchStatus === 'success' && fetchedData && (
          <div className="max-w-md mx-auto text-left p-4 space-y-2 rounded-lg" style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
            <div className="flex items-center gap-2" style={{ color: '#15803d' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">Found your profile!</span>
            </div>
            {fetchedData.name && (
              <p className="text-sm" style={{ color: 'var(--text)' }}><strong>Name:</strong> {fetchedData.name}</p>
            )}
            {fetchedData.languages.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                <strong>Languages:</strong> {fetchedData.languages.slice(0, 5).join(', ')}
              </p>
            )}
            {fetchedData.topics.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                <strong>Topics:</strong> {fetchedData.topics.slice(0, 5).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center pt-8">
        {fetchStatus === 'success' ? (
          <button
            onClick={onContinue}
            className="btn btn-primary"
            style={{ padding: '16px 32px', fontSize: '1.125rem' }}
          >
            Use this data &rarr;
          </button>
        ) : (
          <button
            onClick={handleFetch}
            disabled={isLoading || !username.trim()}
            className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ padding: '16px 32px', fontSize: '1.125rem' }}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                Fetching...
              </span>
            ) : (
              'Import from GitHub'
            )}
          </button>
        )}
      </div>

      {/* Skip link */}
      <button
        onClick={onSkip}
        disabled={isLoading}
        className="text-base transition-colors disabled:opacity-50"
        style={{ color: 'var(--text-muted)' }}
      >
        Skip &mdash; I&apos;ll fill it in manually
      </button>
    </div>
  );
}
