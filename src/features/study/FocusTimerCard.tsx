import { useState } from 'react';
import { Pause, Play, Square, Timer, Coffee, Clock } from 'lucide-react';
import type { StudyTask } from '../../data/types';
import { finishFocusTimer, maximumTimerMinutes, saveStopwatch, startFocusTimer, stopStopwatch, toggleFocusPause, useFocusStore } from './focusStore';
import { formatClock, timerDisplaySeconds, timerElapsed } from './studyMath';

export type FocusSetup = { mode: 'focus' | 'break' | 'stopwatch'; minutes: string; selectedTask: string };

function StopwatchTaskForm({ tasks, busy, onSaved }: { tasks: StudyTask[]; busy: boolean; onSaved: () => void }) {
  const [taskId, setTaskId] = useState('');
  return <form className="study-timer-form" aria-label="Save stopwatch session" onSubmit={async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (await saveStopwatch(taskId ? { taskId: Number(taskId) } : { title: String(fields.get('taskTitle') ?? '') })) onSaved();
  }}>
    {tasks.length > 0 && <label>Task for this session
      <select value={taskId} onChange={event => setTaskId(event.target.value)}>
        <option value="">Create a new task</option>
        {tasks.map(task => <option key={task.id} value={task.id}>{task.title}{task.completed ? ' (completed)' : ''}</option>)}
      </select>
    </label>}
    {!taskId && <label>Task name<input name="taskTitle" required maxLength={160} placeholder="e.g. Revise vocabulary"/></label>}
    <button className="primary" disabled={busy} type="submit">Save time &amp; complete task</button>
  </form>;
}

export default function FocusTimerCard({ tasks, setup, onSetupChange, onSelectTask, onSaved }: {
  tasks: StudyTask[];
  setup: FocusSetup;
  onSetupChange: (setup: FocusSetup) => void;
  onSelectTask: (id: string) => void;
  onSaved: () => void;
}) {
  const { timer, now, ready, busy, error, notice } = useFocusStore();
  const { mode, minutes, selectedTask } = setup;
  const setMinutes = (value: string) => onSetupChange({ ...setup, minutes: value });
  const [title, setTitle] = useState('');
  const task = tasks.find(task => String(task.id) === selectedTask);
  const elapsed = timer ? timerElapsed(timer, now) : 0;
  const displaySeconds = timer ? timerDisplaySeconds(timer, now) : mode === 'stopwatch' ? 0 : Math.max(0, Number(minutes) || 0) * 60;
  const progress = timer?.durationSeconds ? Math.min(100, elapsed / timer.durationSeconds * 100) : 0;
  const stopped = timer?.stoppedAt !== undefined;
  const isStopwatch = (timer?.mode ?? mode) === 'stopwatch';
  const save = async () => { if (await finishFocusTimer()) onSaved(); };

  return <article className="panel study-timer">
    <div className="panelhead"><h3><Timer size={18}/> Focus period</h3></div>
    {!timer && <div className="segmented study-timer-modes" aria-label="Timer mode">
      <button type="button" className={mode === 'stopwatch' ? 'selected' : ''} onClick={() => onSetupChange({ ...setup, mode: 'stopwatch' })}><Clock size={14}/> Stopwatch</button>
      <button type="button" className={mode === 'focus' ? 'selected' : ''} onClick={() => onSelectTask(selectedTask)}><Timer size={14}/> Focus</button>
      <button type="button" className={mode === 'break' ? 'selected' : ''} onClick={() => onSetupChange({ ...setup, mode: 'break', minutes: '5' })}><Coffee size={14}/> Break</button>
    </div>}
    <div className="study-clock" role="timer" aria-label={isStopwatch ? 'Stopwatch elapsed time' : `${timer?.mode ?? mode} time remaining`}>
      {formatClock(displaySeconds)}
    </div>
    <p className="study-timer-status">{stopped ? 'Choose a task to save this study time.' : timer ?
      `${timer.runningSince === null ? 'Paused' : timer.mode === 'break' ? 'Taking a break' : 'Focusing'} · ${timer.title}` :
      isStopwatch ? 'Start at zero and choose a task when you finish.' : 'Choose a task, settle in, and start.'}</p>
    {!timer && <div className="study-timer-start"><button className="primary" type="submit" form="focus-timer-form" disabled={!ready || busy}><Play size={16}/> {mode === 'stopwatch' ? 'Start stopwatch' : mode === 'focus' ? 'Start focus' : 'Start break'}</button></div>}
    {timer ? <>
      {stopped ? <StopwatchTaskForm key={timer.token} tasks={tasks} busy={busy} onSaved={onSaved}/> : <div className="study-timer-controls">
        <button className="primary" type="button" disabled={busy} onClick={() => void toggleFocusPause()}>{timer.runningSince === null ? <Play size={16}/> : <Pause size={16}/>} {timer.runningSince === null ? 'Resume' : 'Pause'}</button>
        <button className="secondary" type="button" disabled={busy || (isStopwatch && elapsed < 1)} onClick={() => void (isStopwatch ? stopStopwatch() : save())}><Square size={14}/> {isStopwatch ? 'Finish' : timer.mode === 'focus' ? 'Finish & save' : 'End break'}</button>
      </div>}
      {!isStopwatch && <div className="study-progress" aria-hidden="true"><span style={{ width: `${progress}%` }}/></div>}
      <button className="study-text-button" type="button" disabled={busy} onClick={() => { if (confirm('Discard this timer without adding study time?')) void finishFocusTimer(true); }}>Discard timer</button>
      <small className="muted">Only active focus time is saved. Paused time and breaks are excluded.</small>
    </> : <form id="focus-timer-form" className="study-timer-form" onSubmit={event => {
      event.preventDefault();
      if (mode === 'stopwatch') void startFocusTimer({ mode });
      else void startFocusTimer({ mode, minutes: Number(minutes), title: mode === 'break' ? 'Break' : task?.title || title, ...(task?.id !== undefined ? { taskId: task.id } : {}) });
    }}>
      {mode !== 'stopwatch' && <>
        <div className="study-presets">{(mode === 'focus' ? [25, 50, 90] : [5, 10, 15]).map(preset => <button className={Number(minutes) === preset ? 'secondary selected' : 'secondary'} type="button" key={preset} onClick={() => setMinutes(String(preset))}>{preset} min</button>)}</div>
        <label className="study-timer-duration">Minutes<input aria-label="Focus duration" type="number" required min="1" max={maximumTimerMinutes[mode]} value={minutes} onChange={event => setMinutes(event.target.value)}/></label>
      </>}
      {mode === 'focus' && <>
        <label>Link a task<select aria-label="Focus task" value={selectedTask} onChange={event => onSelectTask(event.target.value)}><option value="">Independent study</option>{tasks.filter(task => !task.completed || String(task.id) === selectedTask).map(task => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label>
        {!task && <label>Session name<input aria-label="Focus session name" maxLength={120} placeholder="e.g. Quant revision" value={title} onChange={event => setTitle(event.target.value)}/></label>}
      </>}
      <small className="muted">Keeps running across pages and reloads.</small>
    </form>}
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="study-notice" role="status">{notice}</p>}
  </article>;
}
