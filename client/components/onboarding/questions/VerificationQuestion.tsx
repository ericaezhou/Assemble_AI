import { useState, useEffect, KeyboardEvent } from 'react';

interface VerificationQuestionProps {
  question: string;
  subtitle: string;
  email: string;
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onSendCode: () => void;
  codeSent: boolean;
  sending: boolean;
  message?: string;
  error?: string | null;
}

export default function VerificationQuestion({
  question,
  subtitle,
  email,
  value,
  onChange,
  onContinue,
  onSendCode,
  codeSent,
  sending,
  message,
  error,
}: VerificationQuestionProps) {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Auto-send code on mount if not already sent
    if (!codeSent && !sending) {
      onSendCode();
    }
  }, []);

  useEffect(() => {
    // Auto-focus input
    const timer = setTimeout(() => {
      document.getElementById('verification-input')?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [codeSent]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.length === 6) {
      onContinue();
    }
  };

  const isValid = value.length === 6;

  return (
    <div className="text-center space-y-12">
      {/* Question */}
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          {question}
        </h2>
        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
          {subtitle} <span className="font-semibold" style={{ color: 'var(--text)' }}>{email}</span>
        </p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <div className="relative">
          <input
            id="verification-input"
            type="text"
            value={value}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              onChange(val);
            }}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="000000"
            maxLength={6}
            className="w-full max-w-xs mx-auto px-6 py-5 text-3xl text-center tracking-[0.5em] rounded-lg outline-none transition-all duration-200 font-mono"
            style={{
              background: 'var(--surface)',
              border: `2px solid ${isFocused ? 'var(--accent)' : error ? '#f87171' : 'var(--border-light)'}`,
              color: 'var(--text)',
            }}
          />
        </div>

        {message && !error && (
          <p className="text-sm" style={{ color: message.includes('Development') ? '#ea580c' : '#16a34a' }}>
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm animate-in fade-in duration-200" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        {/* Resend button */}
        <button
          onClick={onSendCode}
          disabled={sending}
          className="text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ color: 'var(--accent)' }}
        >
          {sending ? 'Sending...' : 'Resend code'}
        </button>
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
