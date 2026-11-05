import AnalyticsV22 from "./AnalyticsV22";
import PerformanceInsights from "./PerformanceInsights";
import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { PlusCircle } from "lucide-react";
import type { Mock, Exam, SectionResult, CustomExamProfile } from "./db";
const SUBJECTS: string[] = [];
const palette = ["#8b7cff", "#38bdf8", "#34d399", "#fbbf24"];
const pct = (a: number, b: number) => (b > 0 ? (100 * a) / b : 0);
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const acc = (m: Pick<Mock, "correct" | "incorrect">) =>
  pct(m.correct, m.correct + m.incorrect);
const score = (m: Pick<Mock, "score" | "maxScore">) => pct(m.score, m.maxScore);
const ordered = (records: Mock[]) =>
  [...records].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.id || 0) - (b.id || 0),
  );
function Gauge({
  label,
  value,
  caption,
  color,
}: {
  label: string;
  value: number | null;
  caption: string;
  color: string;
}) {
  const safe = value === null ? 0 : clamp(value);
  return (
    <div className="p3-gauge">
      <div
        className="p3-dial"
        style={{
          background: `conic-gradient(${color} ${safe * 3.6}deg,var(--border) 0deg)`,
        }}
      >
        <div className="p3-dial-core">
          <strong>{value === null ? "—" : `${value.toFixed(1)}%`}</strong>
        </div>
      </div>
      <strong>{label}</strong>
      <small>{caption}</small>
    </div>
  );
}
function collectSubject(m: Mock, subject: string): SectionResult | null {
  const found = m.sections?.find((s) => s.subject === subject);
  if (found) return found;
  if (m.subject === subject)
    return {
      subject,
      score: m.score,
      maxScore: m.maxScore,
      correct: m.correct,
      incorrect: m.incorrect,
      unattempted: m.unattempted,
      timeMinutes: m.sectionTimeMinutes ?? m.timeMinutes,
    };
  return null;
}
export default function AnalyticsPlus({
  mocks,
  exams,
  exam,
  onAdd,
  profile,
}: {
  mocks: Mock[];
  exams: Exam[];
  exam: string;
  onAdd: () => void;
  profile?: CustomExamProfile;
}) {
  void exams;
  const [mode, setMode] = useState<"Full" | "Sectional">("Full");
  const [subject, setSubject] = useState("");
  const [providerFilter, setProviderFilter] = useState("All");
  const examMocks = mocks.filter((m) => m.exam === exam);
  const providerOptions = [
    ...new Set(examMocks.map((m) => m.provider?.trim() || "Unspecified")),
  ].sort((a, b) => a.localeCompare(b));
  const activeProvider =
    providerFilter === "All" || providerOptions.includes(providerFilter)
      ? providerFilter
      : "All";
  const all = examMocks.filter(
    (m) =>
      activeProvider === "All" ||
      (m.provider?.trim() || "Unspecified") === activeProvider,
  );
  const full = all.filter((m) => m.subject === "Full Mock");
  const dynamicSubjects = [
    ...new Set([
      ...SUBJECTS,
      ...(profile?.sections.map((s) => s.name) ?? []),
      ...all.flatMap(
        (m) =>
          m.sections?.map((s) => s.subject) ??
          (m.subject !== "Full Mock" ? [m.subject] : []),
      ),
    ]),
  ];
  const selectedSubject = dynamicSubjects.includes(subject)
    ? subject
    : dynamicSubjects[0];
  const records = ordered(
    mode === "Full"
      ? full
      : all.flatMap((m) => {
          const s = collectSubject(m, selectedSubject);
          return s ? [{ ...m, ...s, subject: selectedSubject }] : [];
        }),
  );
  const attempts = records.reduce((n, m) => n + m.correct + m.incorrect, 0),
    correct = records.reduce((n, m) => n + m.correct, 0),
    totalQ = records.reduce(
      (n, m) => n + m.correct + m.incorrect + m.unattempted,
      0,
    );

  const mainOnlyAttempts = records.map((m) => {
    if (mode !== "Full" || !m.sections?.length) {
      return {
        attempted: m.correct + m.incorrect,
        questions: m.correct + m.incorrect + m.unattempted,
      };
    }

    const mainSections = m.sections.filter((s) => {
      const config = profile?.sections.find((p) => p.name === s.subject);

      return (config?.sectionType ?? s.sectionType) !== "qualifying";
    });

    return {
      attempted: mainSections.reduce(
        (sum, s) => sum + s.correct + s.incorrect,
        0,
      ),
      questions: mainSections.reduce(
        (sum, s) => sum + s.correct + s.incorrect + s.unattempted,
        0,
      ),
    };
  });

  const mainAverageAttempts = mainOnlyAttempts.length
    ? mainOnlyAttempts.reduce((sum, x) => sum + x.attempted, 0) /
      mainOnlyAttempts.length
    : null;

  const mainAverageQuestions = mainOnlyAttempts.length
    ? mainOnlyAttempts.reduce((sum, x) => sum + x.questions, 0) /
      mainOnlyAttempts.length
    : null;

  const mean = records.length
    ? records.reduce((n, m) => n + score(m), 0) / records.length
    : null;
  const averageMarks = records.length
    ? records.reduce((n, m) => n + m.score, 0) / records.length
    : null;
  const averageMaximum = records.length
    ? records.reduce((n, m) => n + m.maxScore, 0) / records.length
    : null;
  const accuracy = attempts ? pct(correct, attempts) : null;
  const attemptRate = totalQ ? pct(attempts, totalQ) : null;
  const percentilePoints = ordered(
    all.filter(
      (m) =>
        typeof m.percentile === "number" &&
        Number.isFinite(m.percentile) &&
        m.percentile >= 0 &&
        m.percentile <= 100,
    ),
  ).map((m, i) => ({
    label: `#${i + 1}`,
    name: m.title,
    date: m.date,
    percentile: m.percentile!,
    score: +score(m).toFixed(1),
  }));
  const avgPercentile = percentilePoints.length
    ? percentilePoints.reduce((sum, p) => sum + p.percentile, 0) /
      percentilePoints.length
    : null;
  const subjects = dynamicSubjects.map((name, i) => {
    const list = all.flatMap((m) => {
      const s = collectSubject(m, name);
      return s ? [s] : [];
    });
    const attempted = list.reduce((n, s) => n + s.correct + s.incorrect, 0);
    const timed = all.flatMap((m) => {
      const s = collectSubject(m, name);
      if (!s) return [];
      const minutes =
        s.timeMinutes ??
        (m.subject === name
          ? (m.sectionTimeMinutes ?? m.timeMinutes)
          : undefined);
      return typeof minutes === "number" &&
        Number.isFinite(minutes) &&
        minutes > 0
        ? [{ attempted: s.correct + s.incorrect, minutes }]
        : [];
    });
    const timeSum = timed.reduce((n, t) => n + t.minutes, 0);
    return {
      name,
      average: list.length
        ? +(list.reduce((n, s) => n + score(s), 0) / list.length).toFixed(1)
        : 0,
      averageMarks: list.length
        ? list.reduce((n, s) => n + s.score, 0) / list.length
        : null,
      averageMax: list.length
        ? list.reduce((n, s) => n + s.maxScore, 0) / list.length
        : null,
      accuracy: attempted
        ? +(
            (100 * list.reduce((n, s) => n + s.correct, 0)) /
            attempted
          ).toFixed(1)
        : 0,
      count: list.length,
      color: palette[i % palette.length],
      timedCount: timed.length,
      speed:
        timeSum > 0
          ? timed.reduce((n, t) => n + t.attempted, 0) / timeSum
          : null,
    };
  });
  const latestMockDate = all.map(m=>m.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1);
  const today = new Date();
  const localDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const lastDay = latestMockDate ? new Date(`${latestMockDate}T00:00:00`).getTime() : NaN;
  const daysSinceLastMock = Number.isFinite(lastDay) ? Math.max(0,Math.floor((localDay-lastDay)/86400000)) : null;
  return (
    <div className="p3-analytics">
      <div className="analyticsbar">
        <div>
          <span className="eyebrow">{exam} · PERFORMANCE INTELLIGENCE</span>
          <h2>Advanced analytics</h2>
        </div>
        <div className="toolbar">
          <label className="v21-analytics-provider">
            Provider{" "}
            <select
              aria-label="Filter analytics by provider"
              value={activeProvider}
              onChange={(e) => {
                setProviderFilter(e.target.value);
              }}
            >
              <option value="All">All providers</option>
              {providerOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <div className="segmented">
            <button
              className={mode === "Full" ? "selected" : ""}
              onClick={() => setMode("Full")}
            >
              Full mocks
            </button>
            <button
              className={mode === "Sectional" ? "selected" : ""}
              onClick={() => setMode("Sectional")}
            >
              Sectional
            </button>
          </div>
          {mode === "Sectional" && (
            <select
              aria-label="Subject filter"
              value={selectedSubject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {dynamicSubjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          <button className="primary" onClick={onAdd}>
            <PlusCircle size={16} /> Add mock
          </button>
        </div>
      </div>
      <div className="stats">
        <div className="metric">
          <div className="eyebrow">Mocks analyzed</div>
          <div className="metricvalue">{records.length}</div>
          <small>Selected exam and category</small>
        </div>
        <div className="metric">
          <div className="eyebrow">Average score</div>
          <div className="metricvalue v21-metric-fraction">
            {averageMarks === null || averageMaximum === null ? (
              "—"
            ) : (
              <>
                {averageMarks.toFixed(1)}
                <span> / {averageMaximum.toFixed(1)}</span>
              </>
            )}
          </div>
          <small>Average marks earned / available</small>
        </div>
        <div className="metric">
          <div className="eyebrow">Average attempts</div>
          <div className="metricvalue v21-metric-fraction">
            {mainAverageAttempts === null || mainAverageQuestions === null ? (
              "—"
            ) : (
              <>
                {mainAverageAttempts.toFixed(1)}
                <span> / {mainAverageQuestions.toFixed(1)}</span>
              </>
            )}
          </div>
          <small>Questions attempted per mock</small>
        </div>
        <div className="metric">
          <div className="eyebrow">Days since last mock</div>
          <div className="metricvalue">
            {daysSinceLastMock ?? "—"}
          </div>
          <small>{latestMockDate ? `Last attempt: ${latestMockDate}` : "No mocks recorded"}</small>
        </div>
      </div>
      <div className="panel p3-gauges">
        <div className="panelhead">
          <div>
            <h3>Performance indicators</h3>
            <p>Calculated from saved attempts; unavailable values show —</p>
          </div>
        </div>
        <div className="p3-gauge-grid">
          <Gauge
            label="Score rate"
            value={mean}
            caption="Average score as % of maximum"
            color="#8b7cff"
          />
          <Gauge
            label="Accuracy"
            value={accuracy}
            caption="Correct out of attempted"
            color="#34d399"
          />
          <Gauge
            label="Attempt rate"
            value={attemptRate}
            caption="Attempted out of total questions"
            color="#38bdf8"
          />
        </div>
      </div>
      <AnalyticsV22 mocks={all} profile={profile} mode={mode} subject={selectedSubject ?? ""} />
      <div className="panel v21-percentile-panel">
        <div className="panelhead">
          <div>
            <h3>Percentile vs score</h3>
            <p>
              Only saved percentile values are plotted · all mock types for the
              selected provider
            </p>
          </div>
          <span className="muted">
            {percentilePoints.length} records · Average percentile{" "}
            {avgPercentile === null ? "—" : avgPercentile.toFixed(2)}
          </span>
        </div>
        {percentilePoints.length ? (
          <ResponsiveContainer width="100%" height={245}>
            <AreaChart data={percentilePoints}>
              <CartesianGrid
                stroke="var(--border)"
                strokeDasharray="3 5"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#172035",
                  border: "1px solid #33415b",
                  borderRadius: 10,
                  color: "#fff",
                }}
                labelFormatter={(_label, payload) =>
                  payload?.[0]?.payload?.name || String(_label)
                }
                formatter={(v, name) => [`${v}%`, name]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="percentile"
                name="Percentile"
                stroke="#fbbf24"
                fill="#fbbf2417"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="score"
                name="Score %"
                stroke="#8b7cff"
                fill="none"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">
            No percentile records for this provider. Add a percentile to a mock
            to see this chart.
          </div>
        )}
      </div>
      <div className="panel v21-subject-speed">
        <div className="panelhead">
          <div>
            <h3>Subject-wise speed</h3>
            <p>
              Uses recorded section times from full mocks and timed sectional
              mocks
            </p>
          </div>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Timed entries</th>
                <th>Weighted speed</th>
                <th>Average marks</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.name}>
                  <td>
                    <strong style={{ color: s.color }}>{s.name}</strong>
                  </td>
                  <td>{s.timedCount}</td>
                  <td>
                    {s.speed === null ? "—" : `${s.speed.toFixed(2)} Q/min`}
                  </td>
                  <td>
                    {s.averageMarks === null || s.averageMax === null
                      ? "—"
                      : `${s.averageMarks.toFixed(1)} / ${s.averageMax.toFixed(1)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!subjects.length && (
          <div className="empty">No subject records yet.</div>
        )}
      </div>
      <PerformanceInsights mocks={all} exam={exam} />
      <div className="notice">
        Scores are normalized by each mock’s maximum marks. Exam/tier filtering
        uses the saved exam identifier exactly, keeping different tiers
        separate.
      </div>
    </div>
  );
}
