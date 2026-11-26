import { useState } from "react";
import { History, Pencil, Plus } from "lucide-react";
import AddCreditModal from "./AddCreditModal";
import { removeCredit, saveCreditGrades } from "../../services/students";
import { Badge, FormError, Modal } from "../../components/ui";
import { GRADE_OPTIONS, formatGrade, sumUnits, yearSemesterLabel } from "../../lib/format";
import { isCredited } from "../../lib/progress";

const asText = (g) => (g === null || g === undefined ? "" : String(Number(g)));

// What a shiftee or transferee took before, with its grades. These have no class here, so they get their own table
// above the terms. Each row says plainly whether it is Credited (passing final grade) or Not credited (failed, a
// subject to resolve). The secretary adds, corrects and removes them (computer only); everyone else only reads.
// Like the grade tables, only the student sees a failed row tinted.
export default function CreditedSubjects({ student, history, credits, tint, canAdd, canRemove, onSaved }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [draft, setDraft] = useState(null); // entry id → { midterm, final } while encoding
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!credits.length && !canAdd) return null;
  const editing = draft !== null;
  const counted = credits.filter(isCredited);
  const failed = credits.length - counted.length;
  const units = sumUnits(counted.map((c) => c.curriculum_subjects));
  const passedHere = new Set(history.filter((r) => r.status === "passed").map((r) => r.subject_id));
  const summary = [
    `${counted.length} credited · ${units} units`,
    failed ? `${failed} not credited` : "",
  ].filter(Boolean).join(" · ");

  const changed = editing
    ? credits.filter((c) => draft[c.id] && (draft[c.id].midterm !== asText(c.midterm_grade) || draft[c.id].final !== asText(c.final_grade)))
    : [];
  const noFinal = changed.some((c) => draft[c.id].final === "");
  const start = () => {
    setError("");
    setDraft(Object.fromEntries(credits.map((c) => [c.id, { midterm: asText(c.midterm_grade), final: asText(c.final_grade) }])));
  };
  const set = (id, key, value) => setDraft((old) => ({ ...old, [id]: { ...old[id], [key]: value } }));
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await saveCreditGrades(changed.map((c) => ({
        id: c.id,
        midterm: draft[c.id].midterm === "" ? null : Number(draft[c.id].midterm),
        final: Number(draft[c.id].final),
      })));
      setDraft(null);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const gradeSelect = (c, key, label) => (
    <select aria-label={`${label} grade for ${c.curriculum_subjects.code}`} className="field h-9 w-[96px] pl-3 pr-8 font-mono text-[13px]" value={draft[c.id][key]} onChange={(e) => set(c.id, key, e.target.value)}>
      <option value="">—</option>
      {GRADE_OPTIONS.map((g) => <option key={g} value={String(g)}>{g.toFixed(2)}</option>)}
    </select>
  );

  return (
    <section className={`card overflow-hidden ${credits.length ? "" : "no-print hidden lg:block"}`} aria-labelledby="credits-title">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full tone-neutral" aria-hidden="true"><History size={16} /></span>
        <span className="min-w-0 flex-1">
          <h2 id="credits-title" className="text-[15px] font-bold">Subjects from earlier studies</h2>
          <span className="block text-[13px] text-ink-3">
            {credits.length ? summary : "None yet. Add the subjects taken before, with their grades. Only passed ones are credited."}
          </span>
        </span>
        {canRemove && !editing && credits.length > 0 && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={start}><Pencil size={14} aria-hidden="true" />Encode grades</button>}
        {canAdd && !editing && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={() => setAdding(true)}><Plus size={14} aria-hidden="true" />Add earlier subjects</button>}
      </div>
      {credits.length > 0 && (
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th className="hidden w-[128px] sm:table-cell">Course No.</th><th>Description</th><th className="hidden w-px !text-center sm:table-cell">Units</th>
                <th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className="hidden w-[190px] sm:table-cell">Credit</th>
                {canRemove && !editing && <th className="no-print hidden w-px lg:table-cell"><span className="sr-only">Remove</span></th>}
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => {
                const s = c.curriculum_subjects;
                const d = editing ? draft[c.id] : null;
                // While encoding, the result follows the final grade being picked.
                const ok = isCredited(d ? { final_grade: d.final === "" ? null : d.final } : c);
                const result = d && d.final === "" && c.final_grade !== null
                  ? <span className="text-[13px] text-ink-3">Enter the final grade</span>
                  : <CreditResult ok={ok} passedHere={passedHere.has(c.curriculum_subject_id)} />;
                return (
                  <tr key={c.id} style={!ok && tint && !editing ? { background: "var(--bad-bg)" } : undefined}>
                    <td className="hidden whitespace-nowrap align-top font-mono text-[13px] text-accent sm:table-cell">{s.code}</td>
                    <td className="min-w-0 align-top font-medium">
                      <span className="block font-mono text-[12px] font-normal text-accent sm:hidden">{s.code} <span className="text-ink-3">· {Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span></span>
                      {s.title}
                      <span className="mt-0.5 block text-[12px] font-normal text-ink-3">{yearSemesterLabel(s.year_level, s.semester)} subject in the curriculum</span>
                      <span className="mt-1.5 block sm:hidden">{result}</span>
                    </td>
                    <td className="num hidden align-top sm:table-cell">{Number(s.units)}</td>
                    {d ? (
                      <>
                        <td className="text-center align-top">{gradeSelect(c, "midterm", "Midterm")}</td>
                        <td className="text-center align-top">{gradeSelect(c, "final", "Final")}</td>
                      </>
                    ) : (
                      <>
                        <td className="num align-top" style={c.midterm_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(c.midterm_grade)}</td>
                        <td className={`num align-top font-semibold ${ok ? "" : "text-bad"}`} style={c.final_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(c.final_grade)}</td>
                      </>
                    )}
                    <td className="hidden align-top sm:table-cell">{result}</td>
                    {canRemove && !editing && <td className="no-print hidden align-top lg:table-cell"><button className="btn btn-secondary btn-sm text-bad" onClick={() => setRemoving(c)} aria-label={`Remove ${s.code} from earlier studies`}>Remove</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="no-print flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-4 py-3 sm:px-5">
          <p role="status" className="mr-auto text-[13px] text-ink-2">
            {noFinal ? "A changed subject still needs a final grade." : changed.length ? `${changed.length} ${changed.length === 1 ? "subject" : "subjects"} changed. Nothing is saved until you press Save grades.` : "No changes yet."}
          </p>
          {error && <div className="basis-full"><FormError error={error} /></div>}
          <button className="btn btn-secondary" onClick={() => setDraft(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !changed.length || noFinal}>{busy ? "Saving…" : "Save grades"}</button>
        </div>
      )}
      {adding && <AddCreditModal student={student} history={history} credits={credits} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); onSaved(); }} />}
      {removing && <RemoveCreditModal credit={removing} onClose={() => setRemoving(null)} onSaved={() => { setRemoving(null); onSaved(); }} />}
    </section>
  );
}

// Credited or not, with the reason in words, so a failed grade is never mistaken for a missing credit.
function CreditResult({ ok, passedHere }) {
  if (ok) return <Badge tone="ok" dot>Credited</Badge>;
  return (
    <span className="block">
      <Badge tone="bad" dot>Not credited</Badge>
      <span className="mt-1 block text-[12px] text-ink-2">{passedHere ? "Failed before. Passed here since." : "Subject to resolve."}</span>
    </span>
  );
}

function RemoveCreditModal({ credit, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const s = credit.curriculum_subjects;
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await removeCredit(credit.id);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title={`Remove ${s.code} from earlier studies?`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? "Removing…" : "Remove"}</button>
      </>}>
      <p className="text-[14px] text-ink-2">
        {s.code} {s.title} and its grades will be taken off the record.{isCredited(credit) ? " It will count as not yet passed again." : ""} Only remove a subject that shouldn't be listed. To correct a grade, use Encode grades. The system keeps a log of who removed it and when.
      </p>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
