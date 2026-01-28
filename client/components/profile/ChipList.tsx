import ProfileChip from '../ProfileChip';

interface ChipListProps {
  items: string[];
  type: 'interest' | 'skill' | 'hobby';
  maxDisplay?: number;
  showAll?: boolean;
  label?: string;
}

export default function ChipList({
  items,
  type,
  maxDisplay = 5,
  showAll = false,
  label,
}: ChipListProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const displayItems = showAll ? items : items.slice(0, maxDisplay);
  const remainingCount = items.length - displayItems.length;

  return (
    <div className="space-y-2">
      {label && (
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </h4>
      )}
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item) => (
          <ProfileChip key={item} value={item} type={type} />
        ))}
        {!showAll && remainingCount > 0 && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}
