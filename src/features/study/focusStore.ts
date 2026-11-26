import { create } from 'zustand';
import { db } from '../../data/db';
import type { FocusTimer } from '../../data/types';
import { localDateKey, timerElapsed } from './studyMath';
import { taskEstimateSessions } from './taskCompletion';

type StartOptions = { mode: 'focus' | 'break'; minutes: number; title: string; taskId?: number } | { mode: 'stopwatch' };
type StopwatchTask = { taskId: number } | { title: string };
export const maximumTimerMinutes = { focus: 1440, break: 240 } as const;
type FocusState = {
  timer: FocusTimer | null;
  now: number;
  ready: boolean;
  busy: boolean;
  error: string;
  notice: string;
};
export const useFocusStore = create<FocusState>(() => ({
  timer: null, now: Date.now(), ready: false, busy: false, error: '', notice: '',
}));

export async function restoreFocusTimer() {
  try {
    const timer = await db.focusTimers.get('active');
    useFocusStore.setState({ timer: timer ?? null, now: Date.now(), ready: true, error: '' });
  } catch (error) {
    useFocusStore.setState({ ready: false, error: String(error) });
  }
}

async function mutate(operation: () => Promise<void>) {
  if (useFocusStore.getState().busy) return;
  useFocusStore.setState({ busy: true, error: '' });
  try { await operation(); }
  catch (error) { useFocusStore.setState({ error: error instanceof Error ? error.message : String(error) }); }
  finally { useFocusStore.setState({ busy: false }); }
}

export async function startFocusTimer(options: StartOptions) {
  await mutate(async () => {
    const now = Date.now();
    const base = { id: 'active' as const, token: crypto.randomUUID(), startedAt: now, runningSince: now, segments: [] };
    let timer: FocusTimer;
    if (options.mode === 'stopwatch') {
      timer = { ...base, mode: 'stopwatch', durationSeconds: null, title: 'Stopwatch' };
    } else {
      const { mode, minutes, title, taskId } = options;
      const maximum = maximumTimerMinutes[mode];
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > maximum) {
        throw new Error(`Choose a period between 1 and ${maximum} minutes.`);
      }
      timer = {
        ...base, mode, title: title.trim() || (mode === 'focus' ? 'Focus session' : 'Break'),
        ...(mode === 'focus' && taskId !== undefined ? { taskId } : {}),
        durationSeconds: Math.round(minutes * 60),
      };
    }
    await db.transaction('rw', db.focusTimers, async () => {
      if (await db.focusTimers.get('active')) throw new Error('A timer is already active. Resume or finish it first.');
      await db.focusTimers.add(timer);
    });
    useFocusStore.setState({ timer, now, notice: '' });
  });
}

function closedSegments(timer: FocusTimer, now: number) {
  if (timer.runningSince === null) return timer.segments;
  const usedMs = timer.segments.reduce((sum, segment) => sum + segment.end - segment.start, 0);
  const remainingMs = Math.max(0, (timer.durationSeconds ?? Infinity) * 1000 - usedMs);
  const end = Math.max(timer.runningSince, Math.min(now, timer.runningSince + remainingMs));
  return [...timer.segments, { start: timer.runningSince, end }];
}

export async function toggleFocusPause() {
  await mutate(async () => {
    const now = Date.now();
    const updated = await db.transaction('rw', db.focusTimers, async () => {
      const timer = await db.focusTimers.get('active');
      if (!timer) return null;
      if (timer.stoppedAt !== undefined) return timer;
      if (timer.runningSince === null) timer.runningSince = now;
      else {
        timer.segments = closedSegments(timer, now);
        timer.runningSince = null;
      }
      await db.focusTimers.put(timer);
      return timer;
    });
    useFocusStore.setState({ timer: updated, now });
  });
}

export async function stopStopwatch() {
  await mutate(async () => {
    const now = Date.now();
    const updated = await db.transaction('rw', db.focusTimers, async () => {
      const timer = await db.focusTimers.get('active');
      if (timer?.mode !== 'stopwatch' || timer.stoppedAt !== undefined) return timer;
      if (timerElapsed(timer, now) < 1) throw new Error('Record at least one second before finishing.');
      const stopped: FocusTimer = { ...timer, segments: closedSegments(timer, now), runningSince: null, stoppedAt: now };
      await db.focusTimers.put(stopped);
      return stopped;
    });
    useFocusStore.setState({ timer: updated ?? null, now });
  });
}

export async function saveStopwatch(task: StopwatchTask): Promise<boolean> {
  let saved = false;
  await mutate(async () => {
    await db.transaction('rw', [db.focusTimers, db.focusSessions, db.studyTasks], async () => {
      const timer = await db.focusTimers.get('active');
      if (timer?.mode !== 'stopwatch' || timer.stoppedAt === undefined) return;
      const seconds = timerElapsed(timer, timer.stoppedAt);
      let taskId: number;
      let title: string;
      if ('taskId' in task) {
        const existing = await db.studyTasks.get(task.taskId);
        if (!existing) throw new Error('That task no longer exists. Choose another task or name a new one.');
        taskId = task.taskId;
        title = existing.title;
        await db.studyTasks.update(taskId, { completed: true });
        await taskEstimateSessions(taskId).delete();
      } else {
        title = task.title.trim();
        if (!title || title.length > 160) throw new Error('Enter a task name of up to 160 characters.');
        taskId = await db.studyTasks.add({
          title, date: localDateKey(new Date(timer.stoppedAt)),
          estimatedMinutes: Math.max(1, Math.min(1440, Math.ceil(seconds / 60))),
          priority: 'normal', completed: true, createdAt: timer.stoppedAt,
        });
      }
      await db.focusSessions.add({
        token: timer.token, taskId, title, seconds, completed: true,
        startedAt: timer.startedAt, endedAt: timer.stoppedAt, segments: timer.segments,
      });
      await db.focusTimers.delete('active');
      saved = true;
    });
    if (saved) useFocusStore.setState({ timer: null, now: Date.now(), notice: 'Study time saved and task marked complete.' });
  });
  return saved;
}

// Saving the session and removing the active timer is atomic. Other tabs or
// repeated completion checks cannot create the same session twice.
export async function finishFocusTimer(discard = false): Promise<boolean> {
  let changed = false;
  await mutate(async () => {
    const now = Date.now();
    let notice = '';
    await db.transaction('rw', [db.focusTimers, db.focusSessions], async () => {
      const timer = await db.focusTimers.get('active');
      if (!timer) return;
      if (!discard && timer.mode === 'stopwatch') return;
      const seconds = timerElapsed(timer, now);
      const completed = timer.durationSeconds !== null && seconds >= timer.durationSeconds;
      const segments = closedSegments(timer, now);
      if (!discard && timer.mode === 'focus' && seconds > 0) {
        if (timer.taskId !== undefined) await taskEstimateSessions(timer.taskId).delete();
        await db.focusSessions.add({
          token: timer.token, title: timer.title, ...(timer.taskId !== undefined ? { taskId: timer.taskId } : {}),
          startedAt: timer.startedAt, endedAt: segments.at(-1)?.end ?? now, seconds, segments, completed,
        });
        changed = true;
      }
      await db.focusTimers.delete('active');
      notice = discard ? 'Timer discarded. No time was added.' : timer.mode === 'break' ? 'Break finished. Ready for another focus period?' : seconds > 0 ? 'Focus time saved to your study log.' : 'Timer ended. No study time to save yet.';
    });
    useFocusStore.setState({ timer: null, now, notice });
  });
  return changed;
}

export function tickFocusTimer() {
  // Only subscribers to the timer store update each second, not the app shell.
  const { timer } = useFocusStore.getState();
  if (timer && timer.runningSince !== null) useFocusStore.setState({ now: Date.now() });
}
