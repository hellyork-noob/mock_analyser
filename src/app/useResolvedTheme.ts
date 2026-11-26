import { useEffect, useState } from 'react';
import type { ThemeMode } from './appearance';

export function useResolvedTheme(mode: ThemeMode): 'dark' | 'light' {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return mode === 'system' ? systemDark ? 'dark' : 'light' : mode;
}
