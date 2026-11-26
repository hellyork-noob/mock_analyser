import { useEffect, useState, type FormEvent } from 'react';
import { Check, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { countdownBand } from './countdownBands';
import { db, type Exam } from '../../data/db';

function daysUntil(date?: string): number | null {
    if (!date || !/^\d{4,}-\d{2}-\d{2}$/.test(date)) return null;
    const timestamp = Date.parse(date + 'T00:00:00Z');
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().split('T')[0] !== date) return null;
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((timestamp - today) / 86400000);
}

const urgency = (days: number) =>
    days < 0 ? 'past' : days <= 10 ? 'urgent' : days <= 30 ? 'near' : days <= 100 ? 'soon' : 'far';

function ApplicationStatus({ exam, past = false }: { exam: Exam; past?: boolean }) {
    if (exam.appliedAndPaid) return <span className="v21-application-done"><Check size={14} aria-hidden="true"/> Applied &amp; paid</span>;
    if (past) return <span className="v21-countdown-card-category">Past exam</span>;

    const query = encodeURIComponent(`${exam.name} application sarkari result`);
    return <a className="v21-application-link" href={'https://www.google.com/search?q=' + query}
        target="_blank" rel="noopener noreferrer" aria-label={'Search Google to apply for ' + exam.name + ' (opens in a new tab)'}>
        Apply <ExternalLink size={12} aria-hidden="true"/>
    </a>;
}

export function CountdownBoard({ exams, onChange }: { exams: Exam[]; onChange: () => void }) {
    const [, refreshDay] = useState(0);
    useEffect(() => {
        const interval = window.setInterval(() => refreshDay(value => value + 1), 60000);
        return () => window.clearInterval(interval);
    }, []);

    const [showPast, setShowPast] = useState(false);
    const [editing, setEditing] = useState<Exam | null>(null);
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [appliedAndPaid, setAppliedAndPaid] = useState(false);
    const [error, setError] = useState('');

    function edit(exam?: Exam) {
        setEditing(exam ?? null);
        setName(exam?.name ?? '');
        setDate(exam?.date ?? '');
        setAppliedAndPaid(exam?.appliedAndPaid ?? false);
        setError('');
    }

    async function change(write: () => Promise<unknown>) {
        setError('');
        try {
            await write();
            onChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }

    async function save(event: FormEvent) {
        event.preventDefault();
        await change(async () => {
            if (!name.trim()) throw new Error('Enter an exam name.');
            if (date && daysUntil(date) === null) throw new Error('Enter a valid exam date or leave it blank.');
            const details = { name: name.trim(), date: date || undefined, appliedAndPaid };
            if (editing?.id != null) await db.exams.update(editing.id, details);
            else await db.exams.add(details);
            edit();
        });
    }

    function examTools(exam: Exam, past = false) {
        const id = exam.id;
        return <div className="v21-countdown-card-tools">
            {!past && !exam.appliedAndPaid && <label className="v21-countdown-tool v21-application-check"
                title="Mark applied and fees paid">
                <input type="checkbox" checked={false} aria-label={'Mark ' + exam.name + ' as applied and fees paid'}
                    onChange={() => {
                        if (id == null) return;
                        void change(async () => {
                            await db.exams.update(id, { appliedAndPaid: true });
                            if (editing?.id === id) setAppliedAndPaid(true);
                        });
                    }}/>
            </label>}
            <button className="v21-countdown-tool" type="button" title={'Edit ' + exam.name}
                aria-label={'Edit ' + exam.name} onClick={() => edit(exam)}><Pencil aria-hidden="true"/></button>
            <button className="v21-countdown-tool v21-countdown-tool-danger" type="button" title={'Delete ' + exam.name}
                aria-label={'Delete ' + exam.name} onClick={() => {
                    if (id == null || !confirm('Delete this countdown?')) return;
                    void change(async () => {
                        await db.exams.delete(id);
                        if (editing?.id === id) edit();
                    });
                }}><Trash2 aria-hidden="true"/></button>
        </div>;
    }

    const dated: { exam: Exam; days: number }[] = [];
    const pending: { exam: Exam; days: null }[] = [];
    for (const exam of exams) {
        const days = daysUntil(exam.date);
        if (days === null) pending.push({ exam, days });
        else dated.push({ exam, days });
    }
    const upcoming = dated.filter(item => item.days >= 0).sort((a, b) => a.days - b.days);
    const [nearest, ...later] = upcoming;
    const past = showPast ? dated.filter(item => item.days < 0).sort((a, b) => b.days - a.days) : [];
    const remaining = [...later, ...pending, ...past];

    return <section className="v21-countdown">
        <div className="v21-countdown-top">
            <article className="panel v21-next-exam" data-countdown-band={nearest ? countdownBand(nearest.days) : 'pending'}>
                <div className="v21-next-exam-heading">
                    <div className="v21-countdown-eyebrow">NEXT UPCOMING EXAM</div>
                    {nearest && examTools(nearest.exam)}
                </div>
                {nearest ? <>
                    <h2>{nearest.exam.name}</h2>
                    <div className="v21-countdown-date v21-featured-application">
                        <time dateTime={nearest.exam.date}>{nearest.exam.date}</time>
                        <ApplicationStatus exam={nearest.exam}/>
                    </div>
                    <div className="v21-countdown-days">
                        <strong>{nearest.days === 0 ? 'Today' : nearest.days}</strong>
                        <span>{nearest.days === 0 ? 'Exam day' : 'days remaining'}</span>
                    </div>
                    {nearest.days <= 10 && <div className="v21-countdown-alert">Prepare for exam day</div>}
                </> : <>
                    <h2>No exam with an upcoming date</h2>
                    <p>A countdown will start once you add an exam date.</p>
                </>}
            </article>
            <form className="panel v21-countdown-add" onSubmit={save}>
                <div className="v21-countdown-eyebrow">{editing ? 'EDIT COUNTDOWN' : 'ADD NEW EXAM'}</div>
                <label>Exam name<input required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. SSC CGL Tier 1"/></label>
                <label>Exam date (optional)<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
                {editing && <label className="v21-application-edit">
                    <input type="checkbox" checked={appliedAndPaid} onChange={event => setAppliedAndPaid(event.target.checked)}/>
                    Applied and fees paid
                </label>}
                <div className="v21-countdown-actions">
                    <button className="primary" type="submit">{editing ? 'Save changes' : '+ Add exam'}</button>
                    {editing && <button className="secondary" type="button" onClick={() => edit()}>Cancel</button>}
                </div>
                {error && <p className="error" role="alert">{error}</p>}
            </form>
        </div>
        <div className="v21-countdown-list-head">
            <strong>{upcoming.length} upcoming exam{upcoming.length === 1 ? '' : 's'}{pending.length > 0 && ' · ' + pending.length + ' date pending'}</strong>
            <label><input type="checkbox" checked={showPast} onChange={event => setShowPast(event.target.checked)}/> Show past exams</label>
        </div>
        <div className="v21-countdown-grid">{remaining.map(({ exam, days }) => {
            const isPast = days !== null && days < 0;
            return <article key={exam.id} data-countdown-band={days === null ? 'pending' : countdownBand(days)}
                className={'panel v21-countdown-card' + (days === null ? '' : ' v21-urgency-' + urgency(days))}>
                <div className="v21-countdown-card-main">
                    <div className="v21-countdown-card-info">
                        <strong className="v21-countdown-card-name" title={exam.name}>{exam.name}</strong>
                        {days === null ? <span className="v21-countdown-date">Date pending</span> :
                            <time dateTime={exam.date}>{new Date(exam.date + 'T00:00:00').toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric',
                            })}</time>}
                    </div>
                    {days !== null && <div className={'v21-countdown-card-status' + (isPast ? ' is-past' : '')}>
                        {isPast ? <span className="v21-countdown-past-pill">Passed</span> :
                            <><strong>{days === 0 ? 'Today' : days}</strong><small>{days === 0 ? 'Exam day' : 'days left'}</small></>}
                    </div>}
                </div>
                <div className="v21-countdown-card-footer">
                    <ApplicationStatus exam={exam} past={isPast}/>
                    {examTools(exam, isPast)}
                </div>
            </article>;
        })}</div>
        {!remaining.length && <div className="v21-countdown-empty">{nearest ? 'No other exams to display.' : 'No countdowns to display.'}</div>}
    </section>;
}
