import { useState } from 'react';

interface ChipOption {
  value: string;
  label: string;
  description: string;
  icon?: string; // optional icon on right
}

interface ChipSelectQuestionProps {
  question: string;
  subtitle?: string;
  options: ChipOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onContinue: () => void;
  maxSelections?: number;
  optional?: boolean;
}

export default function ChipSelectQuestion({
  question,
  subtitle,
  options,
  selectedValues,
  onChange,
  onContinue,
  maxSelections = 5,
  optional = false,
}: ChipSelectQuestionProps) {
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else if (selectedValues.length < maxSelections) {
      onChange([...selectedValues, value]);
    }
  };

  const canContinue = optional || selectedValues.length > 0;

  return (
    <div className="space-y-12">
      {/* Question */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          {question}
        </h2>
        {subtitle && <p className="text-lg" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {selectedValues.length}/{maxSelections} selected
          {optional && ' (optional)'}
        </p>
      </div>

      {/* Chips */}
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          const isDisabled = !isSelected && selectedValues.length >= maxSelections;

          return (
            <div key={option.value} className="relative">
              <button
                onClick={() => handleToggle(option.value)}
                onMouseEnter={() => setHoveredChip(option.value)}
                onMouseLeave={() => setHoveredChip(null)}
                disabled={isDisabled}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-full transition-all duration-200"
                style={isSelected
                  ? { background: 'var(--accent)', color: '#fff', border: '2px solid var(--accent)' }
                  : isDisabled
                  ? { background: 'var(--bg)', color: 'var(--border-light)', cursor: 'not-allowed', border: '2px solid var(--border-light)' }
                  : { background: 'var(--surface)', color: 'var(--text)', border: '2px solid var(--border-light)' }
                }
              >
                {/* Checkbox on left */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => handleToggle(option.value)}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: 'var(--accent)' }}
                />

                {/* Label with left indent */}
                <span className="flex-1 ml-2 text-left">{option.label}</span>

                {/* Icon on right */}
                {option.icon && <span className="ml-2">{option.icon}</span>}
              </button>

              {/* Tooltip */}
              {hoveredChip === option.value && !isDisabled && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 text-xs rounded-lg shadow-xl whitespace-nowrap animate-in fade-in duration-150" style={{ background: 'var(--border)', color: '#fff' }}>
                  {option.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: 'var(--border)' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ padding: '16px 32px', fontSize: '1.125rem' }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
