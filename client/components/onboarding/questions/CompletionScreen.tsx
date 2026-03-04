interface CompletionScreenProps {
  onComplete: () => void;
  name: string;
}

export default function CompletionScreen({ onComplete, name }: CompletionScreenProps) {
  return (
    <div className="text-center space-y-8 py-16">
      <div className="space-y-6">
        <div className="text-6xl">🎉</div>
        <h1 className="text-4xl md:text-5xl font-black" style={{ color: 'var(--text)' }}>
          All set, {name}!
        </h1>
        <p className="text-xl" style={{ color: 'var(--text-muted)' }}>
          You're ready to connect with amazing people
        </p>
      </div>

      <button
        onClick={onComplete}
        className="btn btn-primary inline-flex items-center gap-2"
        style={{ padding: '16px 32px', fontSize: '1.125rem' }}
      >
        Enter Assemble AI
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}
