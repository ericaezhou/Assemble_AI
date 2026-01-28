import { ReactNode, useEffect, useState } from 'react';

interface QuestionContainerProps {
  children: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export default function QuestionContainer({ children, onBack, showBack = true }: QuestionContainerProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Trigger enter animation
    setIsAnimating(false);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 transition-colors duration-300">
      <div
        className={`w-full max-w-[600px] transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-0 translate-y-5' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Back button */}
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="mb-12 flex items-center text-gray-500 hover:text-gray-700 transition-colors group"
          >
            <svg
              className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {/* Question content */}
        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}
