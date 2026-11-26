import React, { useEffect, useState } from "react";
import { db, type CustomExamProfile } from "../../data/db";
import { localDateKey } from "../study/studyMath";
import { subjectColor, enteredTimeNote } from "./mockPresentation";
export default function MockForm({ exam, custom, onSave, onDone, }: {
    exam: string;
    custom?: CustomExamProfile;
    onSave: () => void;
    onDone: () => void;
}) {
    const rules = custom?.sections ?? [];
    const [kind, setKind] = useState("Full Mock");
    const [counts, setCounts] = useState<Record<string, {
        correct: number;
        incorrect: number;
    }>>({});
    const [times, setTimes] = useState<Record<string, string>>({});
    const [providers, setProviders] = useState<string[]>(() => {
        try {
            const v = JSON.parse(localStorage.getItem("aa_v21_providers") || "[]");
            return Array.isArray(v)
                ? v.filter((x): x is string => typeof x === "string" && !!x.trim())
                : [];
        }
        catch {
            return [];
        }
    });
    const [provider, setProvider] = useState(() => localStorage.getItem(`aa_last_provider_${exam}`) || "");
    const [manageProviders, setManageProviders] = useState(false);
    const [newProvider, setNewProvider] = useState("");
    useEffect(() => {
        localStorage.setItem("aa_v21_providers", JSON.stringify(providers));
    }, [providers]);
    function addProvider() {
        const name = newProvider.trim();
        if (!name)
            return;
        if (providers.some((p) => p.toLocaleLowerCase() === name.toLocaleLowerCase())) {
            setError("Provider already exists.");
            return;
        }
        setProviders((old) => [...old, name].sort((a, b) => a.localeCompare(b)));
        setProvider(name);
        setNewProvider("");
        setError("");
    }
    function removeProvider(name: string) {
        if (!window.confirm(`Remove ${name} from the provider list? Existing saved mocks will not be changed.`))
            return;
        setProviders((old) => old.filter((p) => p !== name));
        if (provider === name) setProvider("");
        if (localStorage.getItem(`aa_last_provider_${exam}`) === name) localStorage.removeItem(`aa_last_provider_${exam}`);
    }
    function renameProvider(name: string) {
        const next = window
            .prompt("Rename provider (existing mock records will keep their original provider):", name)
            ?.trim();
        if (!next || next === name)
            return;
        if (providers.some((p) => p !== name && p.toLocaleLowerCase() === next.toLocaleLowerCase())) {
            setError("Provider already exists.");
            return;
        }
        setProviders((old) => old
            .map((p) => (p === name ? next : p))
            .sort((a, b) => a.localeCompare(b)));
        if (provider === name)
            setProvider(next);
    }
    const [mockName, setMockName] = useState("");
    const [percentile, setPercentile] = useState("");
    const [date, setDate] = useState(localDateKey());
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
                if (typeof saved.kind === "string" &&
                    (saved.kind === "Full Mock" ||
                        rules.some((r) => r.name === saved.kind)))
                    setKind(saved.kind);
                if (saved.counts && typeof saved.counts === "object")
                    setCounts(saved.counts as Record<string, {
                        correct: number;
                        incorrect: number;
                    }>);
                if (saved.times && typeof saved.times === "object")
                    setTimes(saved.times as Record<string, string>);
                if (typeof saved.provider === "string")
                    setProvider(saved.provider);
                if (typeof saved.mockName === "string")
                    setMockName(saved.mockName);
                if (typeof saved.percentile === "string")
                    setPercentile(saved.percentile);
                if (typeof saved.date === "string")
                    setDate(saved.date);
                if (typeof saved.url === "string")
                    setUrl(saved.url);
            }
        }
        catch (err) {
            console.warn("Could not restore Add Mock draft", err);
        }
        setDraftLoaded(true);
    }, [draftKey]);
    useEffect(() => {
        if (!draftLoaded)
            return;
        try {
            localStorage.setItem(draftKey, JSON.stringify({
                kind,
                counts,
                times,
                provider,
                mockName,
                percentile,
                date,
                url,
            }));
        }
        catch (err) {
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
    const active = kind === "Full Mock" ? rules : rules.filter((r) => r.name === kind);
    const sections = active.map((r) => {
        const c = counts[r.name]?.correct ?? 0, w = counts[r.name]?.incorrect ?? 0;
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
    const totals = sections.reduce((a, r) => ({
        correct: a.correct + r.correct,
        incorrect: a.incorrect + r.incorrect,
        unattempted: a.unattempted + r.unattempted,
        score: a.score + (r.sectionType === "qualifying" ? 0 : r.score),
        maxScore: a.maxScore + (r.sectionType === "qualifying" ? 0 : r.maxScore),
    }), { correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 });
    const timedMainSections = sections.filter((s) => s.sectionType !== "qualifying");
    const enteredTimes = timedMainSections.filter((s) => s.timeMinutes !== undefined);
    const totalTime = enteredTimes.reduce((sum, s) => sum + (s.timeMinutes ?? 0), 0);
    const setCount = (name: string, key: "correct" | "incorrect", value: number) => setCounts((old) => ({
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
        if (sections.some((s) => s.correct < 0 ||
            s.incorrect < 0 ||
            !Number.isInteger(s.correct) ||
            !Number.isInteger(s.incorrect) ||
            s.unattempted < 0)) {
            setError("Correct + Wrong cannot exceed section questions.");
            return;
        }
        if (sections.some((s) => s.timeMinutes !== undefined &&
            (!Number.isFinite(s.timeMinutes) || s.timeMinutes <= 0))) {
            setError("Subject times must be positive.");
            return;
        }
        if (enteredTimes.length !== 0 &&
            enteredTimes.length !== timedMainSections.length) {
            setError("Enter time for every subject, or leave all subject times blank.");
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
            localStorage.setItem(`aa_last_provider_${exam}`, provider.trim());
            localStorage.removeItem(draftKey);
            onSave();
            onDone();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not save mock");
        }
    }
    return (<form className="panel formpanel aa-addmock-editstyle v21-addmock" onSubmit={submit}>
      <div className="v21-form-head">
        <h3>Add mock</h3>
        <div className="segmented">
          <button type="button" className={kind === "Full Mock" ? "selected" : ""} onClick={() => setKind("Full Mock")}>
            Full mock
          </button>
          <button type="button" className={kind !== "Full Mock" ? "selected" : ""} onClick={() => setKind(rules[0]?.name ?? "Full Mock")}>
            Sectional
          </button>
        </div>
      </div>
      <div className="v21-fields">
        <label>
          Provider
          <div className="v21-provider-control">
            <select aria-label="Mock provider" required value={provider} onChange={(e) => {
            if (e.target.value === "__manage__") {
                setManageProviders(true);
            }
            else
                setProvider(e.target.value);
        }}>
              <option value="">Select provider</option>
              {[...new Set([...providers, ...(provider ? [provider] : [])])].map((p) => (<option key={p} value={p}>
                  {p}
                </option>))}
              <option value="__manage__">Add / manage providers</option>
            </select>
            <button type="button" className="v21-manage-btn" onClick={() => setManageProviders((x) => !x)} title="Add or remove providers">
              Manage
            </button>
          </div>
        </label>
        <label>
          Mock name / number
          <input aria-label="Mock name" required value={mockName} onChange={(e) => setMockName(e.target.value)} placeholder="e.g. Live 1"/>
        </label>
        <label>
          Test date
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
        </label>
        <label>
          Percentile (optional)
          <input type="number" min="0" max="100" step="0.01" value={percentile} onChange={(e) => setPercentile(e.target.value)} placeholder="e.g. 94.65"/>
        </label>
        <label className="v21-url">
          Mock link
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."/>
        </label>
        {kind !== "Full Mock" && (<label>
            Subject
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {rules.map((r) => (<option key={r.name}>{r.name}</option>))}
            </select>
          </label>)}
      </div>
      {manageProviders && (<div className="v21-provider-manager">
          <div className="v21-provider-add">
            <input aria-label="New provider name" placeholder="New provider name" value={newProvider} onChange={(e) => setNewProvider(e.target.value)} onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    addProvider();
                }
            }}/>
            <button type="button" className="secondary" onClick={addProvider}>
              + Add
            </button>
            <button type="button" className="ghost" onClick={() => setManageProviders(false)} aria-label="Close provider manager">
              ×
            </button>
          </div>
          <div className="v21-provider-list">
            {providers.map((p) => (<span key={p} className="v21-provider-chip">
                {p}
                <button type="button" onClick={() => renameProvider(p)} title={`Rename ${p}`}>
                  ✎
                </button>
                <button type="button" onClick={() => removeProvider(p)} title={`Remove ${p}`}>
                  ×
                </button>
              </span>))}
          </div>
          <small>
            Removing or renaming a provider here does not change saved mock
            records.
          </small>
        </div>)}
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
            return (<div className="v21-row" key={s.subject}>
              <strong className="v21-subject" style={{ color: subjectColor(s.subject) }}>
                {s.subject}
                <small>
                  {rule?.questions} questions ·{" "}
                  {s.sectionType === "qualifying" ? "Qualifying" : "Main"}
                </small>
              </strong>
              <input aria-label={`${s.subject} correct`} type="number" min="0" step="1" max={(rule?.questions ?? 0) - s.incorrect} value={s.correct} onChange={(e) => setCount(s.subject, "correct", Number(e.target.value))}/>
              <input aria-label={`${s.subject} wrong`} type="number" min="0" step="1" max={(rule?.questions ?? 0) - s.correct} value={s.incorrect} onChange={(e) => setCount(s.subject, "incorrect", Number(e.target.value))}/>
              <input aria-label={`${s.subject} time in minutes`} type="number" min="0.1" step="0.1" placeholder="—" value={times[s.subject] ?? ""} onChange={(e) => setTimes((old) => ({ ...old, [s.subject]: e.target.value }))}/>
              <div className="v21-score">
                <strong>{s.score.toFixed(2)}</strong>
                <small>/ {s.maxScore}</small>
              </div>
            </div>);
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
      {error && (<p className="error" role="alert">
          {error}
        </p>)}
    </form>);
}
