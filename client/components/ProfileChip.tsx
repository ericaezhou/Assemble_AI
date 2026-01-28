import { INTEREST_AREAS, SKILLS, HOBBIES } from '@/utils/profileOptions';

interface ProfileChipProps {
  value: string;
  type: 'interest' | 'skill' | 'hobby';
}

export default function ProfileChip({ value, type }: ProfileChipProps) {
  // Find the option details
  const optionsMap = {
    interest: INTEREST_AREAS,
    skill: SKILLS,
    hobby: HOBBIES,
  };

  const option = optionsMap[type].find((opt) => opt.value === value);

  if (!option) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        {value}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200"
      title={option.description}
    >
      {option.label}
    </span>
  );
}
