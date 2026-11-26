import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, GripVertical, Pause, PictureInPicture2, Play, Timer, X } from 'lucide-react';
import { useUI } from '../../app/uiStore';
import { toggleFocusPause, useFocusStore } from './focusStore';
import { formatClock, timerDisplaySeconds } from './studyMath';
import widgetStyles from '../../styles/focus-timer-widget.css?inline';

type MiniWindowAPI = {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>;
};

type Position = { x: number; y: number };
const moveKeys: Record<string, Position> = {
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
};

function clampWidget(position: Position, bounds: DOMRect): Position {
  const clamp = (value: number, space: number) => Math.min(Math.max(8, value), Math.max(8, space - 8));
  return {
    x: clamp(position.x, document.documentElement.clientWidth - bounds.width),
    y: clamp(position.y, document.documentElement.clientHeight - bounds.height),
  };
}

export default function FocusTimerIndicator({ theme, accent, onAccent }: {
  theme: 'light' | 'dark';
  accent: string;
  onAccent: string;
}) {
  const { timer, now, notice, busy, error } = useFocusStore();
  const view = useUI(state => state.view);
  const setView = useUI(state => state.setView);
  const [miniWindow, setMiniWindow] = useState<Window | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  const pictureInPicture = (window as Window & { documentPictureInPicture?: MiniWindowAPI }).documentPictureInPicture;
  const showFloatingTimer = Boolean(timer && !miniWindow && (view !== 'Study Planner' || pictureInPicture));
  const widgetRef = useRef<HTMLElement>(null);
  const dragOffset = useRef<(Position & { pointerId: number }) | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!showFloatingTimer || !widget) return;
    function keepInView() {
      const bounds = widget!.getBoundingClientRect();
      setPosition(current => {
        if (!current) return current;
        const next = clampWidget(current, bounds);
        return next.x === current.x && next.y === current.y ? current : next;
      });
    }
    const observer = new ResizeObserver(keepInView);
    observer.observe(widget);
    window.addEventListener('resize', keepInView);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', keepInView);
      dragOffset.current = null;
    };
  }, [showFloatingTimer]);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    const bounds = widgetRef.current?.getBoundingClientRect();
    if (!bounds || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = { pointerId: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function dragWidget(event: PointerEvent<HTMLButtonElement>) {
    const offset = dragOffset.current;
    const bounds = widgetRef.current?.getBoundingClientRect();
    if (!offset || !bounds || event.pointerId !== offset.pointerId) return;
    setPosition(clampWidget({ x: event.clientX - offset.x, y: event.clientY - offset.y }, bounds));
  }

  function moveWidgetWithKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const delta = moveKeys[event.key];
    const bounds = widgetRef.current?.getBoundingClientRect();
    if (!delta || !bounds) return;
    event.preventDefault();
    setPosition(clampWidget({ x: bounds.left + delta.x * 16, y: bounds.top + delta.y * 16 }, bounds));
  }

  useEffect(() => {
    if (!miniWindow) return;
    const onClose = () => setMiniWindow(current => current === miniWindow ? null : current);
    miniWindow.addEventListener('pagehide', onClose);
    return () => {
      miniWindow.removeEventListener('pagehide', onClose);
      if (!miniWindow.closed) miniWindow.close();
    };
  }, [miniWindow]);

  async function openMiniWindow() {
    if (!pictureInPicture || opening || miniWindow) return;
    setOpening(true);
    setOpenError('');
    let mini: Window | undefined;
    try {
      mini = await pictureInPicture.requestWindow({ width: 320, height: 176 });
      mini.document.title = 'Study timer';
      const style = mini.document.createElement('style');
      style.textContent = widgetStyles;
      mini.document.head.append(style);
      setMiniWindow(mini);
    } catch {
      mini?.close();
      setOpenError('Mini window could not open. You can still use the floating timer here.');
    } finally {
      setOpening(false);
    }
  }

  function openPlanner(fromMini = false) {
    setView('Study Planner');
    if (fromMini) {
      window.focus();
      miniWindow?.close();
    }
  }

  const paused = timer?.runningSince === null;
  const stopped = timer?.stoppedAt !== undefined;
  const state = timer?.mode === 'stopwatch' ? 'Stopwatch' : timer?.mode === 'break' ? 'Break' : 'Focus';
  const label = stopped ? 'Ready to save' : state;
  const time = timer ? formatClock(timerDisplaySeconds(timer, now)) : '00:00';
  const pauseLabel = paused ? 'Resume' : 'Pause';
  const pauseButton = timer && !stopped && <button type="button" className="focus-widget-action" disabled={busy}
      onClick={() => void toggleFocusPause()} aria-label={pauseLabel + ' timer'} title={pauseLabel + ' timer'}>
    {paused ? <Play size={16} aria-hidden="true"/> : <Pause size={16} aria-hidden="true"/>}
  </button>;
  const colors = { '--widget-accent': accent, '--widget-on-accent': onAccent } as CSSProperties;

  return <>
    {showFloatingTimer &&
      <aside ref={widgetRef} className="focus-widget study-floating-timer" data-theme={theme}
        style={position ? { ...colors, left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : colors} aria-label="Floating study timer">
        <div className="focus-widget-row">
          <button type="button" className="focus-widget-grip" title="Drag or use arrow keys to move"
            aria-label="Move floating timer" onKeyDown={moveWidgetWithKeys} onPointerDown={startDrag}
            onPointerMove={dragWidget} onLostPointerCapture={() => { dragOffset.current = null; }}>
            <GripVertical size={16} aria-hidden="true"/>
          </button>
          <button type="button" className="focus-widget-readout" onClick={() => openPlanner()} aria-label="Open active study timer">
            <Timer size={18} aria-hidden="true"/>
            <span><span className="focus-widget-state">{label}</span><strong>{time}</strong></span>
          </button>
          {pauseButton}
          {pictureInPicture && <button type="button" className="focus-widget-icon" onClick={() => void openMiniWindow()}
            title="Open mini timer window" aria-label="Open mini timer window" disabled={opening}><PictureInPicture2 size={18} aria-hidden="true"/></button>}
        </div>
        {(openError || error) && <small className="focus-widget-message" role="status">{openError || error}</small>}
      </aside>}
    {!timer && notice && !miniWindow && view !== 'Study Planner' &&
      <aside className="focus-widget study-floating-timer focus-widget-notice" data-theme={theme} style={colors} aria-label="Study timer notice">
        <button type="button" className="focus-widget-readout" onClick={() => openPlanner()}><Timer size={18} aria-hidden="true"/><span>{notice}</span></button>
        <button type="button" className="focus-widget-icon" aria-label="Dismiss timer notice" onClick={() => useFocusStore.setState({ notice: '' })}><X size={16} aria-hidden="true"/></button>
      </aside>}
    {miniWindow && createPortal(
      <main className="focus-widget focus-widget-mini" data-theme={theme} style={colors} aria-label="Mini study timer">
        <span className="focus-widget-state">{timer ? label : 'Timer ended'}</span>
        <strong className="focus-widget-mini-clock">{time}</strong>
        <div className="focus-widget-row">
          {pauseButton}
          <button type="button" className="focus-widget-icon" onClick={() => openPlanner(true)}
            title="Open Study Planner" aria-label="Open Study Planner"><ExternalLink size={16} aria-hidden="true"/></button>
        </div>
        {(error || (!timer && notice)) && <small className="focus-widget-message" role="status">{error || notice}</small>}
      </main>,
      miniWindow.document.body,
    )}
  </>;
}
