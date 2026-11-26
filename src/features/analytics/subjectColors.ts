// Stable by subject name, independent of ordering, filters, or the UI accent.
export function subjectColor(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (/math|quant/.test(normalized)) return 'var(--subject-1)';
  if (/reason|logic/.test(normalized)) return 'var(--subject-2)';
  if (/english|language/.test(normalized)) return 'var(--subject-3)';
  if (/general|^gs$|awareness/.test(normalized)) return 'var(--subject-4)';
  let hash = 0;
  for (const character of normalized) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `var(--subject-${hash % 6 + 1})`;
}
