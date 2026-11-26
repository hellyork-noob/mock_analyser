import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useUI } from "./uiStore";
import { useWorkspaceData } from "./useWorkspaceData";
import Sidebar from "./Sidebar";
import { useAppearance } from "./appearanceStore";
import { appearanceColors, glassVariables } from "./appearance";
import { useResolvedTheme } from "./useResolvedTheme";
import FocusTimerController from "../features/study/FocusTimerController";
import FocusTimerIndicator from "../features/study/FocusTimerIndicator";
import QuickTaskDialog from "../features/study/QuickTaskDialog";
import TaskReminders from "../features/study/TaskReminders";
import { localDateKey } from "../features/study/studyMath";
const StudyPlannerPage = lazy(() => import("../features/study/StudyPlannerPage"));
const AnalyticsPage = lazy(() => import('../features/analytics/AnalyticsPage'));
const MockForm = lazy(() => import('../features/mocks/MockForm'));
const HistoryPage = lazy(() => import('../features/mocks/HistoryPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const CountdownBoard = lazy(() => import('../features/countdown/CountdownBoard').then(module => ({ default: module.CountdownBoard })));
const PlaylistBoard = lazy(() => import('../features/playlists/PlaylistBoard').then(module => ({ default: module.PlaylistBoard })));
export default function App() {
    const { view, theme, compact, setView, exam, setExam, setSettingsSection, } = useUI();
    const { mocks, exams, playlists, customProfiles, tasks, goals, sessions, reload, dbReady, dbError } = useWorkspaceData();
    const [studyDay, setStudyDay] = useState(localDateKey);
    const [quickTaskOpen, setQuickTaskOpen] = useState(false);
    useEffect(() => {
        function handleQuickTask(event: KeyboardEvent) {
            if (event.repeat || event.isComposing || event.defaultPrevented || !event.altKey || !event.shiftKey ||
                event.ctrlKey || event.metaKey || event.code !== 'KeyQ' || document.querySelector('.modal-layer')) return;
            event.preventDefault();
            if (dbReady) setQuickTaskOpen(true);
        }
        window.addEventListener('keydown', handleQuickTask);
        return () => window.removeEventListener('keydown', handleQuickTask);
    }, [dbReady]);
    const availableExams = useMemo(() => [...new Set([
        ...customProfiles.map(profile => profile.key),
        ...mocks.map(mock => mock.exam).filter(Boolean),
    ])], [customProfiles, mocks]);
    useEffect(() => {
        if (!dbReady)
            return;
        if (!availableExams.includes(exam) && exam !== (availableExams[0] ?? ''))
            setExam(availableExams[0] ?? '');
    }, [availableExams, exam, setExam, dbReady]);
    const resolvedTheme = useResolvedTheme(theme);
    const preferences = useAppearance(state => state.preferences);
    const colors = appearanceColors(preferences, resolvedTheme);
    const glass = preferences.glass[resolvedTheme];
    const appearanceStyle = {
        ...glassVariables(glass),
        "--accent": colors.accent,
        "--on-accent": colors.onAccent,
        "--text": colors.text,
        "--accentbg": `${colors.accent}1c`,
        "--ui-focus": `${colors.accent}40`,
    } as CSSProperties;
    return (<div className={"app " + resolvedTheme + (compact ? " compact" : "")} data-glass-performance={glass.performance} data-density={preferences.density} style={appearanceStyle}>
      {dbError && (<div role="alert" style={{
                position: "fixed",
                top: 12,
                left: "20%",
                right: 12,
                zIndex: 9999,
                padding: 16,
                background: "#7f1d1d",
                color: "white",
                borderRadius: 10,
            }}>
          Database could not be loaded: {dbError}. Do not add new records. Check
          browser storage and your backup.
        </div>)}
      {!dbReady && !dbError && (<div role="status" style={{
                position: "fixed",
                top: 12,
                right: 12,
                zIndex: 9999,
                padding: 10,
                background: "#1e293b",
                color: "white",
                borderRadius: 8,
            }}>
          Loading saved records…
        </div>)}
      <FocusTimerController onSaved={reload}/>
      <FocusTimerIndicator theme={resolvedTheme} accent={colors.accent} onAccent={colors.onAccent}/>
      <Sidebar availableExams={availableExams} quickTaskEnabled={dbReady} onQuickTask={() => setQuickTaskOpen(true)}/>
      {quickTaskOpen && <QuickTaskDialog day={view === 'Study Planner' ? studyDay : localDateKey()}
        onClose={() => setQuickTaskOpen(false)} onSaved={() => { setQuickTaskOpen(false); reload(); }}/>}
      <TaskReminders tasks={tasks} onChange={reload} onOpen={day => { setStudyDay(day); setView('Study Planner'); }}/>
      <main aria-label={view} className={view === "Study Planner" ? "study-workspace" : undefined}>
        <section className="content">
    <Suspense fallback={<div className="panel" role="status">Loading page?</div>}>
          {view === "Analytics" &&
            (exam ? (<AnalyticsPage mocks={mocks} exam={exam} profile={customProfiles.find((p) => p.key === exam)} onAdd={() => setView("Add Mock")}/>) : (<div className="panel p5-empty-start">
                <h3>No exams configured</h3>
                <p>
                  Create your first exam and tier in Settings to begin analyzing
                  mocks.
                </p>
                <button className="primary" onClick={() => { setSettingsSection("exams"); setView("Settings"); }}>
                  Create an exam
                </button>
              </div>))}
          {view === "Add Mock" &&
            (exam && customProfiles.some(profile => profile.key === exam) ? (<>
                <MockForm key={exam} exam={exam} custom={customProfiles.find((p) => p.key === exam)} onSave={reload} onDone={() => setView("Mock History")}/>
              </>) : (<div className="panel p5-empty-start">
                <h3>Create an exam first</h3>
                <p>
                  Configure sections, questions, marking and duration in
                  Settings.
                </p>
                <button className="primary" onClick={() => setView("Settings")}>
                  Create an exam
                </button>
              </div>))}{" "}
          {view === "Mock History" && (<HistoryPage mocks={mocks} exam={exam} customProfiles={customProfiles} reload={reload}/>)}
          {view === "Exam Countdown" && (<CountdownBoard exams={exams} onChange={reload}/>)}{" "}
          {view === "Study Playlist" && (<PlaylistBoard playlists={playlists} onChange={reload}/>)}
          {view === "Study Planner" && <StudyPlannerPage day={studyDay} onDayChange={setStudyDay} tasks={tasks} goals={goals} sessions={sessions} onChange={reload}/>}
          {view === "Settings" && (<SettingsPage mocks={mocks} customProfiles={customProfiles} reload={reload}/>)}
    </Suspense>
        </section>
      </main>
    </div>);
}
