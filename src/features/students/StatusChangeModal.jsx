import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getCurriculum, getPrerequisites } from "../../services/catalog";
import { Modal } from "../../components/ui";
import { STUDENT_STATUS_LABEL, sumUnits } from "../../lib/format";
import { buildProgress, graduationCheck } from "../../lib/progress";

// Asked before a student's status changes, so a wrong pick in the list can't take effect by accident. Marking
// someone Graduated checks the curriculum first: if subjects are missing, they are listed and an extra tick is
// needed. (It warns rather than blocks: subjects credited from another school are not recorded in the system.)
const EXPLAIN = {
  active: "They return to the Enrolled list and can be added to subjects again.",
  dropped: "They move to the Dropped list and can't be added to subjects while Dropped.",
  shifted_out: "They move to the Shifted out list and can't be added to subjects. Their record and grades are kept.",
  inactive: "They can't be added to subjects while Inactive.",
};
const STATE_WORD = { in_progress: "Enrolled now", back: "To resolve", not_taken: "Not yet taken" };

export default function StatusChangeModal({ student, history, status, busy, onClose, onConfirm }) {
  const graduating = status === "graduated";
  const [understood, setUnderstood] = useState(false);
  const { data, error, loading } = useAsync(async () => {
    if (!graduating) return null;
    const [curriculum, prerequisites] = await Promise.all([getCurriculum(student.program_code), getPrerequisites()]);
    return graduationCheck(buildProgress({ curriculum, history, prerequisites }));
  }, [student.id, status]);
  const checking = graduating && loading;
  const short = graduating && data && !data.eligible;
  const label = status === "active" ? "Active" : STUDENT_STATUS_LABEL[status];

  return (
    <Modal title={graduating ? `Mark ${student.full_name} as Graduated?` : `Change status to ${label}?`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={`btn ${short ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}
          disabled={busy || checking || (graduating && !data) || (short && !understood)}>
          {busy ? "Saving…" : short ? "Graduate anyway" : graduating ? "Mark as Graduated" : `Change to ${label}`}
        </button>
      </>}>
      {!graduating && <p className="text-[14px] text-ink-2"><strong className="text-ink">{student.full_name}</strong> ({student.id}). {EXPLAIN[status]}</p>}
      {checking && <p role="status" className="text-[14px] text-ink-3">Checking the curriculum…</p>}
      {graduating && error && <p role="alert" className="text-[14px] text-bad">Couldn't check the curriculum, so the status wasn't changed. Close this and try again.</p>}
      {graduating && data?.eligible && (
        <p className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-[14px] tone-ok">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>All {data.total} subjects in the curriculum are passed. They move to the Graduated list.</span>
        </p>
      )}
      {short && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-[14px] font-semibold tone-bad">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Not yet eligible to graduate: {data.missing.length} of {data.total} subjects ({sumUnits(data.missing)} units) are not passed.</span>
          </p>
          <ul className="max-h-48 overflow-auto rounded-lg border border-line">
            {data.missing.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-3 border-b border-line-2 px-3 py-2 text-[13px] last:border-0">
                <span className="min-w-0"><span className="font-mono">{s.code}</span> {s.title}</span>
                <span className="shrink-0 text-ink-3">{STATE_WORD[s.state]}</span>
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-2.5 text-[14px] text-ink">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            I checked this student's record and want to mark them Graduated anyway.
          </label>
        </div>
      )}
    </Modal>
  );
}
