import { useState } from "react";
import { BookOpen, Check, ChevronDown, Pencil } from "lucide-react";
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
      {/* The header opens and closes the term (on every screen), like "Completed" on the roadmap. */}
      <div className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${open ? "border-b border-line" : ""}`}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${term.is_current ? "tone-info" : "tone-ok"}`} aria-hidden="true">
            {term.is_current ? <BookOpen size={16} /> : <Check size={16} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] font-bold">
              {yearLabel(term.curriculum_year)} · {semesterLabel(term.semester)}
              {term.is_current && <Badge tone="info" dot>Current term</Badge>}
            </span>
            <span className="block text-[13px] font-normal text-ink-3">
              SY {term.school_year.replace("-", "–")} · {term.is_current ? "in progress" : "completed"} · {sumUnits(rows)} units · {term.section_name}
              {termAvg && <> · Term average <span className="font-mono font-semibold text-ink-2">{termAvg}</span></>}
            </span>
          </span>
        </button>
        {canEdit && !editing && <button className="btn btn-secondary btn-sm no-print hidden lg:inline-flex" onClick={start}><Pencil size={14} aria-hidden="true" />Encode grades</button>}
        <button type="button" className="icon-btn no-print" aria-expanded={open} aria-label={open ? "Hide this term" : "Show this term"} onClick={() => setOpen((o) => !o)}>
          <ChevronDown size={20} className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>
      <div className={`overflow-x-auto print:block ${open ? "" : "hidden"}`}>
        <table className="data-table">
          {/* Phones: code, units and status sit under the subject name so Midterm and Final always fit. */}
          <thead><tr><th className="hidden w-[128px] sm:table-cell">Course No.</th><th>Description</th><th className="hidden !text-center sm:table-cell">Units</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className={editing ? "" : "hidden sm:table-cell"}>{editing ? "Mark as" : "Status"}</th></tr></thead>
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
