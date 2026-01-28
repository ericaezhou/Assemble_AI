interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function ProgressIndicator({ currentStep, totalSteps, steps }: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 relative">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  index + 1 < currentStep
                    ? 'bg-green-500 text-white'
                    : index + 1 === currentStep
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1 < currentStep ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Step label */}
              <div
                className={`mt-2 text-xs font-medium text-center ${
                  index + 1 === currentStep ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                {step}
              </div>
            </div>
            {/* Connecting line */}
            {index < totalSteps - 1 && (
              <div
                className={`absolute top-5 left-1/2 w-full h-0.5 -z-10 ${
                  index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
                style={{ transform: 'translateY(-50%)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
