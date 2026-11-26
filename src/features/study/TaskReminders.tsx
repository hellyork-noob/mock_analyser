import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { db } from '../../data/db';
import type { StudyTask } from '../../data/types';
import { displayTaskTime, taskReminderAt } from './taskSchedule';

async function notifyDueTask(task: StudyTask, due: number) {
  if (task.id == null || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const id = task.id;
  const claimed = await db.transaction('rw', db.studyTasks, async () => {
    const current = await db.studyTasks.get(id);
    if (!current || current.reminderNotified || taskReminderAt(current) !== due) return false;
    await db.studyTasks.update(id, { reminderNotified: true });
    return true;
  });
  if (!claimed) return;

  const options: NotificationOptions = { body: task.title, tag: `study-task-${id}-${due}` };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.active) await registration.showNotification('Study task reminder', options);
    else new Notification('Study task reminder', options);
  } catch {
    // The in-app reminder is still available if the OS blocks desktop alerts.
  }
}

export default function TaskReminders({ tasks, onChange, onOpen }: {
  tasks: StudyTask[];
  onChange: () => void;
  onOpen: (day: string) => void;
}) {
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState('');
  const scheduled = tasks.map(task => ({ task, due: taskReminderAt(task) }))
    .filter(item => Number.isFinite(item.due)).sort((a, b) => b.due - a.due);
  const dueTasks = scheduled.filter(item => item.due <= now);
  const next = scheduled.reduce((earliest, item) => item.due > now ? Math.min(earliest, item.due) : earliest, Infinity);
  const current = dueTasks[0];

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const delay = Math.max(0, Math.min(60000, next - Date.now()));
    const timeout = window.setTimeout(refresh, delay);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [next, now]);

  useEffect(() => {
    for (const task of tasks) {
      const due = taskReminderAt(task);
      if (!task.reminderNotified && due <= now) {
        void notifyDueTask(task, due).catch(error => console.error('Task alert unavailable', error));
      }
    }
  }, [tasks, now]);

  if (!current) return null;
  const { task, due } = current;

  async function dismiss(open = false) {
    if (task.id == null) return;
    const id = task.id;
    try {
      await db.transaction('rw', db.studyTasks, async () => {
        const latest = await db.studyTasks.get(id);
        if (latest && taskReminderAt(latest) === due) await db.studyTasks.update(id, { reminderDismissed: true });
      });
      setError('');
      onChange();
      if (open) onOpen(task.date);
    } catch {
      setError('Could not dismiss this reminder. Try again.');
    }
  }

  return <aside className="study-reminder" aria-label="Task reminder">
    <div className="study-reminder-message" role="status"><Bell size={18} aria-hidden="true"/><div>
      <strong>{task.title}</strong><small>{task.date} at {displayTaskTime(task)}{dueTasks.length > 1 && ` · ${dueTasks.length - 1} more`}</small>
    </div></div>
    <div className="quick-task-actions">
      <button type="button" className="secondary" onClick={() => void dismiss()}>Dismiss</button>
      <button type="button" className="primary" onClick={() => void dismiss(true)}>Open day</button>
    </div>
    {error && <small role="alert">{error}</small>}
  </aside>;
}
