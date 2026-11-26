import ModalPortal from "../../components/ModalPortal";
import React, { useState } from "react";
import { X } from "lucide-react";
import { db, type Mock, type SectionResult, type CustomExamProfile } from "../../data/db";
import { subjectColor, enteredTimeNote } from "./mockPresentation";
export default function EditMockDialog({ mock, custom, onClose, onSaved, }: {
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
    const [editName, setEditName] = useState(mock.mockName ??
        (mock.provider && mock.title.startsWith(mock.provider + " ")
            ? mock.title.slice(mock.provider.length + 1)
            : mock.title));
    const [editPercentile, setEditPercentile] = useState(mock.percentile === undefined ? "" : String(mock.percentile));
    const [editTimes, setEditTimes] = useState<Record<string, string>>(() => Object.fromEntries((mock.sections ?? []).map((s) => [
        s.subject,
        s.timeMinutes === undefined ? "" : String(s.timeMinutes),
    ])));
    const isFull = draft.subject === "Full Mock";
    const hasSections = isFull && !!draft.sections?.length;
    const storedSections = hasSections ? draft.sections! : [];
    const ruleFor = (name: string) => configuredRules?.find((s) => s.name === name);
    // Only automatically rescore records whose stored maximum marks and question totals
    // agree with the current rules. Older/changed configurations retain their saved scoring.
    const compatible = (s: SectionResult) => {
        const rule = ruleFor(s.subject);
        return (!!rule &&
            Math.abs(s.maxScore - rule.maxMarks) < 0.001 &&
            s.correct + s.incorrect + s.unattempted === rule.questions);
    };
    const sectionAuto = storedSections.length > 0 &&
        storedSections.every(compatible) &&
        storedSections.every((s) => !(s.sectionType === undefined &&
            ruleFor(s.subject)?.sectionType === "qualifying"));
    const singleAuto = !hasSections &&
        !!ruleFor(draft.subject) &&
        Math.abs(draft.maxScore - ruleFor(draft.subject)!.maxMarks) < 0.001 &&
        draft.correct + draft.incorrect + draft.unattempted ===
            ruleFor(draft.subject)!.questions;
    const update = (key: keyof Mock, value: string | number) => setDraft((old) => ({ ...old, [key]: value }));
    const recalc = (s: SectionResult, correct: number, incorrect: number, automatic: boolean): SectionResult => {
        const rule = ruleFor(s.subject);
        if (automatic && rule)
            return {
                ...s,
                correct,
                incorrect,
                unattempted: rule.questions - correct - incorrect,
                score: Number((correct * rule.positive - incorrect * rule.negative).toFixed(2)),
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
    const updateSection = (index: number, key: "correct" | "incorrect", value: number) => setDraft((old) => ({
        ...old,
        sections: old.sections?.map((s, i) => i === index
            ? recalc(s, key === "correct" ? value : s.correct, key === "incorrect" ? value : s.incorrect, sectionAuto)
            : s),
    }));
    const updateSingle = (key: "correct" | "incorrect", value: number) => setDraft((old) => {
        const next = recalc({
            subject: old.subject,
            correct: old.correct,
            incorrect: old.incorrect,
            unattempted: old.unattempted,
            score: old.score,
            maxScore: old.maxScore,
        }, key === "correct" ? value : old.correct, key === "incorrect" ? value : old.incorrect, singleAuto);
        return { ...old, ...next };
    });
    const totals = hasSections
        ? storedSections.reduce((a, s) => ({
            correct: a.correct + s.correct,
            incorrect: a.incorrect + s.incorrect,
            unattempted: a.unattempted + s.unattempted,
            score: a.score +
                ((s.sectionType ?? ruleFor(s.subject)?.sectionType) === "qualifying"
                    ? 0
                    : s.score),
            maxScore: a.maxScore +
                ((s.sectionType ?? ruleFor(s.subject)?.sectionType) === "qualifying"
                    ? 0
                    : s.maxScore),
        }), { correct: 0, incorrect: 0, unattempted: 0, score: 0, maxScore: 0 })
        : {
            correct: draft.correct,
            incorrect: draft.incorrect,
            unattempted: draft.unattempted,
            score: draft.score,
            maxScore: draft.maxScore,
        };
    const auto = hasSections ? sectionAuto : singleAuto;
    const numberInput = (label: string, value: number, onChange: (n: number) => void, max: number) => (<label className="p4g-number">
      {label}
      <input type="number" min="0" max={Math.max(0, max)} step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} required/>
    </label>);
    async function save(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        const provider = editProvider.trim(), name = editName.trim();
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
        if (changedSections?.some((s) => s.timeMinutes !== undefined &&
            (!Number.isFinite(s.timeMinutes) || s.timeMinutes <= 0))) {
            setError("Subject times must be positive.");
            return;
        }
        const timedMainSections = changedSections?.filter((s) => (ruleFor(s.subject)?.sectionType ?? s.sectionType) !== "qualifying") ?? [];
        const entered = timedMainSections.filter((s) => s.timeMinutes !== undefined);
        if (entered.length && entered.length !== timedMainSections.length) {
            setError("Enter time for every subject or leave all blank.");
            return;
        }
        const sectionTotal = entered.length
            ? Number(entered.reduce((sum, s) => sum + (s.timeMinutes ?? 0), 0).toFixed(2))
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
        if (rows.some((s) => ![s.correct, s.incorrect, s.unattempted].every((n) => Number.isInteger(n) && n >= 0))) {
            setError("Correct and Wrong must be whole numbers and cannot exceed available questions.");
            return;
        }
        if (rows.some((s) => !Number.isFinite(s.score) ||
            !Number.isFinite(s.maxScore) ||
            s.maxScore <= 0 ||
            s.score > s.maxScore)) {
            setError("Check scores and maximum marks.");
            return;
        }
        if (record.timeMinutes !== undefined &&
            (!Number.isFinite(record.timeMinutes) || record.timeMinutes <= 0)) {
            setError("Time must be positive.");
            return;
        }
        if (!auto &&
            rows.some((s) => s.correct + s.incorrect + s.unattempted < 1)) {
            setError("Invalid question totals.");
            return;
        }
        try {
            if (mock.id === undefined)
                throw new Error("Mock has no record ID");
            const { id: _, ...changes } = record;
            const updated = await db.mocks.update(mock.id, changes);
            if (!updated)
                throw new Error("The original mock record was not found.");
            onSaved();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not update mock");
        }
    }
    return (<ModalPortal><div className="p4-backdrop" onMouseDown={(e) => {
            if (e.target === e.currentTarget)
                onClose();
        }}>
      <div className="p4-dialog panel p4g-dialog" role="dialog" aria-modal="true" aria-labelledby="p4-edit-title">
        <div className="between">
          <div>
            <h3 id="p4-edit-title">Edit mock</h3>
            <p>Update the existing record without creating a duplicate.</p>
          </div>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close editor">
            <X size={19}/>
          </button>
        </div>
        <form onSubmit={save}>
          <div className="formgrid compactform">
            <label>
              Provider
              <input value={editProvider} onChange={(e) => setEditProvider(e.target.value)} placeholder="Optional for legacy mocks"/>
            </label>
            <label>
              Mock name / number
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required/>
            </label>
            <label>
              Percentile
              <input type="number" min="0" max="100" step="0.01" value={editPercentile} onChange={(e) => setEditPercentile(e.target.value)} placeholder="Optional"/>
            </label>
            <label>
              Exam
              <input readOnly value={draft.exam}/>
            </label>
            <label>
              Date
              <input type="date" value={draft.date} onChange={(e) => update("date", e.target.value)} required/>
            </label>
            {!isFull && (<label>
                Subject
                <input readOnly value={draft.subject}/>
              </label>)}
            <label>
              Time (minutes){hasSections && enteredTimeNote()}
              <input disabled={hasSections && Object.values(editTimes).some(Boolean)} type="number" min="0.1" step="0.1" value={draft.timeMinutes ?? ""} onChange={(e) => setDraft((old) => ({
            ...old,
            timeMinutes: e.target.value
                ? Number(e.target.value)
                : undefined,
        }))} placeholder="Optional"/>
            </label>
            <label className="wide">
              Mock URL
              <input type="url" value={draft.url ?? ""} onChange={(e) => update("url", e.target.value)} placeholder="https://..."/>
            </label>
          </div>
          {!auto && (<div className="p4g-warning" role="note">
              This mock does not match the current saved marking configuration,
              or no scoring rules are available. To protect historical scores,
              automatic rescoring is disabled. You can edit answer counts below;
              saved scores remain unchanged unless you explicitly change them.
            </div>)}
          <div className="p4g-breakdown">
            <div className="p4g-row p4g-heading v21-edit-row">
              <span>Subject</span>
              <span>Correct</span>
              <span>Wrong</span>
              <span>Time (min)</span>
              <span>Score</span>
            </div>
            {hasSections ? (storedSections.map((s, i) => {
            const max = s.correct + s.incorrect + s.unattempted;
            return (<div className="p4g-row v21-edit-row" key={i}>
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
                    {numberInput("Correct", s.correct, (n) => updateSection(i, "correct", n), max - s.incorrect)}
                    {numberInput("Wrong", s.incorrect, (n) => updateSection(i, "incorrect", n), max - s.correct)}
                    <label className="p4g-number">
                      Time
                      <input aria-label={`${s.subject} time`} type="number" min="0.1" step="0.1" placeholder="—" value={editTimes[s.subject] ?? ""} onChange={(e) => setEditTimes((old) => ({
                    ...old,
                    [s.subject]: e.target.value,
                }))}/>
                    </label>
                    <div className="p4g-score">
                      {sectionAuto ? (s.score.toFixed(2)) : (<input aria-label={`${s.subject} score`} type="number" step="0.01" value={s.score} onChange={(e) => setDraft((old) => ({
                        ...old,
                        sections: old.sections?.map((r, j) => i === j
                            ? { ...r, score: Number(e.target.value) }
                            : r),
                    }))}/>)}
                      <small>/ {s.maxScore}</small>
                    </div>
                  </div>);
        })) : (<div className="p4g-row">
                <strong>
                  {draft.subject}
                  <small>
                    {draft.correct + draft.incorrect + draft.unattempted}{" "}
                    questions
                  </small>
                </strong>
                {numberInput("Correct", draft.correct, (n) => updateSingle("correct", n), draft.correct + draft.unattempted)}
                {numberInput("Wrong", draft.incorrect, (n) => updateSingle("incorrect", n), draft.incorrect + draft.unattempted)}
                <div className="p4g-score">
                  {singleAuto ? (draft.score.toFixed(2)) : (<input aria-label="Mock score" type="number" step="0.01" value={draft.score} onChange={(e) => update("score", Number(e.target.value))}/>)}
                  <small>/ {draft.maxScore}</small>
                </div>
              </div>)}
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
          {error && (<p className="error" role="alert">
              {error}
            </p>)}
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
    </div></ModalPortal>);
}
