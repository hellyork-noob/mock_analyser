import type { FocusSession, FocusTimer } from '../../data/types';

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function shiftDate(day: string, offset: number): string {
  const date = new Date(day + 'T12:00:00');
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

export function timerElapsed(timer: FocusTimer, now = Date.now()): number {
  const closed = timer.segments.reduce((total, segment) => total + Math.max(0, segment.end - segment.start), 0);
  const running = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince);
  return Math.min(timer.durationSeconds ?? Infinity, Math.floor((closed + running) / 1000));
}

export function timerDisplaySeconds(timer: FocusTimer, now: number): number {
  const elapsed = timerElapsed(timer, now);
  return timer.durationSeconds === null ? elapsed : timer.durationSeconds - elapsed;
}

// Day boundaries use local calendar dates, including DST changes. Pauses and
// breaks have no segments, so they never inflate the daily study total.
export function focusSecondsOnDay(sessions: FocusSession[], day: string): number {
  const start = new Date(day + 'T00:00:00').getTime();
  const end = new Date(shiftDate(day, 1) + 'T00:00:00').getTime();
  return Math.floor(sessions.reduce((total, session) => {
    if (session.estimatedForDate) return total + (session.estimatedForDate === day ? session.seconds * 1000 : 0);
    return total + session.segments.reduce((sum, segment) =>
      sum + Math.max(0, Math.min(end, segment.end) - Math.max(start, segment.start)), 0);
  }, 0) / 1000);
}

export function formatStudyTime(seconds: number): string {
  if (seconds > 0 && seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
