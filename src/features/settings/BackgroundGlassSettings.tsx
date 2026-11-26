import { useState } from 'react';
import { defaultGlass, glassPresets, glassRgba, glassSliders, normalizeGlassColor, parseGlassColor, type GlassSettings, type ResolvedTheme } from '../../app/appearance';
import { useAppearance } from '../../app/appearanceStore';

type SliderKey = keyof typeof glassSliders;

function GlassColorInput({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const { hex, alpha } = parseGlassColor(value) ?? { hex: '#000000', alpha: 1 };
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  return <div className="glass-color-editor">
    <label>{label} RGBA
      <input type="text" spellCheck={false} autoComplete="off" value={draft ?? glassRgba(hex, alpha)}
        onChange={event => {
          const text = event.target.value;
          setDraft(text);
          const color = normalizeGlassColor(text);
          setInvalid(color === null);
          if (color) onChange(color);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}/>
    </label>
    <input type="color" aria-label={label + ' color picker'} value={hex} onChange={event => {
      setDraft(null);
      setInvalid(false);
      onChange(alpha === 1 ? event.target.value : glassRgba(event.target.value, alpha));
    }}/>
    {invalid && <small role="status">Color kept. Use RGBA with channels from 0 to 255 and alpha from 0 to 1.</small>}
  </div>;
}

export default function BackgroundGlassSettings({ theme }: { theme: ResolvedTheme }) {
  const { preferences, update } = useAppearance();
  const settings = preferences.glass[theme];
  const match = Object.entries(glassPresets).find(([, preset]) =>
    preset.colors.every((color, index) => color === settings.colors[index]) &&
    preset.performance === settings.performance &&
    (Object.keys(glassSliders) as SliderKey[]).every(key => preset[key] === settings[key]),
  );
  const setGlass = (changes: Partial<GlassSettings>) => {
    const current = useAppearance.getState().preferences.glass;
    update({ glass: { ...current, [theme]: { ...current[theme], ...changes } } });
  };
  const slider = (key: SliderKey) => {
    const config = glassSliders[key];
    const { label, min, max, unit } = config;
    const display = (value: number) => 'inverted' in config ? 100 - value : value;
    return <label className="glass-slider" key={key}>
      <span>{label}<output>{display(settings[key])}{unit}</output></span>
      <input type="range" aria-label={label} min={min} max={max} value={display(settings[key])}
        onChange={event => setGlass({ [key]: display(event.target.valueAsNumber) })}/>
    </label>;
  };

  return <section className="glass-settings" aria-labelledby="glass-settings-title">
    <div className="between">
      <div>
        <h3 id="glass-settings-title">Background &amp; Glass</h3>
        <p>Editing {theme} mode. Changes apply live and save automatically.</p>
      </div>
      <button type="button" className="secondary" onClick={() => setGlass(defaultGlass[theme])}>
        Reset {theme} glass
      </button>
    </div>
    <div className="glass-pickers">
      <label>Glass preset
        <select value={match?.[0] ?? 'Custom'} onChange={event => setGlass(glassPresets[event.target.value as keyof typeof glassPresets])}>
          {Object.keys(glassPresets).map(preset => <option key={preset}>{preset}</option>)}
          <option disabled>Custom</option>
        </select>
      </label>
      {(['Start', 'Middle', 'End'] as const).map((label, index) =>
        <GlassColorInput key={theme + label} label={label} value={settings.colors[index]} onChange={color => {
          const colors: GlassSettings['colors'] = [...useAppearance.getState().preferences.glass[theme].colors];
          colors[index] = color;
          setGlass({ colors });
        }}/>,
      )}
    </div>
    <div className="glass-preview">
      <div className="glass-preview-sidebar">Sidebar</div>
      <div className="glass-preview-card">
        <strong>Card</strong>
      </div>
    </div>
    <div className="glass-sliders">{(['opacity', 'blur', 'shine'] as const).map(slider)}</div>
    <details className="glass-advanced">
      <summary>Advanced</summary>
      <div className="glass-sliders">{(['angle', 'glow', 'border', 'shadow'] as const).map(slider)}</div>
      <label className="glass-performance">
        <input type="checkbox" checked={settings.performance} onChange={event => setGlass({ performance: event.target.checked })}/>
        Performance mode
      </label>
      <small className="muted">Limits blur to 6 px on the desktop sidebar and dialog backdrops.</small>
    </details>
  </section>;
}
