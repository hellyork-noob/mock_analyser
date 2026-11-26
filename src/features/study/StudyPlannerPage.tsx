import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, ListChecks, Pencil, Play, Target, Trash2 } from 'lucide-react';
import { db } from '../../data/db';
import type { FocusSession, StudyGoal, StudyTask } from '../../data/types';
import FocusTimerCard, { type FocusSetup } from './FocusTimerCard';
import { setTaskCompleted } from './taskCompletion';
import { TaskReminderSelect } from './QuickTaskDialog';
import { displayTaskTime, scheduleFields } from './taskSchedule';
import { focusSecondsOnDay, formatStudyTime, localDateKey, shiftDate } from './studyMath';

type Props = { day: string; onDayChange: (day: string) => void; tasks: StudyTask[]; goals: StudyGoal[]; sessions: FocusSession[]; onChange: () => void };
const defaultFocusSetup: FocusSetup = { mode: 'stopwatch', minutes: '25', selectedTask: '' };

export default function StudyPlannerPage({ day, onDayChange, tasks, goals, sessions, onChange }: Props) {
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState('30');
  const [priority, setPriority] = useState<StudyTask['priority']>('normal');
  const [editing, setEditing] = useState<number | null>(null);
  const [taskDate, setTaskDate] = useState(day);
  const [taskTime, setTaskTime] = useState('');
  const [reminder, setReminder] = useState('');
  const taskTitleInput = useRef<HTMLInputElement>(null);
  const [focusSetup, setFocusSetup] = useState(defaultFocusSetup);
  const [goalMinutes, setGoalMinutes] = useState('120');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dailyTasks = useMemo(() => tasks.filter(task => task.date === day).sort((a, b) => Number(a.completed) - Number(b.completed) || ({ high: 0, normal: 1, low: 2 }[a.priority] - { high: 0, normal: 1, low: 2 }[b.priority]) || a.createdAt - b.createdAt), [tasks, day]);
  const goal = goals.find(goal => goal.date === day);
  const focused = focusSecondsOnDay(sessions, day);
  const completed = dailyTasks.filter(task => task.completed).length;
  const dailySessions = useMemo(() => sessions.filter(session => focusSecondsOnDay([session], day) > 0).sort((a, b) => b.startedAt - a.startedAt), [sessions, day]);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(day, index - 6);
    const seconds = focusSecondsOnDay(sessions, date);
    const targetMinutes = goals.find(goal => goal.date === date)?.targetMinutes;
    const targetSeconds = targetMinutes === undefined ? null : targetMinutes * 60;
    const withinGoal = Math.min(seconds, targetSeconds ?? seconds);
    return { date, seconds, targetSeconds, withinGoal, extra: seconds - withinGoal };
  }), [sessions, day, goals]);
  const weekScale = Math.max(3600, ...week.map(item => Math.max(item.seconds, item.targetSeconds ?? 0)));
  const weekSeconds = week.reduce((total, item) => total + item.seconds, 0);
  const lifetime = sessions.reduce((total, session) => total + session.seconds, 0);
  const goalProgress = goal ? Math.min(100, focused / (goal.targetMinutes * 60) * 100) : 0;
  const resetTask = () => {
    setTitle(''); setEstimate('30'); setPriority('normal'); setEditing(null);
    setTaskDate(day); setTaskTime(''); setReminder('');
  };
  function editTask(task: StudyTask) {
    setEditing(task.id!); setTitle(task.title); setEstimate(String(task.estimatedMinutes)); setPriority(task.priority);
    setTaskDate(task.date); setTaskTime(task.scheduledTime ?? ''); setReminder(task.reminderMinutes?.toString() ?? '');
    taskTitleInput.current?.focus();
  }
  useEffect(() => { setGoalMinutes(String(goal?.targetMinutes ?? 120)); }, [goal?.targetMinutes, day]);
  useEffect(() => { resetTask(); setFocusSetup(defaultFocusSetup); setError(''); }, [day]);
  const prepareTask = (id: string) => {
    const task = dailyTasks.find(task => String(task.id) === id);
    setFocusSetup({ mode: 'focus', selectedTask: task ? id : '', minutes: String(task?.estimatedMinutes ?? 25) });
  };
  const change = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await operation(); onChange(); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };

  return <div className="study-page">
    <div className="study-date-controls">
      <button type="button" className="secondary" onClick={() => onDayChange(localDateKey())}>Today</button>
      <input aria-label="Study date" type="date" required value={day} onChange={event => { if (event.target.value) onDayChange(event.target.value); }}/>
    </div>
    <FocusTimerCard tasks={dailyTasks} setup={focusSetup} onSetupChange={setFocusSetup} onSelectTask={prepareTask} onSaved={onChange}/>
    <section className="study-planning" aria-labelledby="study-planning-title" tabIndex={0}>
      <h2 className="study-page-heading" id="study-planning-title">Your study day</h2>
      {error && <p className="error" role="alert">{error}</p>}
    <div className="study-summary">
      <article className="panel"><Clock3 size={18}/><small>Focused on selected day</small><strong>{formatStudyTime(focused)}</strong><span>{dailySessions.length} saved session{dailySessions.length === 1 ? '' : 's'}</span></article>
      <article className="panel"><ListChecks size={18}/><small>Tasks completed</small><strong>{completed}<em> / {dailyTasks.length}</em></strong><span>{dailyTasks.length ? `${Math.round(completed / dailyTasks.length * 100)}% of your daily plan` : 'Add a task to start your plan'}</span></article>
      <article className="panel"><Target size={18}/><small>Last 7 days</small><strong>{formatStudyTime(weekSeconds)}</strong><span>Ending on the selected date</span></article>
      <article className="panel"><CheckCircle2 size={18}/><small>All-time focus</small><strong>{formatStudyTime(lifetime)}</strong><span>Active study time, excluding breaks</span></article>
    </div>

        <article className="panel study-goal">
          <div className="panelhead"><div><h3>Daily study goal</h3><p>{goal ? `${formatStudyTime(focused)} of ${formatStudyTime(goal.targetMinutes * 60)} focused` : 'Set a realistic time target for this date.'}</p></div><strong>{goal ? `${Math.round(goalProgress)}%` : '—'}</strong></div>
          <div className="study-progress" role="progressbar" aria-label="Daily study goal progress" aria-valuenow={Math.round(goalProgress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${goalProgress}%` }}/></div>
          <form className="study-goal-form" onSubmit={event => { event.preventDefault(); void change(async () => { const targetMinutes = Number(goalMinutes); if (!Number.isFinite(targetMinutes) || targetMinutes < 1 || targetMinutes > 1440) throw new Error('Set a goal between 1 and 1440 minutes.'); await db.studyGoals.put({ date: day, targetMinutes }); }); }}>
            <label>Target minutes<input aria-label="Daily goal minutes" type="number" required min="1" max="1440" value={goalMinutes} onChange={event => setGoalMinutes(event.target.value)}/></label><button className="secondary" disabled={busy}>Save goal</button>
          </form>
        </article>
        <article className="panel study-task-panel">
          <div className="panelhead"><div><h3>Daily tasks</h3><p>Completing an untimed task logs its planned minutes.</p></div><span className="pill">{dailyTasks.length} planned</span></div>
          <div className="study-task-list">{dailyTasks.map(task => <div className={`study-task${task.completed ? ' is-complete' : ''}`} key={task.id}>
            <input type="checkbox" aria-label={`Complete ${task.title}`} checked={task.completed} disabled={busy} onChange={event => { void change(() => setTaskCompleted(task.id!, event.target.checked)); }}/>
            <div className="study-task-copy"><strong>{task.title}</strong><small>{task.scheduledTime && <><time dateTime={task.date + 'T' + task.scheduledTime}>{displayTaskTime(task)}</time>{task.reminderMinutes !== undefined && !task.completed && !task.reminderDismissed ? ' (reminder on)' : ''} · </>}<span className={`study-priority is-${task.priority}`}>{task.priority}</span> · {task.estimatedMinutes} min planned · {formatStudyTime(sessions.filter(session => session.taskId === task.id).reduce((sum, session) => sum + session.seconds, 0))} focused total</small></div>
            <div className="study-task-tools">
              {!task.completed && <button type="button" className="iconbtn" title="Focus on this task" aria-label={`Focus on ${task.title}`} onClick={() => { prepareTask(String(task.id)); document.querySelector('.study-timer')?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}><Play size={15}/></button>}
              <button type="button" className="iconbtn" aria-label={`Edit task ${task.title}`} onClick={() => editTask(task)}><Pencil size={15}/></button>
              <button type="button" className="iconbtn" disabled={busy} aria-label={`Delete task ${task.title}`} onClick={() => { if (confirm('Delete this task? Its saved focus time will be kept.')) void change(async () => { await db.studyTasks.delete(task.id!); if (editing === task.id) resetTask(); }); }}><Trash2 size={15}/></button>
            </div>
          </div>)}</div>
          {!dailyTasks.length && <div className="empty">Your day is a blank page. Add one meaningful task.</div>}
          <form className="study-task-form" onSubmit={event => { event.preventDefault(); void change(async () => {
            const estimatedMinutes = Number(estimate);
            if (!title.trim() || !Number.isFinite(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440) throw new Error('Add a task name and an estimate between 1 and 1440 minutes.');
            const details = { title: title.trim(), estimatedMinutes, priority,
              ...scheduleFields(taskDate, taskTime, reminder, dailyTasks.find(task => task.id === editing)) };
            if (editing !== null) await db.studyTasks.update(editing, details);
            else await db.studyTasks.add({ ...details, completed: false, createdAt: Date.now() });
            resetTask();
          }); }}>
            <label className="study-task-title">Task<input ref={taskTitleInput} aria-label="Study task title" required maxLength={160} placeholder="e.g. Revise percentages and solve 30 questions" value={title} onChange={event => setTitle(event.target.value)}/></label>
            <label>Minutes<input aria-label="Task estimated minutes" type="number" min="1" max="1440" required value={estimate} onChange={event => setEstimate(event.target.value)}/></label>
            <label>Priority<select aria-label="Task priority" value={priority} onChange={event => setPriority(event.target.value as StudyTask['priority'])}><option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option></select></label>
            <details className="study-task-schedule" open={editing !== null && Boolean(taskTime)}>
              <summary>Schedule and reminder</summary>
              <div className="quick-task-fields">
                <label>Task date<input type="date" value={taskDate} required onChange={event => setTaskDate(event.target.value)}/></label>
                <label>Time (optional)<input type="time" value={taskTime} onChange={event => { setTaskTime(event.target.value); if (!event.target.value) setReminder(''); }}/></label>
                <TaskReminderSelect time={taskTime} value={reminder} onChange={setReminder}/>
              </div>
            </details>
            <button className="primary" disabled={busy}>{editing !== null ? 'Save task' : 'Add task'}</button>{editing !== null && <button className="secondary" type="button" onClick={resetTask}>Cancel</button>}
          </form>
        </article>
      <article className="panel"><div className="panelhead"><div><h3>Your last 7 days</h3><p>Saved focus time per day. Pauses and breaks excluded.</p></div></div>
        <div className="study-week-legend"><span>Study time up to goal</span><span>Extra study time</span></div>
        <div className="study-week-chart">{week.map(item => {
          const date = new Date(item.date + 'T12:00:00');
          const goalLabel = item.targetSeconds === null ? 'No goal set' : `Goal: ${formatStudyTime(item.targetSeconds)}`;
          const label = `${item.date}: ${formatStudyTime(item.seconds)} focused. ${goalLabel}.${item.extra ? ` ${formatStudyTime(item.extra)} above goal.` : ''}`;
          return <div className="study-week-day" key={item.date}>
            <span>{formatStudyTime(item.seconds)}</span>
            <div className="study-week-track" role="img" aria-label={label} title={label}>
              {item.seconds > 0 && <div className="study-week-fill" style={{ height: `max(2px, ${item.seconds / weekScale * 100}%)` }}>
                <span className="study-week-base" style={{ flexGrow: item.withinGoal }}/>
                {item.extra > 0 && <span className="study-week-extra" style={{ flexGrow: item.extra }}/>}
              </div>}
            </div>
            <time dateTime={item.date}>{date.toLocaleDateString(undefined, { weekday: 'short' })}</time>
            <small>{date.getDate()}</small>
          </div>;
        })}</div>
      </article>
      <article className="panel"><div className="panelhead"><div><h3>Focus log</h3><p>Sessions contributing time to the selected date.</p></div></div>
        <div className="study-session-list">{dailySessions.map(session => <div className="study-session" key={session.id}><div><strong>{session.title}</strong><small>{session.estimatedForDate ? 'Estimated from task' : <>{new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {session.completed ? 'Completed period' : 'Saved early'}</>}</small></div><b>{formatStudyTime(focusSecondsOnDay([session], day))}</b><button className="iconbtn" type="button" disabled={busy} aria-label={`Delete focus session ${session.title}`} onClick={() => { if (confirm('Delete this focus session? Its time will be removed from your totals.')) void change(() => db.focusSessions.delete(session.id!)); }}><Trash2 size={15}/></button></div>)}</div>
        {!dailySessions.length && <div className="empty">No saved focus sessions for this date yet.</div>}
      </article>
        <p className="muted">Study totals include timed sessions and task estimates shown in the Focus log.</p>
    </section>
  </div>;
}
