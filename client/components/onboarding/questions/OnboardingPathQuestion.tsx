interface OnboardingPathQuestionProps {
  question: string;
  subtitle?: string;
  onSelect: (path: 'linkedin' | 'resume' | 'manual') => void;
}

const paths = [
  {
    value: 'linkedin' as const,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
    label: 'Import from LinkedIn',
    description: 'Auto-fill with your LinkedIn profile',
  },
  {
    value: 'resume' as const,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    label: 'Upload resume',
    description: 'We\'ll extract your details from a PDF or image',
  },
  {
    value: 'manual' as const,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    label: 'Do it myself',
    description: 'Fill in your profile manually',
  },
];

export default function OnboardingPathQuestion({
  question,
  subtitle,
  onSelect,
}: OnboardingPathQuestionProps) {
  return (
    <div className="text-center space-y-12">
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          {question}
        </h2>
        {subtitle && (
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
        {paths.map((path) => (
          <button
            key={path.value}
            onClick={() => onSelect(path.value)}
            className="flex items-center gap-5 p-6 text-left card transition-all duration-200 hover:shadow-md"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-light)' }}
          >
            <div
              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {path.icon}
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {path.label}
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {path.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
