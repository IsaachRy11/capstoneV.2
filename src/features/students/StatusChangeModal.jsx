import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getCurriculum, getPrerequisites } from "../../services/catalog";
import { Modal } from "../../components/ui";
import { STUDENT_STATUS_LABEL, sumUnits } from "../../lib/format";
import { buildProgress, graduationCheck } from "../../lib/progress";

// Asked before a student's status changes, so a wrong pick in the list can't take effect by accident. Marking
// someone Graduated checks the curriculum first: while subjects are not passed or credited, they are listed and
// there is no button to graduate. (This is a screen rule; the database does not enforce it.)
const EXPLAIN = {
  active: "They return to the Enrolled list and can be added to subjects again.",
  dropped: "They leave this semester and move to the Withdrawn list. They can't be added to subjects while Withdrawn.",
  shifted_out: "They move to the Shifted out list and can't be added to subjects. Their record and grades are kept.",
  inactive: "For a student who didn't continue but hasn't officially withdrawn. They move to the Inactive list and can't be added to subjects while Inactive. Their record and grades are kept.",
};
const STATE_WORD = { in_progress: "Enrolled now", back: "To resolve", not_taken: "Not yet taken" };

export default function StatusChangeModal({ student, history, credits = [], status, busy, onClose, onConfirm }) {
  const graduating = status === "graduated";
  const { data, error, loading } = useAsync(async () => {
    if (!graduating) return null;
    const [curriculum, prerequisites] = await Promise.all([getCurriculum(student.program_code), getPrerequisites()]);
    return graduationCheck(buildProgress({ curriculum, history, prerequisites, credits }));
  }, [student.id, status]);
  const checking = graduating && loading;
  const short = graduating && data && !data.eligible;
  const label = status === "active" ? "Active" : STUDENT_STATUS_LABEL[status];
  const withdrawing = status === "dropped";
  // This term's subjects with no result yet: withdrawal marks them Withdrawn, and Inactive isn't allowed while any exist.
  const ongoing = history.filter((r) => r.is_current && r.status === "enrolled" && r.final_grade === null);
  const leaving = withdrawing ? ongoing : [];
  const stillTaking = status === "inactive" ? ongoing.length : 0;

  return (
    <Modal title={graduating ? `Mark ${student.full_name} as Graduated?` : withdrawing ? `Withdraw ${student.full_name}?` : `Change status to ${label}?`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>{short ? "Close" : "Cancel"}</button>
        {!short && (
          <button className={`btn ${withdrawing ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}
            disabled={busy || checking || stillTaking > 0 || (graduating && !data)}>
            {busy ? "Saving…" : graduating ? "Mark as Graduated" : withdrawing ? "Withdraw student" : `Change to ${label}`}
          </button>
        )}
      </>}>
      {!graduating && <p className="text-[14px] text-ink-2"><strong className="text-ink">{student.full_name}</strong> ({student.id}). {EXPLAIN[status]}</p>}
      {stillTaking > 0 && (
        <p role="alert" className="mt-3 rounded-lg px-4 py-3 text-[14px] tone-warn">
          This student still has {stillTaking} {stillTaking === 1 ? "subject" : "subjects"} this semester with no result, so they can't be marked Inactive. If they are leaving now, choose Withdrawn.
        </p>
      )}
      {withdrawing && (
        <div className="mt-3 flex flex-col gap-2">
          {leaving.length > 0 ? (
            <>
              <p className="text-[14px] font-semibold text-ink">{leaving.length} {leaving.length === 1 ? "subject" : "subjects"} this semester will be marked Withdrawn, and {leaving.length === 1 ? "its seat" : "their seats"} freed:</p>
              <ul className="max-h-40 overflow-auto rounded-lg border border-line">
                {leaving.map((r) => (
                  <li key={r.enrollment_id} className="border-b border-line-2 px-3 py-2 text-[13px] last:border-0"><span className="font-mono">{r.code}</span> {r.title}</li>
                ))}
              </ul>
            </>
          ) : <p className="text-[14px] text-ink-2">No subject this semester is waiting for a result.</p>}
          <p className="text-[13px] text-ink-3">Passed, Failed, NC and Dropped results stay, and earlier semesters don't change. A withdrawn subject counts as not yet taken.</p>
        </div>
      )}
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
          <p className="text-[13px] text-ink-3">They can be marked as Graduated once every subject is passed or credited.</p>
        </div>
      )}
    </Modal>
  );
}
