import { useState } from "react";
import { Pencil } from "lucide-react";
import { saveGrades } from "../../services/students";
import { Badge, FormError, StatusBadge } from "../../components/ui";
import { GRADE_OPTIONS, formatGrade, semesterLabel, sumUnits, yearLabel } from "../../lib/format";

export default function TermTable({ term, rows, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = () => {
    setDraft(Object.fromEntries(rows.map((r) => [r.enrollment_id, {
      midterm: r.midterm_grade ?? "", final: r.final_grade ?? "",
      status: r.status === "incomplete" || r.status === "dropped" ? r.status : "auto",
    }])));
    setEditing(true);
    setError("");
  };
  const set = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const changed = rows.filter((r) => {
        const d = draft[r.enrollment_id];
        const st = r.status === "incomplete" || r.status === "dropped" ? r.status : "auto";
        return String(d.midterm) !== String(r.midterm_grade ?? "") || String(d.final) !== String(r.final_grade ?? "") || d.status !== st;
      });
      if (changed.length) {
        await saveGrades(changed.map((r) => {
          const d = draft[r.enrollment_id];
          return { enrollmentId: r.enrollment_id, midterm: d.midterm === "" ? null : Number(d.midterm), final: d.final === "" ? null : Number(d.final), status: d.status };
        }));
      }
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const gradeSelect = (id, k, label) => (
    <select aria-label={label} className="field h-9 w-[88px] px-2 font-mono text-[13px]" value={draft[id][k]} onChange={(e) => set(id, k, e.target.value)}
      disabled={k === "final" && draft[id].status !== "auto"}>
      <option value="">—</option>
      {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g.toFixed(2)}</option>)}
    </select>
  );

  const termAvg = (() => {
    const graded = rows.filter((r) => r.final_grade !== null);
    const u = sumUnits(graded);
    return u ? (graded.reduce((t, r) => t + r.final_grade * r.units, 0) / u).toFixed(2) : null;
  })();

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[17px] font-bold">{yearLabel(term.curriculum_year)} · {semesterLabel(term.semester)}</h2>
          <p className="mt-1 text-[13px] text-ink-3">SY {term.school_year.replace("-", "–")} · {term.is_current ? "in progress" : "completed"} · {sumUnits(rows)} units · {term.section_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {term.is_current && <Badge tone="info" dot>Current term</Badge>}
          {termAvg && <span className="text-[13px] text-ink-2">Term average <span className="font-mono font-semibold text-ink">{termAvg}</span></span>}
          {canEdit && !editing && <button className="btn btn-secondary btn-sm no-print" onClick={start}><Pencil size={14} aria-hidden="true" />Encode grades</button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Subject</th><th className="!text-center">Units</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th><th>{editing ? "Mark as" : "Status"}</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const bad = r.status === "failed";
              return (
                <tr key={r.enrollment_id} style={bad && !editing ? { background: "var(--bad-bg)" } : undefined}>
                  <td className="whitespace-nowrap font-mono text-[13px] text-accent">{r.code}</td>
                  <td className="font-medium">{r.title}</td>
                  <td className="num">{Number(r.units)}</td>
                  {editing ? (
                    <>
                      <td className="text-center">{gradeSelect(r.enrollment_id, "midterm", `Midterm grade for ${r.code}`)}</td>
                      <td className="text-center">{gradeSelect(r.enrollment_id, "final", `Final grade for ${r.code}`)}</td>
                      <td>
                        <select aria-label={`Status for ${r.code}`} className="field h-9 w-[150px] text-[13px]" value={draft[r.enrollment_id].status} onChange={(e) => set(r.enrollment_id, "status", e.target.value)}>
                          <option value="auto">From final grade</option><option value="incomplete">INC</option><option value="dropped">Dropped</option>
                        </select>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="num" style={r.midterm_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(r.midterm_grade)}</td>
                      <td className={`num font-semibold ${bad ? "text-bad" : ""}`} style={r.final_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(r.final_grade)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line px-5 py-3">
          <div className="mr-auto"><FormError error={error} /></div>
          <p className="text-[13px] text-ink-3">1.00 is highest, 3.00 is passing, 5.00 is failed.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save grades"}</button>
        </div>
      )}
    </section>
  );
}
