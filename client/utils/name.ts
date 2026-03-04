export function getInitialsFromName(name: string): string {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return '';

  // Remove parenthesized nicknames like "(Paul)" to avoid punctuation initials.
  const withoutParenthetical = trimmedName.replace(/\([^)]*\)/g, ' ').trim();

  const words = withoutParenthetical
    .split(/\s+/)
    .map((word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean);

  if (words.length === 0) {
    const fallback = trimmedName.replace(/[^A-Za-z0-9]/g, '');
    return fallback.slice(0, 2).toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
