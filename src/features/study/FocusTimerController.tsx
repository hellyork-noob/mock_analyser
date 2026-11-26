import { useEffect } from 'react';
import { finishFocusTimer, restoreFocusTimer, tickFocusTimer, useFocusStore } from './focusStore';
import { timerElapsed } from './studyMath';

export default function FocusTimerController({ onSaved }: { onSaved: () => void }) {
  useEffect(() => {
    let active = true;
    const check = async () => {
      tickFocusTimer();
      const { timer, ready } = useFocusStore.getState();
      if (ready && timer && timer.durationSeconds !== null && timerElapsed(timer) >= timer.durationSeconds) {
        if (await finishFocusTimer() && active) onSaved();
      }
    };
    void restoreFocusTimer().then(() => { if (active) void check(); });
    const interval = window.setInterval(() => void check(), 1000);
    const onVisible = () => {
      if (!document.hidden) void restoreFocusTimer().then(() => { if (active) void check(); });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [onSaved]);
  return null;
}
