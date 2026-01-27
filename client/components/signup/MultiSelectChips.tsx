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
        <label className="block text-gray-700 font-medium text-sm">{label}</label>
        <span className="text-sm text-gray-500">
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
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selected
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-md'
                    : disabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-400 hover:shadow-sm'
                }`}
              >
                {option.label}
              </button>
              {/* Tooltip */}
              {hoveredChip === option.value && !disabled && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                  {option.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {atMaxLimit && (
        <p className="text-sm text-orange-600 mt-2">
          You've reached the maximum of {maxSelections} selections. Deselect one to choose another.
        </p>
      )}
    </div>
  );
}
