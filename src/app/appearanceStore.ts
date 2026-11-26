import { create } from 'zustand';
import { defaultAppearance, normalizeAppearance, type Appearance, type ThemeMode } from './appearance';

export type AppearancePreset = { name: string; theme: ThemeMode; preferences: Appearance };
function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
export function normalizePresets(value: unknown): AppearancePreset[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item.name === 'string' && ['light', 'dark', 'system'].includes(item.theme))
    .slice(0, 12).map(item => ({ name: item.name.slice(0, 40), theme: item.theme, preferences: normalizeAppearance(item.preferences) }));
}
export const useAppearance = create<{
  preferences: Appearance;
  presets: AppearancePreset[];
  update: (changes: Partial<Appearance>) => void;
  reset: () => void;
  restore: (preferences: Appearance, presets: AppearancePreset[]) => void;
  savePreset: (preset: AppearancePreset) => void;
  deletePreset: (name: string) => void;
}>((set, get) => ({
  preferences: normalizeAppearance(read('aa_appearance')),
  presets: normalizePresets(read('aa_appearance_presets')),
  restore: (preferences, presets) => {
    localStorage.setItem('aa_appearance', JSON.stringify(preferences));
    localStorage.setItem('aa_appearance_presets', JSON.stringify(presets));
    set({ preferences, presets });
  },
  update: changes => {
    const preferences = normalizeAppearance({ ...get().preferences, ...changes });
    localStorage.setItem('aa_appearance', JSON.stringify(preferences)); set({ preferences });
  },
  reset: () => { localStorage.setItem('aa_appearance', JSON.stringify(defaultAppearance)); set({ preferences: { ...defaultAppearance } }); },
  savePreset: preset => {
    const presets = [...get().presets.filter(item => item.name !== preset.name), preset].slice(-12);
    localStorage.setItem('aa_appearance_presets', JSON.stringify(presets)); set({ presets });
  },
  deletePreset: name => {
    const presets = get().presets.filter(item => item.name !== name);
    localStorage.setItem('aa_appearance_presets', JSON.stringify(presets)); set({ presets });
  },
}));
