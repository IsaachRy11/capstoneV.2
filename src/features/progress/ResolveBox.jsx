import { AlertTriangle } from "lucide-react";
import SubjectLink from "./SubjectLink";
import { backTone, isSerious } from "../../lib/progress";
import { curriculumPlace } from "../../lib/format";

// The student's "subjects to resolve" box, one design on This semester and the Academic record: each line says why,
// where the subject sits in the curriculum, and links to whether it has a class this semester. Red if anything
// failed or was not credited, else amber. items: progress.resolve from buildProgress(), each with a backReason.
export default function ResolveBox({ items, student, className = "" }) {
  if (!items.length) return null;
  const severe = items.some((x) => isSerious(x.backReason));
  return (
    <section className={`card flex items-start gap-3.5 px-5 py-4 ${className}`} style={{ background: `var(--${severe ? "bad" : "warn"}-bg)`, borderColor: `var(--${severe ? "bad" : "warn"})` }}>
      <AlertTriangle size={22} className={`mt-0.5 shrink-0 ${severe ? "text-bad" : "text-warn"}`} aria-hidden="true" />
      <div className="min-w-0">
        <h2 className={`text-[15px] font-bold ${severe ? "text-bad" : "text-warn"}`}>{items.length === 1 ? "1 subject to resolve" : `${items.length} subjects to resolve`}</h2>
        <ul className="mt-1 text-[14px] text-ink-2">
          {items.map((s) => (
            <li key={s.id} className="py-0.5"><span className={`badge mr-2 ${backTone(s.backReason)}`}>{s.backReason}</span><span className="font-mono">{s.code}</span> {s.title} · In your curriculum: {curriculumPlace(s.year_level, s.semester)}{" "}
              {s.retaking ? <span className="font-semibold text-ink">· You're taking it this semester</span> : <SubjectLink subject={s} student={student} />}</li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-ink-3">Check with the CCS Secretary's Office how to resolve or retake them.</p>
      </div>
    </section>
  );
}
