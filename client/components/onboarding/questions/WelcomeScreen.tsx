interface WelcomeScreenProps {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="text-center space-y-8 py-16">
      <div className="space-y-4">
        <h1 className="text-5xl font-black" style={{ color: 'var(--text)' }}>
          Welcome to Assemble AI ✨
        </h1>
        <p className="text-xl" style={{ color: 'var(--text-muted)' }}>
          Let's get to know you. This will take about 2 minutes.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="btn btn-primary inline-flex items-center gap-2"
        style={{ padding: '16px 32px', fontSize: '1.125rem' }}
      >
        Let's go
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}
