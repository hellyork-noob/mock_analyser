import MockDetail from "./MockDetail";
import { CountdownBoard, PlaylistBoard } from "./CountdownPlaylist";
import { YouTubeApiSettings } from "./YouTubeApiSettings";
import {
  captureSnapshot,
  listSnapshots,
  restoreSnapshot,
  downloadSnapshot,
  requestPersistentStorage,
  isStoragePersistent,
} from "./autoBackup";
import AnalyticsPlus from "./AnalyticsPlus";
import { ExamManager } from "./ExamManager";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  CalendarDays,
  ListVideo,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Download,
  ArrowUpRight,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  db,
  exportBackup,
  importBackup,
  type Mock,
  type Exam,
  type Playlist,
  type SectionResult,
  type CustomExamProfile,
} from "./db";
import "./style.css";
type View =
  | "Analytics"
  | "Add Mock"
  | "Mock History"
  | "Exam Countdown"
  | "Study Playlist"
  | "Settings";
const icons = [
  LayoutDashboard,
  PlusCircle,
  History,
  CalendarDays,
  ListVideo,
  Settings,
];
const views: View[] = [
  "Analytics",
  "Add Mock",
  "Mock History",
  "Exam Countdown",
  "Study Playlist",
  "Settings",
];
const subjects: string[] = [];
const useUI = create<{
  view: View;
  theme: "dark" | "light";
  compact: boolean;
  exam: string;
  setExam: (v: string) => void;
  setView: (v: View) => void;
  toggleTheme: () => void;
  toggleCompact: () => void;
}>((set) => ({
  view:
    views.find((v) => v === localStorage.getItem("aa_v2_clean_view")) ??
    "Analytics",
  theme:
    localStorage.getItem("aa_v2_clean_theme") === "light" ? "light" : "dark",
  compact: localStorage.getItem("aa_v2_clean_compact") === "true",
  exam: localStorage.getItem("aa_v2_clean_exam") || "",
  setExam: (exam) => {
    localStorage.setItem("aa_v2_clean_exam", exam);
    set({ exam });
  },
  setView: (view) => {
    localStorage.setItem("aa_v2_clean_view", view);
    set({ view });
  },
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "dark" ? "light" : "dark";
      localStorage.setItem("aa_v2_clean_theme", theme);
      return { theme };
    }),
  toggleCompact: () =>
    set((s) => {
      const compact = !s.compact;
      localStorage.setItem("aa_v2_clean_compact", String(compact));
      return { compact };
    }),
}));

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Advance Analyzer rendering error", error, info);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="aa-recovery" role="alert">
        <section className="aa-recovery-card">
          <h2>This view couldn't be displayed</h2>
          <p>
            Your stored records have not been cleared. Reload to try again, or
            open the Analytics page.
          </p>
          <div className="aa-recovery-actions">
            <button type="button" onClick={() => location.reload()}>
              Reload app
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("aa_v2_clean_view", "Analytics");
                location.reload();
              }}
            >
              Open Analytics
            </button>
          </div>
        </section>
      </main>
    );
  }
}

function App() {
  const {
    view,
    theme,
    compact,
    setView,
    toggleTheme,
    toggleCompact,
    exam,
    setExam,
  } = useUI();
  const [mocks, setMocks] = useState<Mock[]>([]),
    [exams, setExams] = useState<Exam[]>([]),
    [playlists, setPlaylists] = useState<Playlist[]>([]),
    [customProfiles, setCustomProfiles] = useState<CustomExamProfile[]>([]),
    [refresh, setRefresh] = useState(0),
    [dbError, setDbError] = useState(""),
    [dbReady, setDbReady] = useState(false);
  const reload = () => setRefresh((x) => x + 1);
  useEffect(() => {
    const save = () => {
      captureSnapshot().catch((e) =>
        console.error("Automatic backup failed", e),
      );
    };
    const timer = window.setInterval(save, 20000);
    document.addEventListener("visibilitychange", save);
    save();
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", save);
    };
  }, []);
  useEffect(() => {
    if (dbReady)
      captureSnapshot().catch((e) =>
        console.error("Automatic backup failed", e),
      );
  }, [dbReady, refresh]);
  useEffect(() => {
    let active = true;
    setDbReady(false);
    Promise.all([
      db.mocks.toArray(),
      db.exams.toArray(),
      db.playlists.toArray(),
      db.customExamProfiles.toArray(),
    ])
      .then(([m, e, p, c]) => {
        if (!active) return;
        setMocks(m);
        setExams(e);
        setPlaylists(p);
        setCustomProfiles(c);
        setDbError("");
        setDbReady(true);
      })
      .catch((error) => {
        console.error("Advance Analyzer: database read failed", error);
        if (active) {
          setDbError(error instanceof Error ? error.message : String(error));
          setDbReady(false);
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    if (!dbReady) return;
    if (customProfiles.length && !customProfiles.some((p) => p.key === exam))
      setExam(customProfiles[0].key);
    else if (!customProfiles.length && exam) setExam("");
  }, [customProfiles, exam, setExam, dbReady]);
  const [mode, setMode] = useState<"Full" | "Sectional">("Full");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySort, setHistorySort] = useState<
    "newest" | "oldest" | "score-high" | "score-low"
  >("newest");
  const [historySubject, setHistorySubject] = useState("All");
  const [historyProvider, setHistoryProvider] = useState("All");
  const [editingMock, setEditingMock] = useState<Mock | null>(null);
  const [viewingMock, setViewingMock] = useState<Mock | null>(null);
  useEffect(() => {
    setHistorySubject("All");
    setHistoryProvider("All");
    setEditingMock(null);
    setViewingMock(null);
  }, [exam]);
  const historyProviders = [
    ...new Set(
      mocks
        .filter((m) => m.exam === exam)
        .map((m) => m.provider?.trim() || "Unspecified"),
    ),
  ].sort();
  const historyRows = mocks
    .filter(
      (m) =>
        m.exam === exam &&
        (historySubject === "All" ||
          (historySubject === "Full Mock"
            ? m.subject === "Full Mock"
            : m.subject === historySubject ||
              !!m.sections?.some((x) => x.subject === historySubject))) &&
        (historyProvider === "All" ||
          (m.provider || "Unspecified") === historyProvider) &&
        (
          m.title +
          " " +
          (m.provider ?? "") +
          " " +
          (m.mockName ?? "") +
          " " +
          m.exam +
          " " +
          m.subject
        )
          .toLowerCase()
          .includes(historySearch.toLowerCase()),
    )
    .sort((a, b) => {
      if (historySort === "score-high" || historySort === "score-low") {
        const diff =
          (a.maxScore ? (100 * a.score) / a.maxScore : 0) -
          (b.maxScore ? (100 * b.score) / b.maxScore : 0);
        return historySort === "score-high" ? -diff : diff;
      }
      const diff = a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0);
      return historySort === "newest" ? -diff : diff;
    });
  const availableExams = customProfiles.map((p) => p.key);
  const filtered = mocks.filter((m) => m.exam === exam);
  const analyticsRecords =
    mode === "Full"
      ? filtered.filter((m) => m.subject === "Full Mock")
      : filtered.flatMap((m) =>
          m.sections?.length
            ? m.sections
                .filter((x) => x.subject === subjectFilter)
                .map((x) => ({ ...m, ...x, subject: x.subject }))
            : m.subject === subjectFilter
              ? [m]
              : [],
        );
  const average = analyticsRecords.length
    ? analyticsRecords.reduce(
        (a, m) => a + (m.maxScore ? (100 * m.score) / m.maxScore : 0),
        0,
      ) / analyticsRecords.length
    : 0;
  const accuracy =
    (analyticsRecords.reduce((a, m) => a + m.correct, 0) /
      Math.max(
        1,
        analyticsRecords.reduce((a, m) => a + m.correct + m.incorrect, 0),
      )) *
    100;
  return (
    <div className={"app " + theme + (compact ? " compact" : "")}>
      {dbError && (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: 12,
            left: "20%",
            right: 12,
            zIndex: 9999,
            padding: 16,
            background: "#7f1d1d",
            color: "white",
            borderRadius: 10,
          }}
        >
          Database could not be loaded: {dbError}. Do not add new records. Check
          browser storage and your backup.
        </div>
      )}
      {!dbReady && !dbError && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 9999,
            padding: 10,
            background: "#1e293b",
            color: "white",
            borderRadius: 8,
          }}
        >
          Loading saved records…
        </div>
      )}
      <aside className="sidebar">
        <div className="brand">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-512.png`}
            alt="Advance Analyzer"
            className="brandicon"
          />

          {!compact && (
            <div>
              <strong>Advance Analyzer</strong>
            </div>
          )}
        </div>

        <div className="navlabel">{!compact ? "WORKSPACE" : "•••"}</div>
        <nav>
          {views.map((v, i) => {
            const Icon = icons[i];
            return (
              <button
                key={v}
                title={v}
                className={view === v ? "active" : ""}
                onClick={() => setView(v)}
              >
                <Icon size={18} />
                {!compact && <span>{v}</span>}
              </button>
            );
          })}
        </nav>
        <div className="sidefoot">
          <button onClick={toggleCompact}>
            {compact ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}{" "}
            {!compact && "Collapse sidebar"}
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <h1>{view}</h1>
          </div>
          <div className="headright">
            <label className="examselect">
              <span>EXAM</span>
              <select
                aria-label="Selected exam"
                value={exam}
                onChange={(e) => setExam(e.target.value)}
              >
                {!availableExams.length && (
                  <option value="">No exams — create one in Settings</option>
                )}
                {availableExams.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <button
              className="iconbtn"
              title="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <section className="content">
          {view === "Analytics" &&
            (exam ? (
              <AnalyticsPlus
                mocks={mocks}
                exams={exams}
                exam={exam}
                profile={customProfiles.find((p) => p.key === exam)}
                onAdd={() => setView("Add Mock")}
              />
            ) : (
              <div className="panel p5-empty-start">
                <h3>No exams configured</h3>
                <p>
                  Create your first exam and tier in Settings to begin analyzing
                  mocks.
                </p>
                <button className="primary" onClick={() => setView("Settings")}>
                  Create an exam
                </button>
              </div>
            ))}
          {view === "Add Mock" &&
            (exam ? (
              <>
                <MockForm
                  key={exam}
                  exam={exam}
                  custom={customProfiles.find((p) => p.key === exam)}
                  onSave={reload}
                  onDone={() => setView("Mock History")}
                />
              </>
            ) : (
              <div className="panel p5-empty-start">
                <h3>Create an exam first</h3>
                <p>
                  Configure sections, questions, marking and duration in
                  Settings.
                </p>
                <button className="primary" onClick={() => setView("Settings")}>
                  Create an exam
                </button>
              </div>
            ))}{" "}
          {view === "Mock History" && (
            <div className="panel aa-history-panel">
              <div className="panelhead aa-history-head">
                <div>
                  <h3>
                    Mock history{" "}
                    <span className="aa-history-count">
                      {historyRows.length}
                    </span>
                  </h3>
                  <p>{exam || "No exam selected"} · saved tests</p>
                </div>
                <div className="p4-history-filters">
                  <input
                    aria-label="Search mock history"
                    placeholder="Search mocks"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                  <select
                    aria-label="Filter by subject"
                    value={historySubject}
                    onChange={(e) => setHistorySubject(e.target.value)}
                  >
                    <option>All</option>
                    <option>Full Mock</option>
                    {[
                      ...new Set(
                        customProfiles
                          .filter((p) => p.key === exam)
                          .flatMap((p) => p.sections.map((s) => s.name)),
                      ),
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by provider"
                    value={historyProvider}
                    onChange={(e) => setHistoryProvider(e.target.value)}
                  >
                    <option value="All">All providers</option>
                    {historyProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Sort mock history"
                    value={historySort}
                    onChange={(e) =>
                      setHistorySort(
                        e.target.value as
                          | "newest"
                          | "oldest"
                          | "score-high"
                          | "score-low",
                      )
                    }
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="score-high">Highest score %</option>
                    <option value="score-low">Lowest score %</option>
                  </select>
                  {(historySearch ||
                    historySubject !== "All" ||
                    historyProvider !== "All" ||
                    historySort !== "newest") && (
                    <button
                      type="button"
                      className="aa-history-reset"
                      onClick={() => {
                        setHistorySearch("");
                        setHistorySubject("All");
                        setHistoryProvider("All");
                        setHistorySort("newest");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
              {mocks.some((m) => m.exam === exam) ? (
                <div className="tablewrap aa-history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Mock</th>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Accuracy</th>
                        <th>Percentile</th>
                        <th>Time</th>
                        <th>Speed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <strong>{m.title}</strong>
                            <small>{m.subject}</small>
                          </td>
                          <td>{m.date}</td>
                          <td>
                            <strong>
                              {m.score} / {m.maxScore}
                            </strong>
                            <small>
                              {m.maxScore > 0
                                ? ((100 * m.score) / m.maxScore).toFixed(1) +
                                  "%"
                                : "—"}
                            </small>
                          </td>
                          <td>
                            {(
                              (m.correct /
                                Math.max(1, m.correct + m.incorrect)) *
                              100
                            ).toFixed(0)}
                            %
                          </td>
                          <td>
                            {m.percentile !== undefined
                              ? `${m.percentile.toFixed(2)}%`
                              : "—"}
                          </td>
                          <td>
                            {m.timeMinutes && m.timeMinutes > 0
                              ? `${m.timeMinutes} min`
                              : "—"}
                          </td>
                          <td>
                            {m.timeMinutes && m.timeMinutes > 0
                              ? `${((m.correct + m.incorrect) / m.timeMinutes).toFixed(2)} Q/min`
                              : "—"}
                          </td>
                          <td>
                            <div className="actions">
                              <button
                                className="aa-history-view"
                                title="View detailed analysis"
                                aria-label={`View analysis for ${m.title}`}
                                onClick={() => setViewingMock(m)}
                              >
                                View Analysis
                              </button>
                              <button
                                title="Edit mock"
                                aria-label={`Edit ${m.title}`}
                                onClick={() => setEditingMock(m)}
                              >
                                <Pencil size={17} />
                              </button>
                              {m.url && (
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Open mock"
                                >
                                  <ArrowUpRight size={17} />
                                </a>
                              )}
                              <button
                                title="Delete mock"
                                onClick={async () => {
                                  if (confirm("Delete this v2 mock?")) {
                                    await db.mocks.delete(m.id!);
                                    reload();
                                  }
                                }}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {historyRows.length === 0 && (
                    <Empty text="No mocks match your filters." />
                  )}
                </div>
              ) : (
                <Empty text="No mocks for the selected exam yet. Add your first mock." />
              )}
              {viewingMock && (
                <MockDetail
                  mock={viewingMock}
                  profile={customProfiles.find(
                    (p) => p.key === viewingMock.exam,
                  )}
                  onClose={() => setViewingMock(null)}
                />
              )}
              {editingMock && (
                <EditMockDialog
                  key={editingMock.id}
                  mock={editingMock}
                  custom={customProfiles.find(
                    (p) => p.key === editingMock.exam,
                  )}
                  onClose={() => setEditingMock(null)}
                  onSaved={() => {
                    setEditingMock(null);
                    reload();
                  }}
                />
              )}
            </div>
          )}
          {view === "Exam Countdown" && (
            <CountdownBoard exams={exams} onChange={reload} />
          )}{" "}
          {view === "Study Playlist" && (
            <PlaylistBoard playlists={playlists} onChange={reload} />
          )}
          {view === "Settings" && (
            <div className="panel settings">
              <h3>Workspace preferences</h3>
              <p>
                This project uses a separate IndexedDB database and v2-prefixed
                preferences. It does not read or modify your existing Advance
                Analyzer data.
              </p>
              <div className="settingrow">
                <div>
                  <strong>Appearance</strong>
                  <small>Switch between Midnight Pro and Arctic Light</small>
                </div>
                <button className="secondary" onClick={toggleTheme}>
                  {theme === "dark" ? "Use light theme" : "Use dark theme"}
                </button>
              </div>
              <div className="settingrow">
                <div>
                  <strong>Export v2 backup</strong>
                  <small>Save your v2 records to a JSON file</small>
                </div>
                <button className="secondary" onClick={exportBackup}>
                  <Download size={16} /> Export JSON
                </button>
              </div>
              <div className="settingrow">
                <div>
                  <strong>Restore JSON backup</strong>
                  <small>
                    Replaces current records after confirmation. Make a fresh
                    export first.
                  </small>
                </div>
                <label
                  className="secondary"
                  style={{ cursor: "pointer", padding: 10 }}
                >
                  Choose backup JSON
                  <input
                    type="file"
                    accept=".json,application/json"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const raw = await file.text();
                        const parsed = JSON.parse(raw);
                        const counts = [
                          "mocks",
                          "exams",
                          "playlists",
                          "customExamProfiles",
                        ]
                          .map(
                            (k) =>
                              `${k}: ${Array.isArray(parsed[k]) ? parsed[k].length : "missing"}`,
                          )
                          .join(", ");
                        if (
                          !confirm(
                            `Restore backup (${counts})? This REPLACES current records. Export your current data first.`,
                          )
                        )
                          return;
                        await importBackup(parsed);
                        reload();
                        alert(
                          "Backup restored. Please reload the page and check your records.",
                        );
                      } catch (err) {
                        alert(
                          "Restore failed: " +
                            (err instanceof Error ? err.message : String(err)),
                        );
                      }
                    }}
                  />
                </label>
              </div>
              <div className="settingrow">
                <div>
                  <strong>Storage diagnostics</strong>
                  <small>
                    Database: advance_analyzer_v2_clean_phase5a · Current
                    origin: {location.origin}
                  </small>
                </div>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      const counts = await Promise.all([
                        db.mocks.count(),
                        db.customExamProfiles.count(),
                        db.exams.count(),
                        db.playlists.count(),
                      ]);
                      const storage = await navigator.storage?.estimate?.();
                      const persisted = await navigator.storage?.persisted?.();
                      alert(
                        `Stored records\nMocks: ${counts[0]}\nCustom exams: ${counts[1]}\nCountdowns: ${counts[2]}\nPlaylists: ${counts[3]}\nStorage persistent: ${persisted ?? "unknown"}\nEstimated usage: ${storage?.usage ?? "unknown"} bytes`,
                      );
                    } catch (err) {
                      alert("Storage check failed: " + String(err));
                    }
                  }}
                >
                  Check storage
                </button>
              </div>
              <YouTubeApiSettings />
              <AutoBackupPanel onRestored={reload} />
              <ExamManager
                profiles={customProfiles}
                mockExams={mocks.map((m) => m.exam)}
                onChange={reload}
                onSelect={setExam}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric">
      <div className="eyebrow">{label}</div>
      <div className="metricvalue">{value}</div>
      <small>{detail}</small>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <div className="emptyicon">◈</div>
      {text}
    </div>
  );
}
function ExamProfileCard({
  exam,
  custom,
}: {
  exam: string;
  custom?: CustomExamProfile;
}) {
  if (!custom) return null;
  return (
    <div className="panel p4d-profile">
      <div className="between">
        <div>
          <span className="eyebrow">YOUR EXAM CONFIGURATION</span>
          <h3>{custom.key}</h3>
        </div>
        <span className="pill">Editable in Settings</span>
      </div>
      <div className="p4d-specs">
        <div>
          <small>Questions</small>
          <strong>
            {custom.sections.reduce((a, b) => a + b.questions, 0)}
          </strong>
        </div>
        <div>
          <small>Maximum marks</small>
          <strong>{custom.sections.reduce((a, b) => a + b.maxMarks, 0)}</strong>
        </div>
        <div>
          <small>Time limit</small>
          <strong>{custom.durationMinutes} min</strong>
        </div>
        <div>
          <small>Sections</small>
          <strong>{custom.sections.map((x) => x.name).join(", ")}</strong>
        </div>
      </div>
    </div>
  );
}

function MockForm({
  exam,
  custom,
  onSave,
  onDone,
}: {
  exam: string;
  custom?: CustomExamProfile;
  onSave: () => void;
  onDone: () => void;
}) {
  const rules = custom?.sections ?? [];
  const [kind, setKind] = useState("Full Mock");
  const [counts, setCounts] = useState<
    Record<string, { correct: number; incorrect: number }>
  >({});
  const [times, setTimes] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("aa_v21_providers") || "[]");
      return Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string" && !!x.trim())
        : [];
    } catch {
      return [];
    }
  });
  const [provider, setProvider] = useState("");
  const [manageProviders, setManageProviders] = useState(false);
  const [newProvider, setNewProvider] = useState("");
  useEffect(() => {
    localStorage.setItem("aa_v21_providers", JSON.stringify(providers));
  }, [providers]);
  function addProvider() {
    const name = newProvider.trim();
    if (!name) return;
    if (
      providers.some((p) => p.toLocaleLowerCase() === name.toLocaleLowerCase())
    ) {
      setError("Provider already exists.");
      return;
    }
    setProviders((old) => [...old, name].sort((a, b) => a.localeCompare(b)));
    setProvider(name);
    setNewProvider("");
    setError("");
  }
  function removeProvider(name: string) {
    if (
      !window.confirm(
        `Remove ${name} from the provider list? Existing saved mocks will not be changed.`,
      )
    )
      return;
    setProviders((old) => old.filter((p) => p !== name));
    if (provider === name) setProvider("");
  }
  function renameProvider(name: string) {
    const next = window
      .prompt(
        "Rename provider (existing mock records will keep their original provider):",
        name,
      )
      ?.trim();
    if (!next || next === name) return;
    if (
      providers.some(
        (p) => p !== name && p.toLocaleLowerCase() === next.toLocaleLowerCase(),
      )
    ) {
      setError("Provider already exists.");
      return;
    }
    setProviders((old) =>
      old
        .map((p) => (p === name ? next : p))
        .sort((a, b) => a.localeCompare(b)),
    );
    if (provider === name) setProvider(next);
  }
  const [mockName, setMockName] = useState("");
  const [percentile, setPercentile] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  // Each exam has its own recoverable unfinished mock. Do not touch IndexedDB.
  const draftKey = `aa_v22_add_mock_draft_${encodeURIComponent(exam)}`;
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        if (
          typeof saved.kind === "string" &&
          (saved.kind === "Full Mock" ||
            rules.some((r) => r.name === saved.kind))
        )
          setKind(saved.kind);
        if (saved.counts && typeof saved.counts === "object")
          setCounts(
            saved.counts as Record<
              string,
              { correct: number; incorrect: number }
            >,
          );
        if (saved.times && typeof saved.times === "object")
          setTimes(saved.times as Record<string, string>);
        if (typeof saved.provider === "string") setProvider(saved.provider);
        if (typeof saved.mockName === "string") setMockName(saved.mockName);
        if (typeof saved.percentile === "string")
          setPercentile(saved.percentile);
        if (typeof saved.date === "string") setDate(saved.date);
        if (typeof saved.url === "string") setUrl(saved.url);
      }
    } catch (err) {
      console.warn("Could not restore Add Mock draft", err);
    }
    setDraftLoaded(true);
  }, [draftKey]);
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          kind,
          counts,
          times,
          provider,
          mockName,
          percentile,
          date,
          url,
        }),
      );
    } catch (err) {
      console.warn("Could not save Add Mock draft", err);
    }
  }, [
    draftKey,
    draftLoaded,
    kind,
    counts,
    times,
    provider,
    mockName,
    percentile,
    date,
    url,
  ]);
  const active =
    kind === "Full Mock" ? rules : rules.filter((r) => r.name === kind);
  const sections = active.map((r) => {
    const c = counts[r.name]?.correct ?? 0,
      w = counts[r.name]?.incorrect ?? 0;
    return {
      subject: r.name,
      correct: c,
      incorrect: w,
      unattempted: r.questions - c - w,
      score: Number((c * r.positive - w * r.negative).toFixed(2)),
      maxScore: r.maxMarks,
      sectionType: (r.sectionType ?? "main") as "main" | "qualifying",
      ...(times[r.name]?.trim() ? { timeMinutes: Number(times[r.name]) } : {}),
    };
  });
  const totals = sections.reduce(
    (a, r) => ({
      correct: a.correct + r.correct,
      incorrect: a.incorrect + r.incorrect,
      unattempted: a.unattempted + r.unattempted,
      score: a.score + (r.sectionType === "qualifying" ? 0 : r.score),
      maxScore: a.maxScore + (r.sectionType === "qualifying" ? 0 : r.maxScore),
    }),
    { correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 },
  );
  const timedMainSections = sections.filter(
    (s) => s.sectionType !== "qualifying",
  );
  const enteredTimes = timedMainSections.filter(
    (s) => s.timeMinutes !== undefined,
  );
  const totalTime = enteredTimes.reduce(
    (sum, s) => sum + (s.timeMinutes ?? 0),
    0,
  );
  const setCount = (
    name: string,
    key: "correct" | "incorrect",
    value: number,
  ) =>
    setCounts((old) => ({
      ...old,
      [name]: {
        correct: old[name]?.correct ?? 0,
        incorrect: old[name]?.incorrect ?? 0,
        [key]: value,
      },
    }));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!custom || !rules.length) {
      setError("Select a configured exam first.");
      return;
    }
    if (!provider.trim() || !mockName.trim() || !date) {
      setError("Enter provider, mock name and date.");
      return;
    }
    if (
      sections.some(
        (s) =>
          s.correct < 0 ||
          s.incorrect < 0 ||
          !Number.isInteger(s.correct) ||
          !Number.isInteger(s.incorrect) ||
          s.unattempted < 0,
      )
    ) {
      setError("Correct + Wrong cannot exceed section questions.");
      return;
    }
    if (
      sections.some(
        (s) =>
          s.timeMinutes !== undefined &&
          (!Number.isFinite(s.timeMinutes) || s.timeMinutes <= 0),
      )
    ) {
      setError("Subject times must be positive.");
      return;
    }
    if (
      enteredTimes.length !== 0 &&
      enteredTimes.length !== timedMainSections.length
    ) {
      setError(
        "Enter time for every subject, or leave all subject times blank.",
      );
      return;
    }
    const pct = percentile.trim() ? Number(percentile) : undefined;
    if (pct !== undefined && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      setError("Percentile must be between 0 and 100.");
      return;
    }
    try {
      await db.mocks.add({
        title: `${provider.trim()} ${mockName.trim()}`,
        mockName: mockName.trim(),
        provider: provider.trim(),
        exam,
        date,
        subject: kind,
        ...totals,
        url: url.trim(),
        ...(pct !== undefined ? { percentile: pct } : {}),
        ...(enteredTimes.length
          ? { timeMinutes: Number(totalTime.toFixed(2)) }
          : {}),
        ...(kind === "Full Mock" ||
        active.some((r) => r.sectionType === "qualifying")
          ? { sections }
          : {}),
        ...(kind !== "Full Mock" && enteredTimes.length
          ? { sectionTimeMinutes: sections[0].timeMinutes }
          : {}),
      });
      localStorage.removeItem(draftKey);
      onSave();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mock");
    }
  }
  return (
    <form
      className="panel formpanel aa-addmock-editstyle v21-addmock"
      onSubmit={submit}
    >
      <div className="v21-form-head">
        <h3>Add mock</h3>
        <div className="segmented">
          <button
            type="button"
            className={kind === "Full Mock" ? "selected" : ""}
            onClick={() => setKind("Full Mock")}
          >
            Full mock
          </button>
          <button
            type="button"
            className={kind !== "Full Mock" ? "selected" : ""}
            onClick={() => setKind(rules[0]?.name ?? "Full Mock")}
          >
            Sectional
          </button>
        </div>
      </div>
      <div className="v21-fields">
        <label>
          Provider
          <div className="v21-provider-control">
            <select
              required
              value={provider}
              onChange={(e) => {
                if (e.target.value === "__manage__") {
                  setManageProviders(true);
                } else setProvider(e.target.value);
              }}
            >
              <option value="">Select provider</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="__manage__">Add / manage providers</option>
            </select>
            <button
              type="button"
              className="v21-manage-btn"
              onClick={() => setManageProviders((x) => !x)}
              title="Add or remove providers"
            >
              Manage
            </button>
          </div>
        </label>
        <label>
          Mock name / number
          <input
            required
            value={mockName}
            onChange={(e) => setMockName(e.target.value)}
            placeholder="e.g. Live 1"
          />
        </label>
        <label>
          Test date
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Percentile (optional)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentile}
            onChange={(e) => setPercentile(e.target.value)}
            placeholder="e.g. 94.65"
          />
        </label>
        <label className="v21-url">
          Mock link
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
        {kind !== "Full Mock" && (
          <label>
            Subject
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {rules.map((r) => (
                <option key={r.name}>{r.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {manageProviders && (
        <div className="v21-provider-manager">
          <div className="v21-provider-add">
            <input
              aria-label="New provider name"
              placeholder="New provider name"
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addProvider();
                }
              }}
            />
            <button type="button" className="secondary" onClick={addProvider}>
              + Add
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setManageProviders(false)}
              aria-label="Close provider manager"
            >
              ×
            </button>
          </div>
          <div className="v21-provider-list">
            {providers.map((p) => (
              <span key={p} className="v21-provider-chip">
                {p}
                <button
                  type="button"
                  onClick={() => renameProvider(p)}
                  title={`Rename ${p}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => removeProvider(p)}
                  title={`Remove ${p}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <small>
            Removing or renaming a provider here does not change saved mock
            records.
          </small>
        </div>
      )}
      <div className="v21-title-preview">
        Mock title:{" "}
        <strong>
          {provider && mockName.trim()
            ? `${provider} ${mockName.trim()}`
            : "Select provider and enter mock name"}
        </strong>
      </div>
      <div className="v21-table-wrap">
        <div className="v21-row v21-table-head">
          <span>Subject</span>
          <span>Correct</span>
          <span>Wrong</span>
          <span>Time (min)</span>
          <span>Score</span>
        </div>
        {sections.map((s) => {
          const rule = rules.find((r) => r.name === s.subject);
          return (
            <div className="v21-row" key={s.subject}>
              <strong
                className="v21-subject"
                style={{ color: subjectColor(s.subject) }}
              >
                {s.subject}
                <small>
                  {rule?.questions} questions ·{" "}
                  {s.sectionType === "qualifying" ? "Qualifying" : "Main"}
                </small>
              </strong>
              <input
                aria-label={`${s.subject} correct`}
                type="number"
                min="0"
                step="1"
                max={(rule?.questions ?? 0) - s.incorrect}
                value={s.correct}
                onChange={(e) =>
                  setCount(s.subject, "correct", Number(e.target.value))
                }
              />
              <input
                aria-label={`${s.subject} wrong`}
                type="number"
                min="0"
                step="1"
                max={(rule?.questions ?? 0) - s.correct}
                value={s.incorrect}
                onChange={(e) =>
                  setCount(s.subject, "incorrect", Number(e.target.value))
                }
              />
              <input
                aria-label={`${s.subject} time in minutes`}
                type="number"
                min="0.1"
                step="0.1"
                placeholder="—"
                value={times[s.subject] ?? ""}
                onChange={(e) =>
                  setTimes((old) => ({ ...old, [s.subject]: e.target.value }))
                }
              />
              <div className="v21-score">
                <strong>{s.score.toFixed(2)}</strong>
                <small>/ {s.maxScore}</small>
              </div>
            </div>
          );
        })}
      </div>
      <div className="v21-footer">
        <span>
          Skipped: {totals.unattempted} · Attempted:{" "}
          {totals.correct + totals.incorrect}
        </span>
        <span>
          Time:{" "}
          {enteredTimes.length
            ? `${Number(totalTime.toFixed(2))} min`
            : "Not recorded"}
        </span>
        <strong>
          Score: {totals.score.toFixed(2)} / {totals.maxScore}
        </strong>
        <button type="submit" className="primary">
          Save mock
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
function subjectColor(subject: string) {
  const key = subject.trim().toLowerCase();
  return key.includes("math")
    ? "#8b72ff"
    : key.includes("reason")
      ? "#38bdf8"
      : key.includes("english")
        ? "#20bd89"
        : key === "gs" || key.includes("general")
          ? "#d99a00"
          : "var(--accent)";
}

function enteredTimeNote() {
  return <small>Auto-calculated when subject times are entered</small>;
}
function EditMockDialog({
  mock,
  custom,
  onClose,
  onSaved,
}: {
  mock: Mock;
  custom?: CustomExamProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const configuredRules = custom?.sections;
  const [draft, setDraft] = useState<Mock>(() => ({
    ...mock,
    sections: mock.sections?.map((s) => ({ ...s })),
  }));
  const [error, setError] = useState("");
  const [editProvider, setEditProvider] = useState(mock.provider ?? "");
  const [editName, setEditName] = useState(
    mock.mockName ??
      (mock.provider && mock.title.startsWith(mock.provider + " ")
        ? mock.title.slice(mock.provider.length + 1)
        : mock.title),
  );
  const [editPercentile, setEditPercentile] = useState(
    mock.percentile === undefined ? "" : String(mock.percentile),
  );
  const [editTimes, setEditTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (mock.sections ?? []).map((s) => [
        s.subject,
        s.timeMinutes === undefined ? "" : String(s.timeMinutes),
      ]),
    ),
  );
  const isFull = draft.subject === "Full Mock";
  const hasSections = isFull && !!draft.sections?.length;
  const storedSections = hasSections ? draft.sections! : [];
  const ruleFor = (name: string) =>
    configuredRules?.find((s) => s.name === name);
  // Only automatically rescore records whose stored maximum marks and question totals
  // agree with the current rules. Older/changed configurations retain their saved scoring.
  const compatible = (s: SectionResult) => {
    const rule = ruleFor(s.subject);
    return (
      !!rule &&
      Math.abs(s.maxScore - rule.maxMarks) < 0.001 &&
      s.correct + s.incorrect + s.unattempted === rule.questions
    );
  };
  const sectionAuto =
    storedSections.length > 0 &&
    storedSections.every(compatible) &&
    storedSections.every(
      (s) =>
        !(
          s.sectionType === undefined &&
          ruleFor(s.subject)?.sectionType === "qualifying"
        ),
    );
  const singleAuto =
    !hasSections &&
    !!ruleFor(draft.subject) &&
    Math.abs(draft.maxScore - ruleFor(draft.subject)!.maxMarks) < 0.001 &&
    draft.correct + draft.incorrect + draft.unattempted ===
      ruleFor(draft.subject)!.questions;
  const update = (key: keyof Mock, value: string | number) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const recalc = (
    s: SectionResult,
    correct: number,
    incorrect: number,
    automatic: boolean,
  ): SectionResult => {
    const rule = ruleFor(s.subject);
    if (automatic && rule)
      return {
        ...s,
        correct,
        incorrect,
        unattempted: rule.questions - correct - incorrect,
        score: Number(
          (correct * rule.positive - incorrect * rule.negative).toFixed(2),
        ),
        maxScore: rule.maxMarks,
        sectionType: s.sectionType ?? rule.sectionType ?? "main",
      };
    // For historical mocks with unknown rules, preserve the stored maximum marks and score.
    const totalQuestions = s.correct + s.incorrect + s.unattempted;
    return {
      ...s,
      correct,
      incorrect,
      unattempted: totalQuestions - correct - incorrect,
    };
  };
  const updateSection = (
    index: number,
    key: "correct" | "incorrect",
    value: number,
  ) =>
    setDraft((old) => ({
      ...old,
      sections: old.sections?.map((s, i) =>
        i === index
          ? recalc(
              s,
              key === "correct" ? value : s.correct,
              key === "incorrect" ? value : s.incorrect,
              sectionAuto,
            )
          : s,
      ),
    }));
  const updateSingle = (key: "correct" | "incorrect", value: number) =>
    setDraft((old) => {
      const next = recalc(
        {
          subject: old.subject,
          correct: old.correct,
          incorrect: old.incorrect,
          unattempted: old.unattempted,
          score: old.score,
          maxScore: old.maxScore,
        },
        key === "correct" ? value : old.correct,
        key === "incorrect" ? value : old.incorrect,
        singleAuto,
      );
      return { ...old, ...next };
    });
  const totals = hasSections
    ? storedSections.reduce(
        (a, s) => ({
          correct: a.correct + s.correct,
          incorrect: a.incorrect + s.incorrect,
          unattempted: a.unattempted + s.unattempted,
          score:
            a.score +
            ((s.sectionType ?? ruleFor(s.subject)?.sectionType) === "qualifying"
              ? 0
              : s.score),
          maxScore:
            a.maxScore +
            ((s.sectionType ?? ruleFor(s.subject)?.sectionType) === "qualifying"
              ? 0
              : s.maxScore),
        }),
        { correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 },
      )
    : {
        correct: draft.correct,
        incorrect: draft.incorrect,
        unattempted: draft.unattempted,
        score: draft.score,
        maxScore: draft.maxScore,
      };
  const auto = hasSections ? sectionAuto : singleAuto;
  const numberInput = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    max: number,
  ) => (
    <label className="p4g-number">
      {label}
      <input
        type="number"
        min="0"
        max={Math.max(0, max)}
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        required
      />
    </label>
  );
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const provider = editProvider.trim(),
      name = editName.trim();
    const pct = editPercentile.trim() ? Number(editPercentile) : undefined;
    if (!name) {
      setError("Enter a mock name.");
      return;
    }
    if (pct !== undefined && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      setError("Percentile must be between 0 and 100.");
      return;
    }
    const changedSections = hasSections
      ? storedSections.map((s) => ({
          ...s,
          timeMinutes: editTimes[s.subject]?.trim()
            ? Number(editTimes[s.subject])
            : undefined,
        }))
      : undefined;
    if (
      changedSections?.some(
        (s) =>
          s.timeMinutes !== undefined &&
          (!Number.isFinite(s.timeMinutes) || s.timeMinutes <= 0),
      )
    ) {
      setError("Subject times must be positive.");
      return;
    }
    const timedMainSections =
      changedSections?.filter(
        (s) =>
          (ruleFor(s.subject)?.sectionType ?? s.sectionType) !== "qualifying",
      ) ?? [];
    const entered = timedMainSections.filter(
      (s) => s.timeMinutes !== undefined,
    );
    if (entered.length && entered.length !== timedMainSections.length) {
      setError("Enter time for every subject or leave all blank.");
      return;
    }
    const sectionTotal = entered.length
      ? Number(
          entered.reduce((sum, s) => sum + (s.timeMinutes ?? 0), 0).toFixed(2),
        )
      : undefined;
    const record = {
      ...draft,
      ...totals,
      title: provider ? `${provider} ${name}` : name,
      provider: provider || undefined,
      mockName: name,
      percentile: pct,
      ...(changedSections ? { sections: changedSections } : {}),
      ...(changedSections && entered.length
        ? { timeMinutes: sectionTotal }
        : {}),
      ...(changedSections &&
      !entered.length &&
      mock.sections?.some((s) => s.timeMinutes !== undefined)
        ? { timeMinutes: undefined }
        : {}),
    };
    const rows = hasSections
      ? storedSections
      : [{ subject: draft.subject, ...totals }];
    if (!record.title.trim() || !record.date || !record.exam) {
      setError("Mock name, exam, and date are required.");
      return;
    }
    if (
      rows.some(
        (s) =>
          ![s.correct, s.incorrect, s.unattempted].every(
            (n) => Number.isInteger(n) && n >= 0,
          ),
      )
    ) {
      setError(
        "Correct and Wrong must be whole numbers and cannot exceed available questions.",
      );
      return;
    }
    if (
      rows.some(
        (s) =>
          !Number.isFinite(s.score) ||
          !Number.isFinite(s.maxScore) ||
          s.maxScore <= 0 ||
          s.score > s.maxScore,
      )
    ) {
      setError("Check scores and maximum marks.");
      return;
    }
    if (
      record.timeMinutes !== undefined &&
      (!Number.isFinite(record.timeMinutes) || record.timeMinutes <= 0)
    ) {
      setError("Time must be positive.");
      return;
    }
    if (
      !auto &&
      rows.some((s) => s.correct + s.incorrect + s.unattempted < 1)
    ) {
      setError("Invalid question totals.");
      return;
    }
    try {
      if (mock.id === undefined) throw new Error("Mock has no record ID");
      const { id: _, ...changes } = record;
      const updated = await db.mocks.update(mock.id, changes);
      if (!updated) throw new Error("The original mock record was not found.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update mock");
    }
  }
  return (
    <div
      className="p4-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="p4-dialog panel p4g-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p4-edit-title"
      >
        <div className="between">
          <div>
            <h3 id="p4-edit-title">Edit mock</h3>
            <p>Update the existing record without creating a duplicate.</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X size={19} />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="formgrid compactform">
            <label>
              Provider
              <input
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value)}
                placeholder="Optional for legacy mocks"
              />
            </label>
            <label>
              Mock name / number
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </label>
            <label>
              Percentile
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={editPercentile}
                onChange={(e) => setEditPercentile(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <label>
              Exam
              <input readOnly value={draft.exam} />
            </label>
            <label>
              Date
              <input
                type="date"
                value={draft.date}
                onChange={(e) => update("date", e.target.value)}
                required
              />
            </label>
            {!isFull && (
              <label>
                Subject
                <input readOnly value={draft.subject} />
              </label>
            )}
            <label>
              Time (minutes){hasSections && enteredTimeNote()}
              <input
                disabled={hasSections && Object.values(editTimes).some(Boolean)}
                type="number"
                min="0.1"
                step="0.1"
                value={draft.timeMinutes ?? ""}
                onChange={(e) =>
                  setDraft((old) => ({
                    ...old,
                    timeMinutes: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="Optional"
              />
            </label>
            <label className="wide">
              Mock URL
              <input
                type="url"
                value={draft.url ?? ""}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>
          {!auto && (
            <div className="p4g-warning" role="note">
              This mock does not match the current saved marking configuration,
              or no scoring rules are available. To protect historical scores,
              automatic rescoring is disabled. You can edit answer counts below;
              saved scores remain unchanged unless you explicitly change them.
            </div>
          )}
          <div className="p4g-breakdown">
            <div className="p4g-row p4g-heading v21-edit-row">
              <span>Subject</span>
              <span>Correct</span>
              <span>Wrong</span>
              <span>Time (min)</span>
              <span>Score</span>
            </div>
            {hasSections ? (
              storedSections.map((s, i) => {
                const max = s.correct + s.incorrect + s.unattempted;
                return (
                  <div className="p4g-row v21-edit-row" key={i}>
                    <strong>
                      {s.subject}
                      <small>
                        {max} questions ·{" "}
                        {(s.sectionType ?? ruleFor(s.subject)?.sectionType) ===
                        "qualifying"
                          ? "Qualifying"
                          : "Main"}
                      </small>
                    </strong>
                    {numberInput(
                      "Correct",
                      s.correct,
                      (n) => updateSection(i, "correct", n),
                      max - s.incorrect,
                    )}
                    {numberInput(
                      "Wrong",
                      s.incorrect,
                      (n) => updateSection(i, "incorrect", n),
                      max - s.correct,
                    )}
                    <label className="p4g-number">
                      Time
                      <input
                        aria-label={`${s.subject} time`}
                        type="number"
                        min="0.1"
                        step="0.1"
                        placeholder="—"
                        value={editTimes[s.subject] ?? ""}
                        onChange={(e) =>
                          setEditTimes((old) => ({
                            ...old,
                            [s.subject]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="p4g-score">
                      {sectionAuto ? (
                        s.score.toFixed(2)
                      ) : (
                        <input
                          aria-label={`${s.subject} score`}
                          type="number"
                          step="0.01"
                          value={s.score}
                          onChange={(e) =>
                            setDraft((old) => ({
                              ...old,
                              sections: old.sections?.map((r, j) =>
                                i === j
                                  ? { ...r, score: Number(e.target.value) }
                                  : r,
                              ),
                            }))
                          }
                        />
                      )}
                      <small>/ {s.maxScore}</small>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p4g-row">
                <strong>
                  {draft.subject}
                  <small>
                    {draft.correct + draft.incorrect + draft.unattempted}{" "}
                    questions
                  </small>
                </strong>
                {numberInput(
                  "Correct",
                  draft.correct,
                  (n) => updateSingle("correct", n),
                  draft.correct + draft.unattempted,
                )}
                {numberInput(
                  "Wrong",
                  draft.incorrect,
                  (n) => updateSingle("incorrect", n),
                  draft.incorrect + draft.unattempted,
                )}
                <div className="p4g-score">
                  {singleAuto ? (
                    draft.score.toFixed(2)
                  ) : (
                    <input
                      aria-label="Mock score"
                      type="number"
                      step="0.01"
                      value={draft.score}
                      onChange={(e) => update("score", Number(e.target.value))}
                    />
                  )}
                  <small>/ {draft.maxScore}</small>
                </div>
              </div>
            )}
            <div className="p4g-total">
              <span>
                Skipped: {totals.unattempted} · Attempted:{" "}
                {totals.correct + totals.incorrect}
              </span>
              <strong>
                Total: {totals.score.toFixed(2)} / {totals.maxScore}
              </strong>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="formactions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function ExamForm({ onSave }: { onSave: () => void }) {
  return (
    <form
      className="panel inlineform"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await db.exams.add({
          name: String(f.get("name")),
          date: String(f.get("date")),
        });
        e.currentTarget.reset();
        onSave();
      }}
    >
      <label>
        Exam name
        <input name="name" required placeholder="Your exam name" />
      </label>
      <label>
        Exam date
        <input name="date" type="date" required />
      </label>
      <button className="primary">Add exam</button>
    </form>
  );
}
function PlaylistForm({ onSave }: { onSave: () => void }) {
  return (
    <form
      className="panel inlineform"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const url = String(f.get("url"));
        if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
          alert("Enter a YouTube URL.");
          return;
        }
        await db.playlists.add({
          title: String(f.get("title")),
          url,
          completed: false,
        });
        e.currentTarget.reset();
        onSave();
      }}
    >
      <label>
        Playlist name
        <input name="title" required placeholder="Your playlist name" />
      </label>
      <label>
        YouTube playlist URL
        <input
          name="url"
          type="url"
          required
          placeholder="https://www.youtube.com/playlist?list=..."
        />
      </label>
      <button className="primary">Add playlist</button>
    </form>
  );
}
// No automatic database deletion on startup.
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);

function AutoBackupPanel({ onRestored }: { onRestored: () => void }) {
  const [snapshots, setSnapshots] = useState<
    Array<{ id: number; createdAt: string; total: number }>
  >([]);
  const [message, setMessage] = useState("");
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const refreshList = async () => {
    try {
      setSnapshots(await listSnapshots());
      setPersistent(await isStoragePersistent());
      setMessage("");
    } catch (e) {
      setMessage("Backup vault error: " + String(e));
    }
  };
  useEffect(() => {
    void refreshList();
    const timer = setInterval(() => void refreshList(), 30000);
    return () => clearInterval(timer);
  }, []);
  const create = async () => {
    try {
      const saved = await captureSnapshot();
      await refreshList();
      setMessage(
        saved
          ? "Snapshot saved."
          : "No changes to save (or workspace is empty).",
      );
    } catch (e) {
      setMessage("Backup failed: " + String(e));
    }
  };
  const restore = async (id: number) => {
    if (
      !confirm(
        "Restore this automatic snapshot? This REPLACES all current records. Export a JSON backup first.",
      )
    )
      return;
    try {
      await restoreSnapshot(id);
      onRestored();
      await refreshList();
      alert("Snapshot restored. Check your exams and mocks.");
    } catch (e) {
      setMessage("Restore failed: " + String(e));
    }
  };
  return (
    <div className="settingrow" style={{ display: "block" }}>
      <h3>Automatic backup protection</h3>
      <p>
        Changed data is copied to a separate browser backup vault approximately
        every 20 seconds. Up to 15 versions are retained. Empty data never
        replaces a saved snapshot.
      </p>
      <p>
        <strong>Browser storage:</strong>{" "}
        {persistent === null
          ? "Checking…"
          : persistent
            ? "Persistent storage granted"
            : "Best-effort storage (can be cleared by Chrome)"}
      </p>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <button className="secondary" onClick={create}>
          Save snapshot now
        </button>
        <button className="secondary" onClick={() => void refreshList()}>
          Refresh backups
        </button>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const ok = await requestPersistentStorage();
              setPersistent(ok);
              setMessage(
                ok
                  ? "Persistent storage granted."
                  : "Chrome did not grant persistent storage. Keep external JSON backups.",
              );
            } catch (e) {
              setMessage(String(e));
            }
          }}
        >
          Request persistent storage
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {snapshots.length === 0 ? (
        <p>
          No automatic snapshots yet. Save an exam or mock, then choose Save
          snapshot now.
        </p>
      ) : (
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {snapshots.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                padding: "8px 0",
                borderBottom: "1px solid #7774",
              }}
            >
              <span>
                {new Date(s.createdAt).toLocaleString()} · {s.total} records
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button
                  className="secondary"
                  onClick={() =>
                    void downloadSnapshot(s.id).catch((e) =>
                      setMessage(String(e)),
                    )
                  }
                >
                  Download JSON
                </button>
                <button
                  className="secondary"
                  onClick={() => void restore(s.id)}
                >
                  Restore
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>
        Important: Browser snapshots share the same Chrome origin. Clearing site
        data or using another browser profile can erase both databases. Download
        JSON backups regularly and store copies outside Chrome.
      </p>
    </div>
  );
}
