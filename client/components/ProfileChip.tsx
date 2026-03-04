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
      <span className="tag">
        {value}
      </span>
    );
  }

  return (
    <span className="tag tag-accent" title={option.description}>
      {option.icon && <span>{option.icon}</span>}
      {option.label}
    </span>
  );
}
