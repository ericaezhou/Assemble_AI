interface CardOption {
  value: string;
  label: string;
  icon?: string;
}

interface CardSelectQuestionProps {
  question: string;
  options: CardOption[];
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

export default function CardSelectQuestion({
  question,
  options,
  value,
  onChange,
  onContinue,
}: CardSelectQuestionProps) {
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    // Auto-advance after selection
    setTimeout(() => {
      onContinue();
    }, 300);
  };

  return (
    <div className="text-center space-y-12">
      {/* Question */}
      <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
        {question}
      </h2>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className="p-8 text-center card transition-all duration-200"
            style={value === option.value
              ? { background: 'var(--accent-light)', borderColor: 'var(--accent)' }
              : { background: 'var(--surface)', borderColor: 'var(--border-light)' }
            }
          >
            {option.icon && (
              <div className="text-5xl mb-4">{option.icon}</div>
            )}
            <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              {option.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
