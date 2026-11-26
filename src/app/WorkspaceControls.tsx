import { GraduationCap, Sun, Moon } from 'lucide-react';
import { useUI } from './uiStore';
import { useResolvedTheme } from './useResolvedTheme';

export default function WorkspaceControls({ availableExams }: { availableExams: string[] }) {
  const { exam, setExam, theme, toggleTheme } = useUI();
  const resolved = useResolvedTheme(theme);
  return <div className="sidebar-preferences">
    <label className="sidebar-exam" title={exam || 'Select an exam'}>
      <span className="sidebar-control-label">Selected exam</span>
      <GraduationCap className="sidebar-exam-icon" size={19} aria-hidden="true"/>
      <select aria-label="Selected exam" value={exam} onChange={event => setExam(event.target.value)}>
        {!availableExams.length && <option value="">Create an exam in Settings</option>}
        {availableExams.map(exam => <option key={exam} value={exam}>{exam}</option>)}
      </select>
    </label>
    <button className="sidebar-theme" type="button" title="Toggle theme" aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
      {resolved === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
      <span>{resolved === 'dark' ? 'Light theme' : 'Dark theme'}</span>
    </button>
  </div>;
}
