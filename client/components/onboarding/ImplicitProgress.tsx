interface ImplicitProgressProps {
  progress: number;
}

export default function ImplicitProgress({ progress }: ImplicitProgressProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
