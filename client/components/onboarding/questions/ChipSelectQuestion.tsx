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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          {question}
        </h2>
        {subtitle && <p className="text-lg text-gray-500">{subtitle}</p>}
        <p className="text-sm text-gray-400">
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
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : isDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Checkbox on left */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => handleToggle(option.value)}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />

                {/* Label with left indent */}
                <span className="flex-1 ml-2 text-left">{option.label}</span>

                {/* Icon on right */}
                {option.icon && <span className="ml-2">{option.icon}</span>}
              </button>

              {/* Tooltip */}
              {hoveredChip === option.value && !isDisabled && (
                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap animate-in fade-in duration-150">
                  {option.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
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
          className={`px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-150 ${
            canContinue
              ? 'text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg cursor-pointer'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

