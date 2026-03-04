import { useState } from 'react';
import { Option } from '@/utils/profileOptions';

interface MultiSelectChipsProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
  label: string;
}

export default function MultiSelectChips({
  options,
  selectedValues,
  onChange,
  maxSelections = 5,
  label,
}: MultiSelectChipsProps) {
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);

  const handleChipClick = (value: string) => {
    if (selectedValues.includes(value)) {
      // Deselect
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      // Select if under limit
      if (selectedValues.length < maxSelections) {
        onChange([...selectedValues, value]);
      }
    }
  };

  const isSelected = (value: string) => selectedValues.includes(value);
  const atMaxLimit = selectedValues.length >= maxSelections;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="block text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</label>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {selectedValues.length}/{maxSelections} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = isSelected(option.value);
          const disabled = !selected && atMaxLimit;

          return (
            <div key={option.value} className="relative">
              <button
                type="button"
                onClick={() => handleChipClick(option.value)}
                onMouseEnter={() => setHoveredChip(option.value)}
                onMouseLeave={() => setHoveredChip(null)}
                disabled={disabled}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={selected
                  ? { background: 'var(--accent)', color: '#fff', border: '2px solid var(--accent)' }
                  : disabled
                  ? { background: 'var(--bg)', color: 'var(--border-light)', cursor: 'not-allowed', border: '2px solid var(--border-light)' }
                  : { background: 'var(--surface)', color: 'var(--text)', border: '2px solid var(--border-light)' }
                }
              >
                {option.label}
              </button>
              {/* Tooltip */}
              {hoveredChip === option.value && !disabled && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg whitespace-nowrap" style={{ background: 'var(--border)', color: '#fff' }}>
                  {option.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: 'var(--border)' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {atMaxLimit && (
        <p className="text-sm mt-2" style={{ color: '#ea580c' }}>
          You've reached the maximum of {maxSelections} selections. Deselect one to choose another.
        </p>
      )}
    </div>
  );
}
