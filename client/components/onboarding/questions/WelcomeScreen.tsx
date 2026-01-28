interface WelcomeScreenProps {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="text-center space-y-8 py-16">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-gray-900">
          Welcome to Assemble AI ✨
        </h1>
        <p className="text-xl text-gray-600">
          Let's get to know you. This will take about 2 minutes.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-150"
      >
        Let's go
        <svg
          className="w-5 h-5 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </button>
    </div>
  );
}
