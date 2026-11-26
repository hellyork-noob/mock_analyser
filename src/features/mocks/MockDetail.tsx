import { subjectColor } from "../analytics/subjectColors";
import React, { useEffect } from 'react';
import ModalPortal from '../../components/ModalPortal';
import { X, ExternalLink } from 'lucide-react';
import type { Mock, CustomExamProfile, SectionResult } from '../../data/db';
const percent = (n: number, d: number) => d > 0 ? 100 * n / d : null;
const fmt = (n: number | null, digits = 1) => n === null ? '—' : `${n.toFixed(digits)}%`;
function Arc({ value, color }: {
    value: number | null;
    color: string;
}) {
    const p = Math.max(0, Math.min(100, value ?? 0));
    return <div className="aa-md-arc"><span className="aa-md-arc-fill" aria-hidden="true" style={{ background: `conic-gradient(from 270deg, ${color} 0 ${p * 3.6}deg, var(--border) ${p * 3.6}deg 360deg)` }}/><div className="aa-md-arc-center"><strong>{fmt(value)}</strong></div></div>;
}
export default function MockDetail({ mock, profile, onClose }: {
    mock: Mock;
    profile?: CustomExamProfile;
    onClose: () => void;
}) {
    useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
        onClose(); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [onClose]);
    const attempted = mock.correct + mock.incorrect, total = attempted + mock.unattempted;
    const sections: SectionResult[] = mock.sections?.length ? mock.sections : [{ subject: mock.subject, score: mock.score, maxScore: mock.maxScore, correct: mock.correct, incorrect: mock.incorrect, unattempted: mock.unattempted }];
    const target = profile?.targetScore;
    const eligible = mock.sections?.filter(s => (profile?.sections.find(p => p.name === s.subject)?.sectionType ?? s.sectionType) !== 'qualifying');
    const fallbackTime = eligible?.length && eligible.every(s => typeof s.timeMinutes === 'number' && s.timeMinutes > 0) ? eligible.reduce((sum, s) => sum + (s.timeMinutes ?? 0), 0) : undefined;
    const displayTime = fallbackTime ?? mock.timeMinutes ?? mock.sectionTimeMinutes;
    return <ModalPortal><div className="aa-md-overlay" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}><section className="aa-md-modal" role="dialog" aria-modal="true" aria-labelledby="aa-md-title">
 <div className="aa-md-header"><div><span className="eyebrow">MOCK PERFORMANCE REPORT</span><h2 id="aa-md-title">{mock.title}</h2><p>{mock.date} · {mock.exam} · {mock.subject}</p></div><button className="aa-md-close" onClick={onClose} aria-label="Close mock analysis"><X size={21}/></button></div>
 <div className="aa-md-report-body" tabIndex={0} role="region" aria-label="Performance report details">
 <div className="aa-md-summary"><div><small>Total score</small><strong>{mock.score.toFixed(2)} <em>/ {mock.maxScore}</em></strong></div><div><small>Score percentage</small><strong>{fmt(percent(mock.score, mock.maxScore))}</strong></div><div><small>Accuracy</small><strong>{fmt(percent(mock.correct, attempted))}</strong></div><div><small>Attempt rate</small><strong>{fmt(percent(attempted, total))}</strong></div>{mock.percentile !== undefined && <div><small>Percentile</small><strong>{mock.percentile.toFixed(2)}</strong></div>}{target !== undefined && <div><small>Target score</small><strong>{mock.score >= target ? 'Reached' : 'Below target'}</strong><span>{target} marks</span></div>}</div>
 <div className="aa-md-section-head"><h3>Subject breakdown</h3><span>{sections.length} {sections.length === 1 ? 'section' : 'sections'}</span></div>
 <div className="aa-md-subjects">{sections.map((s, i) => { const attempted = s.correct + s.incorrect; return <article className="aa-md-subject" key={`${s.subject}-${i}`}><h4 style={{ color: subjectColor(s.subject) }}>{s.subject}</h4><Arc value={percent(s.score, s.maxScore)} color={subjectColor(s.subject)}/><strong className="aa-md-marks">{s.score.toFixed(2)} <small>/ {s.maxScore} marks</small></strong><div className="aa-md-counts"><span>Correct <b>{s.correct}</b></span><span>Wrong <b>{s.incorrect}</b></span><span>Skipped <b>{s.unattempted}</b></span></div><div className="aa-md-sub-meta">Accuracy {fmt(percent(s.correct, attempted))}{typeof s.timeMinutes === 'number' && s.timeMinutes > 0 ? ` · ${s.timeMinutes} min · ${(attempted / s.timeMinutes).toFixed(2)} Q/min` : ""}</div></article>; })}</div>
 <div className="aa-md-footer"><div className="aa-md-facts"><span><b>{mock.correct}</b> correct</span><span><b>{mock.incorrect}</b> wrong</span><span><b>{mock.unattempted}</b> skipped</span><span><b>{displayTime && displayTime > 0 ? `${displayTime} min` : '—'}</b> time</span><span><b>{displayTime && displayTime > 0 ? `${(attempted / displayTime).toFixed(2)} Q/min` : '—'}</b> speed</span></div>{mock.url && <a href={mock.url} target="_blank" rel="noreferrer" className="aa-md-link">Open mock <ExternalLink size={15}/></a>}</div>
 <p className="aa-md-note">Fields not recorded in older mocks are shown as unavailable. Score gauges use each section’s maximum marks; negative scores display an empty gauge.</p>
 </div>
 </section></div></ModalPortal>;
}
