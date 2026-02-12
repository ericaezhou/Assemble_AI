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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          {question}
        </h2>
        <p className="text-lg text-gray-500">
          {subtitle} <span className="font-medium text-gray-700">{email}</span>
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
            className={`w-full max-w-xs mx-auto px-6 py-5 text-3xl text-center text-gray-900 tracking-[0.5em] bg-white border-2 rounded-2xl transition-all duration-200 focus:outline-none font-mono ${
              isFocused
                ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                : error
                ? 'border-red-300'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          />
        </div>

        {message && !error && (
          <p className={`text-sm ${message.includes('Development') ? 'text-orange-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-500 animate-in fade-in duration-200">
            {error}
          </p>
        )}

        {/* Resend button */}
        <button
          onClick={onSendCode}
          disabled={sending}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Resend code'}
        </button>
      </div>

      {/* Continue button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={onContinue}
          disabled={!isValid}
          className={`px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-150 ${
            isValid
              ? 'text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] cursor-pointer'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          Continue →
        </button>
      </div>

      {/* Hint */}
      {isValid && (
        <p className="text-sm text-gray-400">
          Press Enter ↵
        </p>
      )}
    </div>
  );
}
