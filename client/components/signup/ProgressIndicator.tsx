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
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                style={
                  index + 1 < currentStep
                    ? { background: '#22c55e', color: '#fff', border: '2px solid var(--border)' }
                    : index + 1 === currentStep
                    ? { background: 'var(--accent)', color: '#fff', border: '2px solid var(--border)', outline: '3px solid var(--accent-light)', outlineOffset: '2px' }
                    : { background: 'var(--bg)', color: 'var(--text-muted)', border: '2px solid var(--border-light)' }
                }
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
                className="mt-2 text-xs font-semibold text-center"
                style={{ color: index + 1 === currentStep ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {step}
              </div>
            </div>
            {/* Connecting line */}
            {index < totalSteps - 1 && (
              <div
                className="absolute top-5 left-1/2 w-full h-0.5 -z-10"
                style={{
                  background: index + 1 < currentStep ? '#22c55e' : 'var(--border-light)',
                  transform: 'translateY(-50%)',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
