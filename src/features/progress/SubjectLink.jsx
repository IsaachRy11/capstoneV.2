import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { CalendarCheck, CalendarX } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getSubjectClasses } from "../../services/catalog";
import { Badge, FormError, Modal } from "../../components/ui";
import { isActiveStudent, yearSemesterLabel } from "../../lib/format";
import { SUBJECT_STATE, prerequisiteText, stateLabel } from "../../lib/progress";

// A worded link that opens a short preview of a subject to resolve, including whether a class for it is listed this
// semester. subject comes from buildProgress(). Only an Active student can still take it, so others get no link.
export default function SubjectLink({ subject, student, term }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const context = useOutletContext();
  if (!isActiveStudent(student)) return null;
  return (
    <>
      <button type="button" className="subject-link" onClick={() => setOpen(true)} aria-label={`See if ${subject.code} has a class this semester`}>See if there's a class this semester</button>
      {open && createPortal(<SubjectPreview subject={subject} student={student} term={term || context?.term} onClose={close} />, document.body)}
    </>
  );
}

function SubjectPreview({ subject, student, term, onClose }) {
  const requiredFor = (subject.unlocks || []).map((s) => s.code).join(", ");
  // The class list only matters for a subject an Active student still has to take.
  const asksThisTerm = isActiveStudent(student) && (subject.state === "back" || subject.state === "not_taken");
  const facts = [
    ["In your curriculum", yearSemesterLabel(subject.year_level, subject.semester)],
    ["Units", `${Number(subject.units)} ${Number(subject.units) === 1 ? "unit" : "units"}`],
    ["Prerequisite", prerequisiteText(subject) || "None"],
    ["Required for", requiredFor || "No other subject"],
  ];
  return (
    <Modal title={subject.code} onClose={onClose} footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <p className="text-[16px] font-semibold text-ink">{subject.title}</p>
      <p className="mt-2"><Badge tone={SUBJECT_STATE[subject.state].tone} dot>{stateLabel(subject)}</Badge></p>
      <dl className="mt-4 divide-y divide-line-2 rounded-lg border border-line">
        {facts.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
            <dt className="text-[13px] text-ink-3">{k}</dt><dd className="text-right text-[14px] font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {asksThisTerm && <ThisSemester subjectId={subject.id} term={term} />}
    </Modal>
  );
}

// Only what the system itself lists: whether a class for this subject was set up this semester.
function ThisSemester({ subjectId, term }) {
  const { data, error, loading } = useAsync(() => (term ? getSubjectClasses(subjectId, term.id) : Promise.resolve([])), [subjectId, term?.id]);
  if (loading) return <p role="status" className="mt-4 text-[14px] text-ink-3">Checking this semester…</p>;
  if (error) return <div className="mt-4"><FormError error="Couldn't check this semester's classes. Try again." /></div>;
  const has = data.length > 0;
  const Icon = has ? CalendarCheck : CalendarX;
  return (
    <div className={`mt-4 flex items-start gap-2.5 rounded-lg px-4 py-3 ${has ? "tone-info" : "tone-warn"}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="text-[14px]">
        <span className="block font-bold">{has ? "Has a class this semester" : "No class listed this semester"}</span>
        {has ? `Sections: ${data.join(", ")}. ` : ""}Check with the CCS Secretary's Office to confirm.
      </p>
    </div>
  );
}
