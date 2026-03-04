import { useState, useEffect, KeyboardEvent } from 'react';

interface TextQuestionProps {
  question: string;
  subtitle?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  type?: 'text' | 'email' | 'password';
  error?: string | null;
  emailStatus?: 'idle' | 'checking' | 'available' | 'taken';
}

export default function TextQuestion({
  question,
  subtitle,
  placeholder,
  value,
  onChange,
  onContinue,
  type = 'text',
  error,
  emailStatus,
}: TextQuestionProps) {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Auto-focus input on mount
    const timer = setTimeout(() => {
      document.getElementById('question-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // For email fields, require status to be 'available' (not just 'not taken')
  const isEmailValid = type !== 'email' || emailStatus === 'available';
  const isValid = value && !error && isEmailValid;

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid) {
      onContinue();
    }
  };

  const getBorderColor = () => {
    if (isFocused) return 'var(--accent)';
    if (error) return '#f87171';
    if (type === 'email' && (emailStatus === 'taken' || (emailStatus === 'idle' && value))) return '#f59e0b';
    if (type === 'email' && emailStatus === 'available') return '#4ade80';
    return 'var(--border-light)';
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
      <div className="space-y-2">
        <div className="relative">
          <input
            id="question-input"
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full px-6 py-5 text-xl text-center rounded-lg outline-none transition-all duration-200"
            style={{
              background: 'var(--surface)',
              border: `2px solid ${getBorderColor()}`,
              color: 'var(--text)',
            }}
          />
        </div>

        {/* Email status feedback */}
        {type === 'email' && emailStatus === 'idle' && value && (
          <p className="text-sm flex items-center justify-center gap-1" style={{ color: '#d97706' }}>
            <span>⚠</span> Please enter a valid email address
          </p>
        )}
        {type === 'email' && emailStatus === 'checking' && (
          <p className="text-sm flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--accent)' }} />
            Checking email availability...
          </p>
        )}
        {type === 'email' && emailStatus === 'available' && (
          <p className="text-sm flex items-center justify-center gap-1" style={{ color: '#16a34a' }}>
            <span>✓</span> Email available
          </p>
        )}
        {type === 'email' && emailStatus === 'taken' && (
          <p className="text-sm flex items-center justify-center gap-1" style={{ color: '#d97706' }}>
            <span>⚠</span> This email is already registered. Try signing in instead.
          </p>
        )}

        {error && (
          <p className="text-sm animate-in fade-in duration-200" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>

      {/* Continue button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={onContinue}
          disabled={!isValid}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ padding: '16px 32px', fontSize: '1.125rem' }}
        >
          Continue →
        </button>
      </div>

      {/* Hint */}
      {isValid && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Press Enter ↵
        </p>
      )}
    </div>
  );
}
