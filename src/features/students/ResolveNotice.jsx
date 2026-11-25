import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { semesterLabel, yearLabel } from "../../lib/format";

// "Subjects to resolve" for the student, color-coded by how serious it is: Failed (red) must be taken again,
// NC (amber) is still unfinished, Dropped (grey). Home shows only the count; the Academic record lists each one.
const KIND = { failed: ["Failed (5.00)", "tone-bad"], incomplete: ["NC", "tone-warn"], dropped: ["Dropped", "tone-neutral"] };

export default function ResolveNotice({ items, detailed = false }) {
  const color = items.some((d) => d.status === "failed") ? "bad" : "warn";
  return (
    <section role={detailed ? "alert" : undefined} className="no-print card flex items-start gap-3.5 px-5 py-4" style={{ background: `var(--${color}-bg)`, borderColor: `var(--${color})` }}>
      <AlertTriangle size={20} className={`mt-0.5 shrink-0 ${color === "bad" ? "text-bad" : "text-warn"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className={`text-[15px] font-bold ${color === "bad" ? "text-bad" : "text-warn"}`}>{items.length} {items.length === 1 ? "subject" : "subjects"} to resolve</h2>
        {detailed ? (
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-relaxed text-ink-2">
            {items.map((d) => (
              <li key={d.enrollment_id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`badge ${KIND[d.status]?.[1] || "tone-neutral"}`}>{KIND[d.status]?.[0] || d.status}</span>
                <span><span className="font-mono">{d.code}</span> {d.title}</span>
                <span className="text-[13px] text-ink-3">{yearLabel(d.curriculum_year)}, {semesterLabel(d.semester)}, SY {d.school_year.replace("-", "–")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[14px] text-ink-2"><Link to="/record" className="inline-flex min-h-10 items-center font-semibold">See the details on your Academic record</Link></p>
        )}
      </div>
    </section>
  );
}
