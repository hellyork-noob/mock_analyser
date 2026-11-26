import { subjectColor } from "./subjectColors";
import { useId, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, } from "recharts";
import type { Mock, CustomExamProfile, SectionResult } from "../../data/db";
const percentage = (a: number, b: number) => (b > 0 ? (100 * a) / b : 0);
const ordered = (items: Mock[]) => [...items].sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0));
function sectionFor(m: Mock, name: string): SectionResult | null {
    const s = m.sections?.find((x) => x.subject === name);
    if (s)
        return s;
    return m.subject === name
        ? {
            subject: name,
            correct: m.correct,
            incorrect: m.incorrect,
            unattempted: m.unattempted,
            score: m.score,
            maxScore: m.maxScore,
        }
        : null;
}
export default function SubjectAnalytics({ mocks, profile, mode, subject, view = "all", }: {
    mocks: Mock[];
    profile?: CustomExamProfile;
    mode: "Full" | "Sectional";
    subject: string;
    view?: "all" | "subjects" | "trends" | "breakdown";
}) {
    const chartId = useId().replace(/:/g, "");
    const [focus, setFocus] = useState("Overall");
    const [showData, setShowData] = useState(false);
    const names = [
        ...new Set([
            ...(profile?.sections.map((s) => s.name) ?? []),
            ...mocks.flatMap((m) => m.sections?.map((s) => s.subject) ??
                (m.subject === "Full Mock" ? [] : [m.subject])),
        ]),
    ].filter(name => mode === 'Full' || name === subject);
    const subjectStats = names.map((name, i) => {
        const entries = mocks.flatMap((m) => {
            const s = sectionFor(m, name);
            return s ? [s] : [];
        });
        const avg = entries.length
            ? entries.reduce((n, s) => n + percentage(s.score, s.maxScore), 0) /
                entries.length
            : 0;
        const marks = entries.length
            ? entries.reduce((n, s) => n + s.score, 0) / entries.length
            : 0;
        const max = entries.length
            ? entries.reduce((n, s) => n + s.maxScore, 0) / entries.length
            : 0;
        return {
            name,
            qualifying: (profile?.sections.find(section => section.name === name)?.sectionType ?? entries[0]?.sectionType) === "qualifying",
            color: subjectColor(name),
            count: entries.length,
            avg,
            marks,
            max,
        };
    });
    // Compare scored subjects across full mocks.
    // Qualifying sections are excluded from TOTAL.
    const fullMocks = ordered(mocks.filter((m) => m.subject === "Full Mock"));
    const scoredNames = names.filter((name) => {
        const config = profile?.sections.find((x) => x.name === name);
        return (config?.sectionType ?? mocks.flatMap(mock => mock.sections ?? []).find(section => section.subject === name)?.sectionType) !== "qualifying";
    });
    type BreakdownStat = {
        attempt: number;
        correct: number;
        marks: number;
        accuracy: number | null;
        count: number;
    };
    const breakdown = (items: Mock[], name?: string): BreakdownStat => {
        let attempt = 0, correct = 0, marks = 0, count = 0;
        for (const mock of items) {
            if (name) {
                const section = sectionFor(mock, name);
                if (!section)
                    continue;
                attempt += section.correct + section.incorrect;
                correct += section.correct;
                marks += section.score;
                count++;
            }
            else {
                const sections = scoredNames
                    .map((n) => sectionFor(mock, n))
                    .filter((s): s is SectionResult => s !== null);
                if (!sections.length)
                    continue;
                attempt += sections.reduce((n, s) => n + s.correct + s.incorrect, 0);
                correct += sections.reduce((n, s) => n + s.correct, 0);
                marks += sections.reduce((n, s) => n + s.score, 0);
                count++;
            }
        }
        return {
            attempt: count ? attempt / count : 0,
            correct,
            marks: count ? marks / count : 0,
            accuracy: attempt ? (100 * correct) / attempt : null,
            count,
        };
    };
    const periods = [
        { label: "Overall Average", items: fullMocks },
        { label: "Last 3 Average", items: fullMocks.slice(-3) },
        { label: "Last 10 Average", items: fullMocks.slice(-10) },
    ];
    const fmtAttempt = (v: BreakdownStat) => v.count ? v.attempt.toFixed(1).replace(/\.0$/, "") : "—";
    const fmtMarks = (v: BreakdownStat) => v.count ? v.marks.toFixed(1).replace(/\.0$/, "") : "—";
    const fmtAccuracy = (v: BreakdownStat) => v.accuracy === null ? "—" : `${v.accuracy.toFixed(1).replace(/\.0$/, "")}%`;
    const chosen = focus === "Overall" ? "Overall" : names.includes(focus) ? focus : "Overall";
    const base = ordered(mode === "Full"
        ? mocks.filter((m) => m.subject === "Full Mock")
        : mocks.flatMap((m) => {
            const s = sectionFor(m, subject);
            return s ? [{ ...m, ...s }] : [];
        }));
    const trend = chosen === "Overall"
        ? base
        : ordered(mocks.flatMap((m) => {
            const s = sectionFor(m, chosen);
            return s ? [{ ...m, ...s }] : [];
        }));
    const points = trend.map((m, i) => ({
        label: `#${i + 1}`,
        name: m.title,
        date: m.date,
        score: m.score,
        accuracy: m.correct + m.incorrect > 0 ? percentage(m.correct, m.correct + m.incorrect) : null,
        scorePct: percentage(m.score, m.maxScore),
        maxScore: m.maxScore,
    }));
    const showTrendDots = points.length <= 40;
    const scoreAxisMax = Math.max(1, ...points.map((p) => p.maxScore));
    const scoreAxisMin = Math.min(0, ...points.map(point => point.score));
    const accuracyPoints = points.filter(point => point.accuracy !== null);
    const averageAccuracy = accuracyPoints.length ? accuracyPoints.reduce((sum, point) => sum + point.accuracy!, 0) / accuracyPoints.length : null;
    // Consistency = 100 - population standard deviation
    // of recent score percentages, clipped to 0..100.
    const rolling = points.map((p, i) => {
        const window = points
            .slice(Math.max(0, i - 5), i + 1)
            .map((x) => x.scorePct);
        const mean = window.reduce((n, x) => n + x, 0) / window.length;
        const deviation = Math.sqrt(window.reduce((n, x) => n + (x - mean) ** 2, 0) / window.length);
        return {
            ...p,
            consistency: window.length < 2 ? null : Math.max(0, 100 - deviation),
            deviation,
        };
    });
    const latest = rolling.at(-1);
    const index = latest?.consistency ?? null;
    return (<div className="v22-new-analytics">
{(view === 'all' || view === 'subjects') && (      <section className="v22-panel">
        <div className="v22-panel-heading">
          <div>
            <h3>Subject average performance</h3>
            <p>
              Average percentage score achieved in each subject across your
              attempted mocks
            </p>
          </div>
          <span className="v22-count">{subjectStats.length} Subjects</span>
        </div>

        <div className="v22-subject-grid">
          {subjectStats.map((s) => (<article className="v22-subject-card" key={s.name}>
              <div className="v22-subject-heading">
                <strong title={s.name}>{s.name}</strong>
                <span className={s.avg >= 75
                ? "v22-strong"
                : s.avg >= 50
                    ? "v22-average"
                    : "v22-weak"}>
                  {!s.count
                ? "No data"
                : s.avg >= 75
                    ? "Strong"
                    : s.avg >= 50
                        ? "Average"
                        : "Needs work"}
                </span>
              </div>

              {s.qualifying && <small className="metrics-qualifying">Qualifying section</small>}
              <div className="v22-ring">
                <span aria-hidden="true" className="analytics-ring-fill" style={{
                  background: `conic-gradient(${s.color} ${Math.max(0, Math.min(100, s.avg)) * 3.6}deg, var(--border) 0deg)`,
                }}/>
                <div className="v22-ring-center">
                  <b style={{ color: s.color }}>
                    {s.count ? `${s.avg.toFixed(0)}%` : "—"}
                  </b>
                  <small>Avg Score %</small>
                </div>
              </div>

              <div className="v22-subject-foot">
                <span>
                  ♙ Avg:{" "}
                  <b>
                    {s.count
                ? `${s.marks.toFixed(1)} / ${s.max.toFixed(1)}`
                : "—"}
                  </b>
                </span>
                <span>
                  # Mocks: <b>{s.count}</b>
                </span>
              </div>
            </article>))}
        </div>
      </section>)}

{(view === 'all' || view === 'trends') && (      <section className="v22-trends">
        <div className="v22-trends-heading">
          <h3>Performance &amp; Accuracy Analytics</h3>
          {mode === "Full" && names.length > 1 && <label>
            Trend subject:
            <select aria-label="Trend subject" value={chosen} onChange={(e) => setFocus(e.target.value)}>
              <option value="Overall">All scored sections (overall)</option>
              {names.map((n) => (<option key={n} value={n}>
                  {n}
                </option>))}
            </select>
          </label>}
        </div>

        <div className="v22-chart-grid">
          <article className="v22-chart-card">
            <h4>Score trend</h4>
            <p>Net score progress over chronological mock tests</p>
            {points.length ? (<ResponsiveContainer width="100%" height={280}>
                <AreaChart data={points} margin={{ top: 12, right: 12, left: -15, bottom: 5 }}>
                  <defs><linearGradient id={chartId + '-accuracy'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.3}/><stop offset="100%" stopColor="var(--success)" stopOpacity={0.015}/></linearGradient></defs>
                  <defs><linearGradient id={chartId + '-score'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3}/><stop offset="100%" stopColor="var(--accent)" stopOpacity={0.015}/></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }}/>
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} domain={[scoreAxisMin, scoreAxisMax]} allowDataOverflow={false} tickFormatter={(value: number) => Number(value.toFixed(1)).toString()}/>
                  <Tooltip contentStyle={{ background: "var(--solid-surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} labelFormatter={(_v, p) => p?.[0]?.payload?.name ?? ""}/>
                  <Area type="linear" isAnimationActive={false} dataKey="score" name="Score (marks)" stroke="var(--accent)" strokeWidth={3} fill={`url(#${chartId}-score)`} dot={showTrendDots ? { r: 3, strokeWidth: 2, fill: "var(--solid-surface)" } : false} activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--solid-surface)" }}/>
                </AreaChart>
              </ResponsiveContainer>) : (<div className="v22-empty">No mocks recorded</div>)}
          </article>

          <article className="v22-chart-card">
            <div className="v22-chart-title">
              <h4>Accuracy trend</h4>
              <span>
                {averageAccuracy === null
            ? "—"
            : `${averageAccuracy.toFixed(1)}% Avg`}
              </span>
            </div>
            <p>Per-record correct / attempted; average excludes records without attempts</p>
            {accuracyPoints.length ? (<ResponsiveContainer width="100%" height={280}>
                <AreaChart data={points} margin={{ top: 12, right: 12, left: -15, bottom: 5 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }}/>
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: "var(--muted)" }}/>
                  <Tooltip contentStyle={{ background: "var(--solid-surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} formatter={(v) => `${Number(v).toFixed(1)}%`}/>
                  <ReferenceLine y={85} stroke="#10b981" strokeDasharray="5 5" label={{
                value: "85% reference",
                position: "insideTopRight",
                fill: "#10b981",
                fontSize: 10,
            }}/>
                  <Area type="linear" isAnimationActive={false} dataKey="accuracy" name="Accuracy" stroke="var(--success)" strokeWidth={3} fill={`url(#${chartId}-accuracy)`} dot={showTrendDots ? { r: 3, strokeWidth: 2, fill: "var(--solid-surface)" } : false} activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--solid-surface)" }}/>
                </AreaChart>
              </ResponsiveContainer>) : (<div className="v22-empty">No recorded attempts for accuracy</div>)}
          </article>

          <article className="v22-chart-card">
            <div className="v22-chart-title">
              <h4>Consistency index</h4>
              <span>{index === null ? "—" : `${index.toFixed(1)}%`}</span>
            </div>
            <p>Rolling score stability (last six entries)</p>
            {rolling.length >= 2 ? (<ResponsiveContainer width="100%" height={255}>
                <AreaChart data={rolling} margin={{ top: 12, right: 12, left: -15, bottom: 5 }}>
                  <defs><linearGradient id={chartId + '-consistency'} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.3}/><stop offset="100%" stopColor="var(--cyan)" stopOpacity={0.015}/></linearGradient></defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }}/>
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: "var(--muted)" }}/>
                  <Tooltip contentStyle={{ background: "var(--solid-surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} formatter={(v) => v == null ? "—" : `${Number(v).toFixed(1)}%`}/>
                  <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="5 5"/>
                  <Area isAnimationActive={false} dataKey="consistency" name="Consistency" stroke="var(--cyan)" strokeWidth={3} fill={`url(#${chartId}-consistency)`} activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--solid-surface)" }}/>
                </AreaChart>
              </ResponsiveContainer>) : (<div className="v22-empty">At least 2 mocks needed</div>)}

            <div className="v22-consistency-foot">
              <span>
                Score variation (σ):{" "}
                <b>
                  {latest && rolling.length >= 2
            ? `±${latest.deviation.toFixed(1)} pp`
            : "—"}
                </b>
              </span>
              <span>
                Mocks: <b>{Math.min(points.length, 6)}</b>
              </span>
            </div>
          </article>
        </div>



        <div className="metrics-trend-data">
          <button className="secondary" type="button" aria-expanded={showData} aria-controls="metrics-trend-table" onClick={() => setShowData(value => !value)}>{showData ? 'Hide trend data' : 'View trend data'} ({points.length} records)</button>
          {showData && <div id="metrics-trend-table" className="tablewrap"><table aria-label="Performance trend data"><thead><tr><th>Mock</th><th>Date</th><th>Score / max</th><th>Score %</th><th>Accuracy</th><th>Consistency</th></tr></thead><tbody>{rolling.map((point, i) => <tr key={i}><th scope="row">{point.name}</th><td>{point.date}</td><td>{point.score.toFixed(1)} / {point.maxScore}</td><td>{point.scorePct.toFixed(1)}%</td><td>{point.accuracy === null ? 'Not recorded' : point.accuracy.toFixed(1) + '%'}</td><td>{point.consistency === null ? 'Not enough data' : point.consistency.toFixed(1) + '%'}</td></tr>)}</tbody></table></div>}
        </div>
        <p className="v22-method-note">
          Consistency is a descriptive index: 100 minus the population standard
          deviation of recent score percentages, using up to six mocks. The 80%
          and 85% lines are visual references, not official exam targets.
        </p>
      </section>)}
{((view === 'all' && mode === 'Full') || view === 'breakdown') && (        <section className="v22-panel v22-breakdown-panel">
          <div className="v22-panel-heading">
            <div>
              <h3>Sectional average breakdown</h3>
              <p>
                Compare overall subject averages with the latest 3 and latest 10
                full mocks
              </p>
            </div>
          </div>

          <div className="v22-breakdown-scroll">
            <table className="v22-breakdown-table">
              <thead>
                <tr>
                  <th rowSpan={2} scope="col">
                    Subject Section
                  </th>
                  {periods.map((period) => (<th key={period.label} colSpan={3} scope="colgroup">
                      {period.label}<small className="metrics-period-count">{period.items.length} records</small>
                    </th>))}
                </tr>
                <tr>
                  {periods.flatMap((period) => ["Attempt", "Accuracy", "Marks"].map((field) => (<th key={`${period.label}-${field}`} scope="col">
                        {field}
                      </th>)))}
                </tr>
              </thead>
              <tbody>
                {scoredNames.map((name) => (<tr key={name}>
                    <th scope="row" style={{color: subjectColor(name)}}>{name}</th>
                    {periods.flatMap((period) => {
                const v = breakdown(period.items, name);
                return [
                    <td key={`${period.label}-a`}>{fmtAttempt(v)}</td>,
                    <td key={`${period.label}-c`}>{fmtAccuracy(v)}</td>,
                    <td className="v22-breakdown-marks" key={`${period.label}-m`}>
                          {fmtMarks(v)}
                        </td>,
                ];
            })}
                  </tr>))}
                <tr className="v22-breakdown-total">
                  <th scope="row">TOTAL</th>
                  {periods.flatMap((period) => {
            const v = breakdown(period.items);
            return [
                <td key={`${period.label}-a`}>{fmtAttempt(v)}</td>,
                <td key={`${period.label}-c`}>{fmtAccuracy(v)}</td>,
                <td className="v22-breakdown-marks" key={`${period.label}-m`}>
                        {fmtMarks(v)}
                      </td>,
            ];
        })}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="metrics-scroll-hint">Scroll the table horizontally to view every period. The subject column stays visible.</p>
          {!fullMocks.length && (<p className="v22-method-note">
              No full mocks available for this breakdown.
            </p>)}
        </section>)}
    </div>);
}
