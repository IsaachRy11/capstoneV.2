import { useState } from "react";
import { BadgeCheck, Plus } from "lucide-react";
import AddCreditModal from "./AddCreditModal";
import { removeCredit } from "../../services/students";
import { Badge, FormError, Modal } from "../../components/ui";
import { sumUnits, yearSemesterLabel } from "../../lib/format";

// Subjects accepted from a shiftee's or transferee's earlier studies. They have no class or grade here, so they get
// their own table above the terms. The secretary adds and removes them (computer only); everyone else only reads.
export default function CreditedSubjects({ student, history, credits, canAdd, canRemove, onSaved }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  if (!credits.length && !canAdd) return null;
  const units = sumUnits(credits.map((c) => c.curriculum_subjects));

  return (
    <section className={`card overflow-hidden ${credits.length ? "" : "no-print hidden lg:block"}`} aria-labelledby="credits-title">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full tone-ok" aria-hidden="true"><BadgeCheck size={16} /></span>
        <span className="min-w-0 flex-1">
          <h2 id="credits-title" className="text-[15px] font-bold">Credited subjects</h2>
          <span className="block text-[13px] text-ink-3">
            {credits.length ? `${credits.length} ${credits.length === 1 ? "subject" : "subjects"} · ${units} units, accepted from earlier studies` : "None yet. Add the subjects the school has accepted from earlier studies."}
          </span>
        </span>
        {canAdd && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={() => setAdding(true)}><Plus size={14} aria-hidden="true" />Add credited subjects</button>}
      </div>
      {credits.length > 0 && (
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th className="hidden w-[128px] sm:table-cell">Course No.</th><th>Description</th><th className="hidden w-px !text-center sm:table-cell">Units</th>
                <th className="hidden md:table-cell">In the curriculum</th><th className="w-px">Status</th>
                {canRemove && <th className="no-print hidden w-px lg:table-cell"><span className="sr-only">Remove</span></th>}
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => {
                const s = c.curriculum_subjects;
                const place = yearSemesterLabel(s.year_level, s.semester);
                return (
                  <tr key={c.id}>
                    <td className="hidden whitespace-nowrap align-top font-mono text-[13px] text-accent sm:table-cell">{s.code}</td>
                    <td className="min-w-0 align-top font-medium">
                      <span className="block font-mono text-[12px] font-normal text-accent sm:hidden">{s.code} <span className="text-ink-3">· {Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span></span>
                      {s.title}
                      <span className="mt-0.5 block text-[12px] font-normal text-ink-3 md:hidden">{place}</span>
                    </td>
                    <td className="num hidden align-top sm:table-cell">{Number(s.units)}</td>
                    <td className="hidden whitespace-nowrap align-top text-[13px] text-ink-2 md:table-cell">{place}</td>
                    <td className="align-top"><Badge tone="ok" dot>Credited</Badge></td>
                    {canRemove && <td className="no-print hidden align-top lg:table-cell"><button className="btn btn-secondary btn-sm text-bad" onClick={() => setRemoving(c)} aria-label={`Remove the credit for ${s.code}`}>Remove</button></td>}
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
    <Modal title={`Remove the credit for ${s.code}?`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? "Removing…" : "Remove credit"}</button>
      </>}>
      <p className="text-[14px] text-ink-2">{s.code} {s.title} will count as not yet passed again. The system keeps a log of who removed it and when.</p>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
