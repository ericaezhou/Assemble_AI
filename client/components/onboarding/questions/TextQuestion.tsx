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
}: TextQuestionProps) {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Auto-focus input on mount
    const timer = setTimeout(() => {
      document.getElementById('question-input')?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value && !error) {
      onContinue();
    }
  };

  const isValid = value && !error;

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
            className={`w-full px-6 py-5 text-xl text-center bg-white border-2 rounded-2xl transition-all duration-200 focus:outline-none ${
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
