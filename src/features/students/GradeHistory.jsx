import { formatGrade } from "../../lib/format";

const gradeOrStatus = (grade, status) =>
  status === "incomplete" ? "INC" : status === "dropped" ? "Dropped" : formatGrade(grade);

// Every grade edit, recorded by the database (grade_changes): who, when, from what to what.
export default function GradeHistory({ changes }) {
  return (
    <section className="card no-print overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[17px] font-bold">Grade change history</h2>
        <p className="mt-1 text-[13px] text-ink-3">Recorded automatically whenever a grade is saved. Entries can't be edited or deleted.</p>
      </div>
      {changes.length === 0 ? (
        <p className="px-5 py-6 text-[14px] text-ink-3">No grade changes yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>When</th><th>Subject</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th><th>Changed by</th></tr></thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap text-[13px] text-ink-2">
                    {new Date(c.changed_at).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td><span className="font-mono text-[13px] text-accent">{c.code}</span> <span className="text-[13px]">{c.title}</span></td>
                  <td className="num">{formatGrade(c.old_midterm)} → <span className="font-semibold">{formatGrade(c.new_midterm)}</span></td>
                  <td className="num">{gradeOrStatus(c.old_final, c.old_status)} → <span className="font-semibold">{gradeOrStatus(c.new_final, c.new_status)}</span></td>
                  <td className="text-[13px]">{c.changed_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
