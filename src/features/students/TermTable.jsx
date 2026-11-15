import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { saveGrades } from "../../services/students";
import { Badge, FormError, StatusBadge } from "../../components/ui";
import { GRADE_OPTIONS, formatGrade, semesterLabel, sumUnits, yearLabel } from "../../lib/format";

// Phones: each term is a section that opens and closes (the newest starts open), so a long record
// is a short list of terms instead of one endless scroll. PC and print always show every term.
export default function TermTable({ term, rows, canEdit, onSaved, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
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
    setOpen(true);
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

  const gradeSelect = (id, k, label, cls = "h-9 w-[88px]") => (
    <select aria-label={label} className={`field px-2 font-mono text-[13px] ${cls}`} value={draft[id][k]} onChange={(e) => set(id, k, e.target.value)}
      disabled={k === "final" && draft[id].status !== "auto"}>
      <option value="">—</option>
      {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g.toFixed(2)}</option>)}
    </select>
  );
  const statusSelect = (r, cls = "h-9 w-[150px]") => (
    <select aria-label={`Status for ${r.code}`} className={`field text-[13px] ${cls}`} value={draft[r.enrollment_id].status} onChange={(e) => set(r.enrollment_id, "status", e.target.value)}>
      <option value="auto">From final grade</option><option value="incomplete">INC</option><option value="dropped">Dropped</option>
    </select>
  );

  const termAvg = (() => {
    const graded = rows.filter((r) => r.final_grade !== null);
    const u = sumUnits(graded);
    return u ? (graded.reduce((t, r) => t + r.final_grade * r.units, 0) / u).toFixed(2) : null;
  })();

  return (
    <section className="card overflow-hidden">
      {/* Phones: title row (tap to open/close), details under it, then the badges and Encode button on their own row. */}
      <div className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:border-b sm:border-line ${open ? "border-b border-line" : ""}`}>
        <div className="min-w-0 sm:flex-1">
          <h2 className="text-[17px] font-bold">
            <button type="button" className="flex w-full items-center justify-between gap-3 text-left sm:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span>{yearLabel(term.curriculum_year)} · {semesterLabel(term.semester)}</span>
              <ChevronDown size={20} className={`shrink-0 text-ink-3 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            <span className="hidden sm:inline">{yearLabel(term.curriculum_year)} · {semesterLabel(term.semester)}</span>
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">SY {term.school_year.replace("-", "–")} · {term.is_current ? "in progress" : "completed"} · {sumUnits(rows)} units · {term.section_name}</p>
        </div>
        {(term.is_current || termAvg || (canEdit && !editing)) && (
          <div className="flex flex-wrap items-center gap-3">
            {term.is_current && <Badge tone="info" dot>Current term</Badge>}
            {termAvg && <span className="text-[13px] text-ink-2">Term average <span className="font-mono font-semibold text-ink">{termAvg}</span></span>}
            {canEdit && !editing && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={start}><Pencil size={14} aria-hidden="true" />Encode grades</button>}
          </div>
        )}
      </div>
      <div className={`overflow-x-auto sm:block print:block ${open ? "" : "hidden"}`}>
        <table className="data-table">
          {/* Phones: code, units and status sit under the subject name so Midterm and Final always fit. */}
          <thead><tr><th className="hidden sm:table-cell">Code</th><th>Subject</th><th className="hidden !text-center sm:table-cell">Units</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className={editing ? "" : "hidden sm:table-cell"}>{editing ? "Mark as" : "Status"}</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const bad = r.status === "failed";
              return (
                <tr key={r.enrollment_id} style={bad && !editing ? { background: "var(--bad-bg)" } : undefined}>
                  <td className="hidden whitespace-nowrap font-mono text-[13px] text-accent sm:table-cell">{r.code}</td>
                  <td className="font-medium">
                    <span className="block font-mono text-[12px] font-normal text-accent sm:hidden">{r.code} <span className="text-ink-3">· {Number(r.units)} {Number(r.units) === 1 ? "unit" : "units"}</span></span>
                    {r.title}
                    {!editing && <span className="mt-1.5 block sm:hidden"><StatusBadge status={r.status} /></span>}
                  </td>
                  <td className="num hidden sm:table-cell">{Number(r.units)}</td>
                  {editing ? (
                    <>
                      <td className="text-center">{gradeSelect(r.enrollment_id, "midterm", `Midterm grade for ${r.code}`)}</td>
                      <td className="text-center">{gradeSelect(r.enrollment_id, "final", `Final grade for ${r.code}`)}</td>
                      <td>{statusSelect(r)}</td>
                    </>
                  ) : (
                    <>
                      <td className="num" style={r.midterm_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(r.midterm_grade)}</td>
                      <td className={`num font-semibold ${bad ? "text-bad" : ""}`} style={r.final_grade === null ? { color: "var(--ink-3)" } : undefined}>{formatGrade(r.final_grade)}</td>
                      <td className="hidden sm:table-cell"><StatusBadge status={r.status} /></td>
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
