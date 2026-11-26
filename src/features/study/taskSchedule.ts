import type { StudyTask } from '../../data/types';
import { localDateKey } from './studyMath';

export function scheduledAt(date: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
  const when = new Date(`${date}T${time}:00`);
  if (!Number.isFinite(when.getTime()) || localDateKey(when) !== date) return NaN;
  return when.getTime();
}

export function scheduleFields(date: string, time: string, reminder: string, previous?: StudyTask) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || localDateKey(new Date(date + 'T12:00:00')) !== date) {
    throw new Error('Choose a valid task date.');
  }
  if (time && !Number.isFinite(scheduledAt(date, time))) throw new Error('Choose a valid task time.');
  const reminderMinutes = time && reminder !== '' ? Number(reminder) : undefined;
  if (reminderMinutes !== undefined && (!Number.isInteger(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 1440)) {
    throw new Error('Choose a valid reminder.');
  }
  const scheduleMatches = previous?.date === date && previous.scheduledTime === time && previous.reminderMinutes === reminderMinutes;
  return {
    date, scheduledTime: time || undefined, reminderMinutes,
    ...(!scheduleMatches ? { reminderDismissed: undefined, reminderNotified: undefined } : {}),
  };
}

export function taskReminderAt(task: StudyTask) {
  if (task.completed || task.reminderDismissed || !task.scheduledTime || task.reminderMinutes === undefined) return NaN;
  return scheduledAt(task.date, task.scheduledTime) - task.reminderMinutes * 60000;
}

export function displayTaskTime(task: StudyTask) {
  if (!task.scheduledTime) return '';
  const time = scheduledAt(task.date, task.scheduledTime);
  return Number.isFinite(time) ? new Date(time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
}
