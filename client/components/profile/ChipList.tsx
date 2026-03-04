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
        <h4 className="section-heading">
          {label}
        </h4>
      )}
      <div className="flex flex-wrap gap-2">
        {displayItems.map((item) => (
          <ProfileChip key={item} value={item} type={type} />
        ))}
        {!showAll && remainingCount > 0 && (
          <span className="tag" style={{ color: 'var(--text-muted)' }}>
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}
