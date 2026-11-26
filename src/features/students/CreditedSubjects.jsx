import { useState } from "react";
import { History, Plus } from "lucide-react";
import AddCreditModal from "./AddCreditModal";
import { removeCredit } from "../../services/students";
import { Badge, FormError, Modal } from "../../components/ui";
import { formatGrade, sumUnits, yearSemesterLabel } from "../../lib/format";
import { isCredited } from "../../lib/progress";

// What a shiftee or transferee took before, with its grades. These have no class here, so they get their own table
// above the terms. Each row says plainly whether it is Credited (passing final grade) or Not credited (failed). The
// secretary adds and removes them (computer only); everyone else only reads. Like the grade tables, only the student
// sees a failed row tinted.
export default function CreditedSubjects({ student, history, credits, tint, canAdd, canRemove, onSaved }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  if (!credits.length && !canAdd) return null;
  const counted = credits.filter(isCredited);
  const failed = credits.length - counted.length;
  const units = sumUnits(counted.map((c) => c.curriculum_subjects));
  const passedHere = new Set(history.filter((r) => r.status === "passed").map((r) => r.subject_id));
  const summary = [
    `${counted.length} credited · ${units} units`,
    failed ? `${failed} not credited` : "",
  ].filter(Boolean).join(" · ");

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
        {canAdd && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={() => setAdding(true)}><Plus size={14} aria-hidden="true" />Add earlier subjects</button>}
      </div>
      {credits.length > 0 && (
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th className="hidden w-[128px] sm:table-cell">Course No.</th><th>Description</th><th className="hidden w-px !text-center sm:table-cell">Units</th>
                <th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className="hidden w-[190px] sm:table-cell">Credit</th>
                {canRemove && <th className="no-print hidden w-px lg:table-cell"><span className="sr-only">Remove</span></th>}
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => {
                const s = c.curriculum_subjects;
                const ok = isCredited(c);
                const result = <CreditResult ok={ok} passedHere={passedHere.has(c.curriculum_subject_id)} />;
                return (
                  <tr key={c.id} style={!ok && tint ? { background: "var(--bad-bg)" } : undefined}>
                    <td className="hidden whitespace-nowrap align-top font-mono text-[13px] text-accent sm:table-cell">{s.code}</td>
                    <td className="min-w-0 align-top font-medium">
                      <span className="block font-mono text-[12px] font-normal text-accent sm:hidden">{s.code} <span className="text-ink-3">· {Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span></span>
                      {s.title}
                      <span className="mt-0.5 block text-[12px] font-normal text-ink-3">{yearSemesterLabel(s.year_level, s.semester)} subject in the curriculum</span>
                      <span className="mt-1.5 block sm:hidden">{result}</span>
                    </td>
                    <td className="num hidden align-top sm:table-cell">{Number(s.units)}</td>
                    <td className="num align-top" style={c.midterm_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(c.midterm_grade)}</td>
                    <td className={`num align-top font-semibold ${ok ? "" : "text-bad"}`} style={c.final_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(c.final_grade)}</td>
                    <td className="hidden align-top sm:table-cell">{result}</td>
                    {canRemove && <td className="no-print hidden align-top lg:table-cell"><button className="btn btn-secondary btn-sm text-bad" onClick={() => setRemoving(c)} aria-label={`Remove ${s.code} from earlier studies`}>Remove</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      <span className="mt-1 block text-[12px] text-ink-2">{passedHere ? "Failed before. Passed here since." : "Failed. Needs to be taken here."}</span>
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
        {s.code} {s.title} and its grades will be taken off the record.{isCredited(credit) ? " It will count as not yet passed again." : ""} To correct a grade, remove it and add it again. The system keeps a log of who removed it and when.
      </p>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
