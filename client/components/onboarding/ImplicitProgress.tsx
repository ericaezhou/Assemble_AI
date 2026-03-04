interface ImplicitProgressProps {
  progress: number;
}

export default function ImplicitProgress({ progress }: ImplicitProgressProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1" style={{ background: 'var(--border-light)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--accent)' }}
        />
      </div>
    </div>
  );
}
