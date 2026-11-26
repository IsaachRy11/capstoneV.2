import { useState } from "react";
import { Check, ChevronDown, Pencil, Plus } from "lucide-react";
import AddCreditModal from "./AddCreditModal";
import { removeCredit, saveCreditGrades } from "../../services/students";
import { Badge, FormError, Modal } from "../../components/ui";
import { GRADE_OPTIONS, formatGrade, sumUnits, termAverage, yearSemesterLabel } from "../../lib/format";
import { isCredited } from "../../lib/progress";

const asText = (g) => (g === null || g === undefined ? "" : String(Number(g)));

// What a shiftee or transferee already took, shown like the other terms of the academic record: one card for each
// year and semester of the curriculum, with a term average. Each subject is Credited (passing final grade) or NC
// (failed, a subject to resolve). The secretary adds, corrects and removes them (computer only).
// Like the grade tables, only the student sees a failed row tinted.
export default function CreditedSubjects({ student, history, credits, tint, canAdd, canRemove, onSaved, defaultOpen }) {
  const [adding, setAdding] = useState(false);
  if (!credits.length && !canAdd) return null;
  const place = (c) => c.curriculum_subjects.year_level * 10 + c.curriculum_subjects.semester;
  const groups = [...new Set(credits.map(place))].sort((a, b) => b - a)
    .map((key) => ({ key, rows: credits.filter((c) => place(c) === key) }));
  return (
    <>
      {canAdd && (
        <div className="no-print -mb-2 hidden justify-end lg:flex">
          <button className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}><Plus size={14} aria-hidden="true" />Add earlier subjects</button>
        </div>
      )}
      {groups.map((g, i) => <CreditTerm key={g.key} rows={g.rows} tint={tint} canEdit={canRemove} onSaved={onSaved} defaultOpen={defaultOpen && i === 0} />)}
      {adding && <AddCreditModal student={student} history={history} credits={credits} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); onSaved(); }} />}
    </>
  );
}

function CreditTerm({ rows, tint, canEdit, onSaved, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [removing, setRemoving] = useState(null);
  const [draft, setDraft] = useState(null); // entry id → { midterm, final } while encoding
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editing = draft !== null;
  const first = rows[0].curriculum_subjects;
  const average = termAverage(rows.map((c) => ({
    code: c.curriculum_subjects.code, units: c.curriculum_subjects.units, final_grade: c.final_grade, status: isCredited(c) ? "passed" : "failed",
  })));

  const changed = editing
    ? rows.filter((c) => draft[c.id] && (draft[c.id].midterm !== asText(c.midterm_grade) || draft[c.id].final !== asText(c.final_grade)))
    : [];
  const noFinal = changed.some((c) => draft[c.id].final === "");
  const start = () => {
    setError("");
    setOpen(true);
    setDraft(Object.fromEntries(rows.map((c) => [c.id, { midterm: asText(c.midterm_grade), final: asText(c.final_grade) }])));
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
    <section className="card overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${open ? "border-b border-line" : ""}`}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full tone-ok" aria-hidden="true"><Check size={16} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">{yearSemesterLabel(first.year_level, first.semester)}</span>
            <span className="block text-[13px] font-normal text-ink-3">
              completed · {sumUnits(rows.map((c) => c.curriculum_subjects))} units
              {" · "}Term average <span className="font-mono font-semibold text-ink-2" title={average ? "Final grades weighted by units; NSTP and PATHFIT are not counted" : "Not shown while a subject is NC or has no final grade"}>{average || "—"}</span>
            </span>
          </span>
        </button>
        {canEdit && !editing && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={start}><Pencil size={14} aria-hidden="true" />Encode grades</button>}
        <button type="button" className="icon-btn no-print" aria-expanded={open} aria-label={open ? "Hide this term" : "Show this term"} onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={20} className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
      <div className={`overflow-x-auto print:block ${open ? "" : "hidden"}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="hidden w-[128px] sm:table-cell">Course No.</th><th>Description</th><th className="hidden !text-center sm:table-cell">Units</th>
              <th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className={editing ? "" : "hidden sm:table-cell"}>Status</th>
              {editing && <th className="no-print hidden w-px lg:table-cell"><span className="sr-only">Remove</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const s = c.curriculum_subjects;
              const d = editing ? draft[c.id] : null;
              // While encoding, the result follows the final grade being picked.
              const ok = isCredited(d ? { final_grade: d.final === "" ? null : d.final } : c);
              const result = d && d.final === "" && c.final_grade !== null
                ? <span className="text-[13px] text-ink-3">Enter the final grade</span>
                : <Badge tone={ok ? "ok" : "bad"}>{ok ? "Credited" : "NC"}</Badge>;
              return (
                <tr key={c.id} style={!ok && tint && !editing ? { background: "var(--bad-bg)" } : undefined}>
                  <td className="hidden whitespace-nowrap font-mono text-[13px] text-accent sm:table-cell">{s.code}</td>
                  <td className="font-medium">
                    <span className="block font-mono text-[12px] font-normal text-accent sm:hidden">{s.code} <span className="text-ink-3">· {Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span></span>
                    {s.title}
                    {!editing && <span className="mt-1.5 block sm:hidden">{result}</span>}
                  </td>
                  <td className="num hidden sm:table-cell">{Number(s.units)}</td>
                  {d ? (
                    <>
                      <td className="text-center">{gradeSelect(c, "midterm", "Midterm")}</td>
                      <td className="text-center">{gradeSelect(c, "final", "Final")}</td>
                    </>
                  ) : (
                    <>
                      <td className="num" style={c.midterm_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(c.midterm_grade)}</td>
                      <td className={`num font-semibold ${ok ? "" : "text-bad"}`} style={c.final_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(c.final_grade)}</td>
                    </>
                  )}
                  <td className={editing ? "whitespace-nowrap" : "hidden sm:table-cell"}>{result}</td>
                  {editing && <td className="no-print hidden lg:table-cell"><button className="btn btn-secondary btn-sm text-bad" onClick={() => setRemoving(c)} aria-label={`Remove ${s.code}`}>Remove</button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="no-print flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-4 py-3 sm:px-5">
          <p role="status" className="mr-auto text-[13px] text-ink-2">
            {noFinal ? "A changed subject still needs a final grade." : changed.length ? `${changed.length} ${changed.length === 1 ? "subject" : "subjects"} changed. Nothing is saved until you press Save grades.` : "No changes yet."}
          </p>
          {error && <div className="basis-full"><FormError error={error} /></div>}
          <button className="btn btn-secondary btn-sm" onClick={() => setDraft(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !changed.length || noFinal}>{busy ? "Saving…" : "Save grades"}</button>
        </div>
      )}
      {removing && <RemoveCreditModal credit={removing} onClose={() => setRemoving(null)} onSaved={() => { setRemoving(null); setDraft(null); onSaved(); }} />}
    </section>
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
    <Modal title={`Remove ${s.code} from the record?`} onClose={onClose}
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
