import { useId, useMemo, useState } from 'react';
import { BarChart3, RotateCcw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { Mock, CustomExamProfile } from '../../data/types';
import SubjectAnalytics from './SubjectAnalytics';
import PerformanceInsights from './PerformanceInsights';
import { metricRecords, sectionResult, summarizeMetrics } from './metricsModel';
import { subjectColor } from './subjectColors';

const percent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;
const tooltipStyle = { background: 'var(--solid-surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 };

function Gauge({ label, value, caption, color }: { label: string; value: number | null; caption: string; color: string }) {
  return <div className="metrics-gauge">
    <div className="metrics-dial" role="img" aria-label={`${label}: ${value === null ? 'unavailable' : percent(value)}`}>
      <span aria-hidden="true" className="analytics-ring-fill" style={{ background: `conic-gradient(${color} ${Math.max(0, Math.min(100, value ?? 0)) * 3.6}deg, var(--border) 0deg)` }}/>
      <div><strong>{percent(value)}</strong></div>
    </div>
    <strong>{label}</strong><small>{caption}</small>
  </div>;
}

export default function DetailedMetrics({ mocks, exam, profile, onAdd }: {
  mocks: Mock[]; exam: string; profile?: CustomExamProfile; onAdd: () => void;
}) {
  const [mode, setMode] = useState<'Full' | 'Sectional'>('Full');
  const [subject, setSubject] = useState('');
  const [limit, setLimit] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const providers = [...new Set(mocks.map(mock => mock.provider?.trim() || 'Unspecified'))].sort();
  const provider = providerFilter === 'All' || providers.includes(providerFilter) ? providerFilter : 'All';
  const names = useMemo(() => [...new Set([
    ...profile?.sections.map(section => section.name) ?? [],
    ...mocks.flatMap(mock => mock.subject === 'Full Mock' ? mock.sections?.map(section => section.subject) ?? [] : [mock.subject]),
  ])], [mocks, profile]);
  const chosen = names.includes(subject) ? subject : names[0] ?? '';
  const records = useMemo(() => metricRecords(mocks, { mode, subject: chosen, provider, from, to, limit }, profile), [mocks, mode, chosen, provider, from, to, limit, profile]);
  const summary = useMemo(() => summarizeMetrics(records), [records]);
  const invalidDates = Boolean(from && to && from > to);
  const reset = () => { setMode('Full'); setSubject(''); setLimit(0); setFrom(''); setTo(''); setProviderFilter('All'); };
  const scope = `${exam} · ${provider === 'All' ? 'All providers' : provider} · ${mode === 'Full' ? 'Full mocks' : chosen || 'Choose a subject'}`;

  return <section id="detailed-performance-metrics" className="analytics-detail metrics-workspace metrics-single-page" aria-label="Performance metrics">
    <div className="metrics-body">
      <div className="metrics-filter-bar" data-mode={mode}>
        <label>Test type<select aria-label="Metrics test type" value={mode} onChange={event => setMode(event.target.value as 'Full' | 'Sectional')}><option value="Full">Full mocks</option><option value="Sectional">Subject records</option></select></label>
        {mode === 'Sectional' && <label>Subject<select aria-label="Metrics subject" value={chosen} onChange={event => setSubject(event.target.value)}>{!names.length && <option value="">No subjects recorded</option>}{names.map(name => <option key={name}>{name}</option>)}</select></label>}
        <label className="metrics-provider">Provider<select aria-label="Detailed metrics provider" value={provider} onChange={event => setProviderFilter(event.target.value)}><option value="All">All providers</option>{providers.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="metrics-window">Records<select aria-label="Metrics record window" value={limit} onChange={event => setLimit(Number(event.target.value))}><option value={0}>All matching records</option>{[5, 10, 20, 50].map(value => <option key={value} value={value}>Latest {value}</option>)}</select></label>
        <label>From<input aria-label="Metrics start date" type="date" value={from} onChange={event => setFrom(event.target.value)}/></label>
        <label>To<input aria-label="Metrics end date" type="date" value={to} onChange={event => setTo(event.target.value)}/></label>
        <button type="button" className="secondary" onClick={reset}><RotateCcw size={14}/> Reset filters</button>
      </div>
      <div className="metrics-scope" role="status"><span>{scope}</span><strong>{records.length} matching record{records.length === 1 ? '' : 's'}{limit > 0 ? ` · latest ${limit}` : ''}</strong></div>
      {invalidDates && <p className="error" role="alert">The start date must be on or before the end date.</p>}
      <div className="metrics-content">
        {!records.length ? <div className="panel metrics-empty"><BarChart3 size={28}/><h3>No matching results</h3><p>Adjust the provider, test type, date range, or record window to explore your saved mocks.</p><div><button className="secondary" type="button" onClick={reset}>Reset filters</button><button className="primary" type="button" onClick={onAdd}>Add a mock</button></div></div> : <>
          <>
            <div className="metrics-kpis">
              <article className="panel"><small>Records analyzed</small><strong>{summary.count}</strong><span>{records[0]?.date} to {summary.latest?.date}</span></article>
              <article className="panel"><small>Average score</small><strong>{summary.averageMarks === null ? '—' : summary.averageMarks.toFixed(1)}<em>{summary.averageMaximum === null ? '' : ` / ${summary.averageMaximum.toFixed(1)}`}</em></strong><span>{percent(summary.scoreRate)} average normalized score</span></article>
              <article className="panel"><small>Average attempts</small><strong>{summary.averageAttempts?.toFixed(1) ?? '—'}<em>{summary.averageQuestions === null ? '' : ` / ${summary.averageQuestions.toFixed(1)}`}</em></strong><span>{mode === 'Full' ? 'Scored sections; qualifying questions excluded' : chosen}</span></article>
              <article className="panel"><small>Recorded pace</small><strong>{summary.speed?.toFixed(2) ?? '—'}<em> Q/min</em></strong><span>{summary.timedCount} timed record{summary.timedCount === 1 ? '' : 's'}; missing times excluded</span></article>
            </div>
            <article className="panel"><div className="panelhead"><div><h3>Performance at a glance</h3><p>{mode === 'Full' ? 'Answer counts exclude qualifying sections. Missing denominators remain unavailable.' : 'Subject counts and recorded section times only.'}</p></div></div><div className="metrics-gauges"><Gauge label="Score rate" value={summary.scoreRate} color="var(--accent)" caption="Mean score as a percentage of maximum"/><Gauge label="Accuracy" value={summary.accuracy} color="var(--success)" caption="Total correct / total attempted"/><Gauge label="Attempt rate" value={summary.attemptRate} color="var(--cyan)" caption="Total attempted / total questions"/></div></article>
          </>
          <SubjectAnalytics key={`${mode}:${chosen}`} mocks={records} profile={profile} mode={mode} subject={chosen}/>
          <TimingMetrics records={records} names={mode === 'Full' ? names : [chosen]}/>
          <PerformanceInsights mocks={records} exam={exam} profile={mode === 'Full' ? profile : undefined}/>
        </>}
      </div>
    </div>
  </section>;
}

function TimingMetrics({ records, names }: { records: Mock[]; names: string[] }) {
  const chartId = useId().replace(/:/g, "");
  const points = records.filter(mock => typeof mock.percentile === 'number' && Number.isFinite(mock.percentile) && mock.percentile >= 0 && mock.percentile <= 100 && mock.maxScore > 0).map((mock, index) => ({ label: `#${index + 1}`, name: mock.title, date: mock.date, percentile: mock.percentile!, score: mock.score / mock.maxScore * 100 }));
  const average = points.length ? points.reduce((sum, point) => sum + point.percentile, 0) / points.length : null;
  return <>
    <article className="panel"><div className="panelhead"><div><h3>Percentile vs score</h3><p>Only percentiles recorded for the selected test type are included.</p></div><span className="pill">{points.length} recorded · {average === null ? '—' : `${average.toFixed(1)} average`}</span></div>
      {points.length ? <ResponsiveContainer width="100%" height={280}><AreaChart data={points} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}><defs>{["percentile", "score"].map((key, i) => <linearGradient key={key} id={`${chartId}-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={i ? "var(--accent)" : "var(--warning)"} stopOpacity={0.22}/><stop offset="100%" stopColor={i ? "var(--accent)" : "var(--warning)"} stopOpacity={0.01}/></linearGradient>)}</defs><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }}/><YAxis domain={[Math.min(0, ...points.map(point => point.score)), Math.max(100, ...points.map(point => point.score))]} tick={{ fill: 'var(--muted)', fontSize: 12 }}/><Tooltip contentStyle={tooltipStyle} labelFormatter={(_label, payload) => payload?.[0]?.payload ? `${payload[0].payload.name} | ${payload[0].payload.date}` : ''} formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}/><Legend/><Area isAnimationActive={false} dataKey="percentile" name="Percentile" stroke="var(--warning)" fill={`url(#${chartId}-percentile)`} strokeWidth={3} activeDot={{ r: 6, stroke: "var(--solid-surface)", strokeWidth: 3 }}/><Area isAnimationActive={false} dataKey="score" name="Score %" stroke="var(--accent)" fill={`url(#${chartId}-score)`} strokeWidth={3} activeDot={{ r: 6, stroke: "var(--solid-surface)", strokeWidth: 3 }}/></AreaChart></ResponsiveContainer> : <div className="empty">No percentiles recorded for this selection. Full-mock percentiles are not copied to subject records.</div>}
    </article>
    <article className="panel"><div className="panelhead"><div><h3>Subject-wise speed</h3><p>Weighted questions per minute from recorded subject times.</p></div></div><div className="tablewrap"><table className="metrics-speed-table"><thead><tr><th>Subject</th><th>Entries</th><th>Timed entries</th><th>Weighted speed</th><th>Average marks</th></tr></thead><tbody>{names.map(name => {
      const entries = records.flatMap(mock => { const section = sectionResult(mock, name); return section ? [section] : []; });
      const timed = entries.filter(section => section.timeMinutes !== undefined && Number.isFinite(section.timeMinutes) && section.timeMinutes > 0);
      const minutes = timed.reduce((sum, section) => sum + section.timeMinutes!, 0);
      return <tr key={name}><th scope="row" style={{ color: subjectColor(name) }}>{name}</th><td>{entries.length}</td><td>{timed.length}</td><td>{minutes > 0 ? `${(timed.reduce((sum, section) => sum + section.correct + section.incorrect, 0) / minutes).toFixed(2)} Q/min` : '—'}</td><td>{entries.length ? `${(entries.reduce((sum, section) => sum + section.score, 0) / entries.length).toFixed(1)} / ${(entries.reduce((sum, section) => sum + section.maxScore, 0) / entries.length).toFixed(1)}` : '—'}</td></tr>;
    })}</tbody></table></div></article>
  </>;
}
