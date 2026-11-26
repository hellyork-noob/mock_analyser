export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;
export type GlassSettings = {
  colors: [string, string, string];
  angle: number;
  glow: number;
  opacity: number;
  blur: number;
  border: number;
  shine: number;
  shadow: number;
  performance: boolean;
};

export const glassSliders = {
  angle: { label: 'Gradient direction', min: 0, max: 360, unit: '°' },
  glow: { label: 'Glow intensity', min: 0, max: 100, unit: '%' },
  opacity: { label: 'Sidebar and card transparency', min: 0, max: 100, unit: '%', inverted: true },
  blur: { label: 'Frost blur', min: 0, max: 16, unit: ' px' },
  border: { label: 'Edge brightness', min: 0, max: 100, unit: '%' },
  shine: { label: 'Reflection strength', min: 0, max: 100, unit: '%' },
  shadow: { label: 'Shadow depth', min: 0, max: 100, unit: '%' },
} as const;

export const glassPresets = {
  'Navy Glass': { colors: ['#355cb4', '#513780', '#177280'], angle: 135, glow: 75, opacity: 48, blur: 6, border: 48, shine: 40, shadow: 30, performance: true },
  'Violet Mist': { colors: ['#a25bd4', '#5346a9', '#b9548e'], angle: 145, glow: 84, opacity: 43, blur: 8, border: 56, shine: 48, shadow: 34, performance: true },
  Pearl: { colors: ['#a7c0ef', '#c5afed', '#9accd5'], angle: 135, glow: 80, opacity: 50, blur: 5, border: 52, shine: 44, shadow: 22, performance: true },
} satisfies Record<string, GlassSettings>;

export const defaultGlass: Record<ResolvedTheme, GlassSettings> = {
  dark: glassPresets['Navy Glass'],
  light: glassPresets.Pearl,
};

export type Appearance = {
  accent: 'blue' | 'violet' | 'teal' | 'rose' | 'amber' | 'custom';
  customAccent: string;
  textTone: 'neutral' | 'cool' | 'warm' | 'custom';
  customTextDark: string;
  customTextLight: string;
  glass: Record<ResolvedTheme, GlassSettings>;
  density: 'comfortable' | 'compact';
};
export const defaultAppearance: Appearance = {
  accent: 'blue', customAccent: '#679cff', textTone: 'neutral',
  customTextDark: '#edf0f5', customTextLight: '#202531', glass: defaultGlass, density: 'comfortable',
};
export const accentPresets = {
  blue: ['#82aaff', '#295cba'], violet: ['#b59bff', '#7042b5'],
  teal: ['#62d3c5', '#08776d'], rose: ['#f49eb6', '#a6325b'], amber: ['#eac071', '#805b0b'],
} as const;
export const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));

export function parseGlassColor(value: unknown) {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (isHex(input)) return { hex: input.toLowerCase(), alpha: 1 };
  const match = /^(rgb|rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d+(?:\.\d+)?|\.\d+))?\s*\)$/i.exec(input);
  if (!match || (match[1].toLowerCase() === 'rgba') !== (match[5] !== undefined)) return null;
  const channels = match.slice(2, 5).map(Number);
  const alpha = match[5] === undefined ? 1 : Number(match[5]);
  if (channels.some(channel => channel > 255) || alpha > 1) return null;
  return { hex: '#' + channels.map(channel => channel.toString(16).padStart(2, '0')).join(''), alpha };
}

export function glassRgba(hex: string, alpha: number): string {
  return `rgba(${rgb(hex).join(', ')}, ${Number(alpha.toFixed(4))})`;
}

export function normalizeGlassColor(value: unknown): string | null {
  const color = parseGlassColor(value);
  return color ? (color.alpha === 1 ? color.hex : glassRgba(color.hex, color.alpha)) : null;
}

function normalizeGlass(value: unknown, theme: ResolvedTheme): GlassSettings {
  const defaults = defaultGlass[theme];
  if (value === 'off') return { ...defaults, opacity: 100, glow: 0, shine: 0, blur: 0 };
  if (value === 'subtle') return { ...defaults, opacity: theme === 'light' ? 82 : 76, blur: 0 };
  if (value === 'frosted') return { ...defaults, opacity: theme === 'light' ? 66 : 62, blur: 8 };
  const modes = value as Partial<Record<ResolvedTheme, Partial<GlassSettings>>> | undefined;
  const settings = modes?.[theme];
  const result = { ...defaults };
  for (const key of Object.keys(glassSliders) as (keyof typeof glassSliders)[]) {
    const number = settings?.[key];
    const { min, max } = glassSliders[key];
    if (typeof number === 'number' && Number.isFinite(number)) {
      result[key] = Math.min(max, Math.max(min, Math.round(number)));
    }
  }
  const safeColor = (index: 0 | 1 | 2) => {
    const color = settings?.colors?.[index];
    return normalizeGlassColor(color) ?? defaults.colors[index];
  };
  result.colors = [safeColor(0), safeColor(1), safeColor(2)];
  if (typeof settings?.performance === 'boolean') result.performance = settings.performance;
  return result;
}

export function glassVariables(settings: GlassSettings) {
  const [start, middle, end] = settings.colors.map(color => parseGlassColor(color) ?? { hex: '#000000', alpha: 0 });
  const glow = settings.glow * .38;
  return {
    '--glass-color-start': start.hex,
    '--glass-color-middle': middle.hex,
    '--glass-color-end': end.hex,
    '--glass-glow-start': `${glow * start.alpha}%`,
    '--glass-glow-middle': `${glow * middle.alpha}%`,
    '--glass-glow-end': `${glow * end.alpha}%`,
    '--glass-angle': `${settings.angle}deg`,
    '--glass-opacity': `${settings.opacity}%`,
    '--glass-blur': `${settings.performance ? Math.min(6, settings.blur) : settings.blur}px`,
    '--glass-border': settings.border / 100,
    '--glass-shine': settings.shine / 100,
    '--glass-shadow-depth': settings.shadow / 100,
  };
}

export function normalizeAppearance(value: unknown): Appearance {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<Appearance>;
  return {
    accent: ['blue', 'violet', 'teal', 'rose', 'amber', 'custom'].includes(input.accent ?? '') ? input.accent! : defaultAppearance.accent,
    customAccent: isHex(input.customAccent) ? input.customAccent : defaultAppearance.customAccent,
    textTone: ['neutral', 'cool', 'warm', 'custom'].includes(input.textTone ?? '') ? input.textTone! : defaultAppearance.textTone,
    customTextDark: isHex(input.customTextDark) ? input.customTextDark : defaultAppearance.customTextDark,
    customTextLight: isHex(input.customTextLight) ? input.customTextLight : defaultAppearance.customTextLight,
    glass: { dark: normalizeGlass(input.glass, 'dark'), light: normalizeGlass(input.glass, 'light') },
    density: input.density === 'compact' ? 'compact' : 'comfortable',
  };
}
const luminance = (hex: string) => rgb(hex).map(channel => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
}
export function readableColor(color: string, background: string): string {
  if (contrast(color, background) >= 4.5) return color;
  const source = rgb(color);
  const destination = luminance(background) < .4 ? 255 : 0;
  for (let step = 1; step <= 20; step++) {
    const adjusted = '#' + source.map(channel => Math.round(channel + (destination - channel) * step / 20).toString(16).padStart(2, '0')).join('');
    if (contrast(adjusted, background) >= 4.5) return adjusted;
  }
  return destination ? '#ffffff' : '#000000';
}
export function appearanceColors(preferences: Appearance, theme: 'dark' | 'light') {
  const light = theme === 'light';
  const surface = light ? '#f8f9fc' : '#22252c';
  const rawAccent = preferences.accent === 'custom' ? preferences.customAccent : accentPresets[preferences.accent][light ? 1 : 0];
  const text = preferences.textTone === 'custom' ? (light ? preferences.customTextLight : preferences.customTextDark) :
    ({ neutral: ['#edf0f5', '#202531'], cool: ['#dce7f8', '#22334a'], warm: ['#f2eadb', '#3d3027'] } as const)[preferences.textTone][light ? 1 : 0];
  const accent = readableColor(rawAccent, surface);
  return { accent, text: readableColor(text, surface), onAccent: contrast(accent, '#111318') >= contrast(accent, '#ffffff') ? '#111318' : '#ffffff' };
}
