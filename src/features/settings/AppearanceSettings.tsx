import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useUI } from '../../app/uiStore';
import { useAppearance } from '../../app/appearanceStore';
import { accentPresets, type Appearance, type ThemeMode } from '../../app/appearance';
import { useResolvedTheme } from '../../app/useResolvedTheme';
import BackgroundGlassSettings from './BackgroundGlassSettings';

export default function AppearanceSettings() {
  const { theme, setTheme } = useUI();
  const resolved = useResolvedTheme(theme);
  const { preferences, update, reset, presets, savePreset, deletePreset } = useAppearance();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  return <section className="appearance-settings" aria-labelledby="appearance-title">
    <div className="between"><div><h3 id="appearance-title">Make it yours</h3><p>Neutral surfaces. Your colors. Changes preview throughout the app.</p></div><button className="secondary" type="button" onClick={() => { reset(); setTheme('dark'); setMessage('Default charcoal and blue restored.'); }}><RotateCcw size={15}/> Reset</button></div>
    <div className="appearance-grid">
      <label>Appearance<select aria-label="Appearance mode" value={theme} onChange={event => setTheme(event.target.value as ThemeMode)}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label>
      <label>Text color<select aria-label="Text color tone" value={preferences.textTone} onChange={event => update({ textTone: event.target.value as Appearance['textTone'] })}><option value="neutral">Soft white / neutral ink</option><option value="cool">Cool gray</option><option value="warm">Warm ivory</option><option value="custom">Custom</option></select></label>
      <label>Interface density<select aria-label="Interface density" value={preferences.density} onChange={event => update({ density: event.target.value as Appearance['density'] })}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
    </div>
    <div className="appearance-accents" role="group" aria-label="Accent colors">{Object.entries(accentPresets).map(([accent, colors]) => <button type="button" key={accent} aria-pressed={preferences.accent === accent} onClick={() => update({ accent: accent as Appearance['accent'] })}><span style={{ background: colors[resolved === 'light' ? 1 : 0] }}/>{accent}</button>)}<label className="appearance-custom">Custom accent<input type="color" aria-label="Custom accent color" value={preferences.customAccent} onChange={event => update({ accent: 'custom', customAccent: event.target.value })}/></label></div>
    {preferences.textTone === 'custom' && <label className="appearance-custom">Custom text for {resolved} mode<input type="color" aria-label="Custom text color" value={resolved === 'dark' ? preferences.customTextDark : preferences.customTextLight} onChange={event => update(resolved === 'dark' ? { customTextDark: event.target.value } : { customTextLight: event.target.value })}/></label>}
    <BackgroundGlassSettings theme={resolved}/>
    <form className="appearance-save" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; savePreset({ name: name.trim(), theme, preferences: { ...preferences } }); setMessage(`Saved preset “${name.trim()}”.`); setName(''); }}><input aria-label="Appearance preset name" required maxLength={40} placeholder="Name this appearance" value={name} onChange={event => setName(event.target.value)}/><button className="secondary">Save preset</button></form>
    <div className="appearance-saved">{presets.map(preset => <div key={preset.name}><button type="button" className="secondary" onClick={() => { update(preset.preferences); setTheme(preset.theme); setMessage(`Applied “${preset.name}”.`); }}>{preset.name}</button><button type="button" className="iconbtn" aria-label={`Delete appearance preset ${preset.name}`} onClick={() => deletePreset(preset.name)}><Trash2 size={14}/></button></div>)}</div>
    {message && <p role="status" className="muted">{message}</p>}
  </section>;
}
