import { Palette, GraduationCap, Database, Plug } from 'lucide-react';
import { YouTubeApiSettings } from './YouTubeApiSettings';
import { ExamManager } from '../exams/ExamManager';
import type { Mock, CustomExamProfile } from '../../data/types';
import { useUI, type SettingsSection } from '../../app/uiStore';
import AppearanceSettings from './AppearanceSettings';
import BackupSettings from './BackupSettings';

const sections = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'exams', label: 'Exams & targets', icon: GraduationCap },
  { id: 'backups', label: 'Backups & storage', icon: Database },
  { id: 'connections', label: 'Connections', icon: Plug },
] satisfies Array<{ id: SettingsSection; label: string; icon: typeof Palette }>;

export default function SettingsPage({ mocks, customProfiles, reload }: {
  mocks: Mock[]; customProfiles: CustomExamProfile[]; reload: () => void;
}) {
  const { setExam, settingsSection, setSettingsSection } = useUI();
  return <div className="settings settings-page">
    <div className="settings-page-intro"><span className="eyebrow">YOUR WORKSPACE</span><h2>Settings</h2><p>Personalize the look, configure your exams, and keep your study records organized.</p></div>
    <div className="settings-tabs" role="tablist" aria-label="Settings sections">
      {sections.map(({ id, label, icon: Icon }, index) => <button type="button" key={id} id={`settings-tab-${id}`} role="tab" aria-selected={settingsSection === id} aria-controls={`settings-panel-${id}`} tabIndex={settingsSection === id ? 0 : -1} onClick={() => setSettingsSection(id)} onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
        else if (event.key === 'ArrowLeft') next = (index + sections.length - 1) % sections.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = sections.length - 1;
        else return;
        event.preventDefault(); setSettingsSection(sections[next].id);
        document.getElementById(`settings-tab-${sections[next].id}`)?.focus();
      }}><Icon size={18} aria-hidden="true"/><span>{label}</span>{id === 'exams' && <small>{customProfiles.length}</small>}</button>)}
    </div>
    <section className="panel settings-panel" id="settings-panel-appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" hidden={settingsSection !== 'appearance'}><AppearanceSettings/></section>
    <section className="panel settings-panel" id="settings-panel-exams" role="tabpanel" aria-labelledby="settings-tab-exams" hidden={settingsSection !== 'exams'}><ExamManager profiles={customProfiles} mockExams={mocks.map(mock => mock.exam)} onChange={reload} onSelect={setExam}/></section>
    <section className="panel settings-panel" id="settings-panel-backups" role="tabpanel" aria-labelledby="settings-tab-backups" hidden={settingsSection !== 'backups'}><BackupSettings onRestored={reload}/></section>
    <section className="panel settings-panel" id="settings-panel-connections" role="tabpanel" aria-labelledby="settings-tab-connections" hidden={settingsSection !== 'connections'}><div className="settings-section-heading"><h3>Connections</h3><p>Manage the services used by your study tools.</p></div><YouTubeApiSettings/></section>
  </div>;
}
