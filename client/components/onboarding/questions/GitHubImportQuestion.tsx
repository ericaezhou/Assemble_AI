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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          {question}
        </h2>
        {subtitle && (
          <p className="text-lg text-gray-500">{subtitle}</p>
        )}
      </div>

      {/* Input */}
      <div className="space-y-4">
        <div className="relative max-w-md mx-auto">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            github.com/
          </span>
          <input
            id="github-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="username"
            disabled={isLoading}
            className={`w-full pl-32 pr-6 py-5 text-xl text-gray-900 bg-white border-2 rounded-2xl transition-all duration-200 focus:outline-none ${
              isFocused
                ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                : error
                ? 'border-red-300'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 animate-in fade-in duration-200">
            {error}
          </p>
        )}

        {/* Success preview */}
        {fetchStatus === 'success' && fetchedData && (
          <div className="max-w-md mx-auto text-left p-4 bg-green-50 rounded-xl border border-green-200 space-y-2">
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Found your profile!</span>
            </div>
            {fetchedData.name && (
              <p className="text-sm text-gray-700"><strong>Name:</strong> {fetchedData.name}</p>
            )}
            {fetchedData.languages.length > 0 && (
              <p className="text-sm text-gray-700">
                <strong>Languages:</strong> {fetchedData.languages.slice(0, 5).join(', ')}
              </p>
            )}
            {fetchedData.topics.length > 0 && (
              <p className="text-sm text-gray-700">
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
            className="px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-150 cursor-pointer"
          >
            Use this data &rarr;
          </button>
        ) : (
          <button
            onClick={handleFetch}
            disabled={isLoading || !username.trim()}
            className={`px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-150 ${
              !isLoading && username.trim()
                ? 'text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
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
        className="text-base text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
      >
        Skip &mdash; I&apos;ll fill it in manually
      </button>
    </div>
  );
}
