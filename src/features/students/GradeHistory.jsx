import { useState } from "react";
import { formatGrade } from "../../lib/format";

const FIRST = 1; // only the latest change is shown at first

const gradeOrStatus = (grade, status) =>
  status === "incomplete" ? "NC" : status === "dropped" ? "Dropped" : formatGrade(grade);

// Every grade edit, recorded by the database (grade_changes): who, when, from what to what.
// Newest first; the latest few are shown and the rest open with "Show more".
export default function GradeHistory({ changes }) {
  const [all, setAll] = useState(false);
  const shown = all ? changes : changes.slice(0, FIRST);
  return (
    <section className="card no-print overflow-hidden">
      <div className="card-head px-5 py-4">
        <h2 className="text-[17px] font-bold">Grade change history</h2>
        <p className="mt-1 text-[13px] text-ink-3">Newest first. Recorded automatically whenever a grade is saved or a graded subject is removed. Entries can't be edited or deleted.</p>
      </div>
      {changes.length === 0 ? (
        <p className="px-5 py-6 text-[14px] text-ink-3">No grade changes yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th className="hidden sm:table-cell">When</th><th>Subject</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className="hidden sm:table-cell">Changed by</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td className="hidden whitespace-nowrap text-[13px] text-ink-2 sm:table-cell">
                    {new Date(c.changed_at).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td><span className="font-mono text-[13px] text-accent">{c.code}</span> <span className="text-[13px]">{c.title}</span><span className="block text-[12px] text-ink-3 sm:hidden">{new Date(c.changed_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} · {c.changed_by_name}</span></td>
                  {c.class_removed ? (
                    <td className="text-[13px]" colSpan={2}><span className="font-semibold">Subject removed</span> · had {formatGrade(c.old_midterm)} midterm, {gradeOrStatus(c.old_final, c.old_status)} final</td>
                  ) : (<>
                    <td className="num">{formatGrade(c.old_midterm)} → <span className="font-semibold">{formatGrade(c.new_midterm)}</span></td>
                    <td className="num">{gradeOrStatus(c.old_final, c.old_status)} → <span className="font-semibold">{gradeOrStatus(c.new_final, c.new_status)}</span></td>
                  </>)}
                  <td className="hidden text-[13px] sm:table-cell">{c.changed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {changes.length > FIRST && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-ink-3">
              <span>Showing {shown.length} of {changes.length} changes</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setAll((v) => !v)} aria-expanded={all}>{all ? "Show fewer" : `Show ${changes.length - FIRST} more`}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
