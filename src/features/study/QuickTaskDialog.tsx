import { useState, type FormEvent } from 'react';
import ModalPortal from '../../components/ModalPortal';
import { db } from '../../data/db';
import { scheduleFields } from './taskSchedule';

export const quickTaskShortcut = 'Alt+Shift+Q';
const reminderOptions = [['0', 'At scheduled time'], ['5', '5 minutes before'], ['15', '15 minutes before'], ['30', '30 minutes before'], ['60', '1 hour before']];

export function TaskReminderSelect({ time, value, onChange }: { time: string; value: string; onChange: (value: string) => void }) {
  return <label>Reminder
    <select value={value} disabled={!time} onChange={event => onChange(event.target.value)}>
      <option value="">No reminder</option>
      {reminderOptions.map(([minutes, label]) => <option key={minutes} value={minutes}>{label}</option>)}
    </select>
  </label>;
}

export default function QuickTaskDialog({ day, onClose, onSaved }: { day: string; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(day);
  const [time, setTime] = useState('');
  const [reminder, setReminder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unavailable' : Notification.permission);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title') ?? '').trim();
    const estimatedMinutes = Number(fields.get('minutes'));
    setBusy(true);
    setError('');
    try {
      if (!title || !Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440) {
        throw new Error('Enter a task name and an estimate between 1 and 1440 minutes.');
      }
      await db.studyTasks.add({
        title, estimatedMinutes, ...scheduleFields(date, time, reminder),
        priority: 'normal', completed: false, createdAt: Date.now(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return <ModalPortal>
    <div className="p4-backdrop" onMouseDown={event => { if (!busy && event.target === event.currentTarget) onClose(); }}>
      <form className="p4-dialog quick-task-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-task-title" onSubmit={save}
        onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); } }}>
        <h2 id="quick-task-title">Quick add task</h2>
        <label>Task name<input name="title" placeholder="e.g. Review vocabulary" maxLength={160} required/></label>
        <div className="quick-task-fields">
          <label>Task date<input type="date" value={date} required onChange={event => setDate(event.target.value)}/></label>
          <label>Time (optional)<input type="time" value={time} onChange={event => { setTime(event.target.value); if (!event.target.value) setReminder(''); }}/></label>
          <label>Planned minutes<input name="minutes" type="number" min="1" max="1440" defaultValue="30" required/></label>
          <TaskReminderSelect time={time} value={reminder} onChange={setReminder}/>
        </div>
        {time && reminder !== '' && <div className="quick-task-note">
          <small>Reminders work while the app is open.</small>
          {permission === 'default' && <button type="button" className="secondary" onClick={async () => {
            try { setPermission(await Notification.requestPermission()); }
            catch { setPermission('unavailable'); }
          }}>Enable desktop alerts</button>}
          {permission === 'granted' && <small>Desktop alerts enabled.</small>}
        </div>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="quick-task-actions"><button className="secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>Add task</button></div>
      </form>
    </div>
  </ModalPortal>;
}
