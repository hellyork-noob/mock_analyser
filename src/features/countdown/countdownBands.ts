export function countdownBand(days: number): string {
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days > 100 || !Number.isFinite(days)) return 'far';
  return String(Math.ceil(days / 10));
}
