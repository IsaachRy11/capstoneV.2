import { useState } from "react";
import { BookOpen, Check, ChevronDown, Pencil } from "lucide-react";
import { saveGrades } from "../../services/students";
import { Badge, FormError, StatusBadge } from "../../components/ui";
import { GRADE_OPTIONS, STATUS_LABEL, formatGrade, semesterLabel, sumUnits, yearLabel } from "../../lib/format";

// What a row will be once saved. Passed and Failed always follow the final grade (3.00 or better passes, 5.00 fails),
// so they can never disagree with it; INC and Dropped are chosen with their buttons and carry no final grade.
const outcome = (d) =>
  d.status === "incomplete" ? "incomplete"
  : d.status === "dropped" ? "dropped"
  : d.final === "" ? "enrolled"
  : Number(d.final) > 3 ? "failed" : "passed";

const KIND_NAME = { incomplete: "INC", dropped: "Dropped" };

// Each term is a card that opens and closes (the newest starts open), like "Completed" on the roadmap.
// For the secretary it also holds the grade editor.
export default function TermTable({ term, rows, canEdit, onSaved, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState(""); // what the last INC / Drop button did

  const savedDraft = () => Object.fromEntries(rows.map((r) => [r.enrollment_id, {
    midterm: r.midterm_grade ?? "", final: r.final_grade ?? "", finalBackup: "",
    status: r.status === "incomplete" || r.status === "dropped" ? r.status : "auto",
  }]));
  const start = () => { setDraft(savedDraft()); setEditing(true); setOpen(true); setError(""); setNote(""); };
  const set = (id, k, v) => setDraft((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));

  // INC / Drop for one row: pressing it again goes back to a normal graded class. The final grade is set aside
  // (not lost) while it is on, because INC and Dropped classes carry no final grade.
  const toggle = (r, kind) => {
    const d = draft[r.enrollment_id];
    if (d.status === kind) {
      setDraft((all) => ({ ...all, [r.enrollment_id]: { ...d, status: "auto", final: d.finalBackup || d.final, finalBackup: "" } }));
      setNote("");
      return;
    }
    const clears = d.final !== "";
    setDraft((all) => ({ ...all, [r.enrollment_id]: { ...d, status: kind, final: "", finalBackup: d.status === "auto" ? d.final : d.finalBackup } }));
    setNote(clears ? `${r.code}: the final grade ${Number(d.final).toFixed(2)} was set aside because ${KIND_NAME[kind]} subjects have no final grade. Press ${KIND_NAME[kind]} again to bring it back.` : "");
  };

  // Whole semester at once (someone who drops everything). Classes that already have a saved final grade are left alone,
  // and nothing is saved until "Save grades" is pressed.
  const markAll = (kind) => {
    let n = 0;
    let kept = 0;
    const next = { ...draft };
    for (const r of rows) {
      if (r.final_grade !== null) { kept += 1; continue; }
      next[r.enrollment_id] = { ...next[r.enrollment_id], status: kind, final: "", finalBackup: "" };
      n += 1;
    }
    setDraft(next);
    setNote(n === 0
      ? "Every subject here already has a final grade, so nothing changed."
      : `${n} ${n === 1 ? "subject" : "subjects"} set to ${KIND_NAME[kind]}${kept ? `; ${kept} with final grades ${kept === 1 ? "was" : "were"} left alone` : ""}. Nothing is saved until you press Save grades.`);
  };

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
    <select aria-label={label} className="field h-9 w-[118px] pl-3 pr-8 font-mono text-[13px]" value={draft[id][k]} onChange={(e) => set(id, k, e.target.value)}
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

  // What saving will do, in words (only while editing).
  const results = editing ? rows.map((r) => outcome(draft[r.enrollment_id])) : [];
  const tally = ["passed", "failed", "incomplete", "dropped", "enrolled"]
    .map((k) => [k, results.filter((x) => x === k).length]).filter(([, n]) => n > 0);
  const failing = results.filter((x) => x === "failed").length;

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

      {/* Only while encoding: whole-semester buttons live here, away from the normal view, so they can't be hit by accident. */}
      {editing && (
        <div className="no-print flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5 sm:px-5">
          <span className="text-[13px] font-semibold text-ink-2">Whole semester</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAll("dropped")}>Drop all</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => markAll("incomplete")}>Mark all INC</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDraft(savedDraft()); setNote(""); }}>Undo changes</button>
          {note && <p role="status" className="basis-full text-[13px] text-ink-2">{note}</p>}
        </div>
      )}

      <div className={`overflow-x-auto print:block ${open ? "" : "hidden"}`}>
        <table className="data-table">
          {/* Phones: code, units and status sit under the subject name so Midterm and Final always fit. */}
          <thead><tr><th className="hidden w-[128px] sm:table-cell">Course No.</th><th>Description</th><th className="hidden !text-center sm:table-cell">Units</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className={editing ? "" : "hidden sm:table-cell"}>{editing ? "Result" : "Status"}</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const bad = r.status === "failed";
              const d = editing ? draft[r.enrollment_id] : null;
              return (
                // Failed rows are tinted for the student only; the secretary just sees the red grade.
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
                      <td>
                        {/* The result shows live: it changes as the final grade or the INC / Drop buttons change. */}
                        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                          <span className="inline-flex min-w-[78px]"><StatusBadge status={outcome(d)} /></span>
                          <button type="button" className="toggle-btn" aria-pressed={d.status === "incomplete"} aria-label={`Mark ${r.code} as incomplete`} onClick={() => toggle(r, "incomplete")}>INC</button>
                          <button type="button" className="toggle-btn" aria-pressed={d.status === "dropped"} aria-label={`Mark ${r.code} as dropped`} onClick={() => toggle(r, "dropped")}>Drop</button>
                        </div>
                      </td>
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
        <div className="border-t border-line px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <div className="mr-auto min-w-0">
              <FormError error={error} />
              {/* What saving will do, so a failing grade is noticed before it is saved. */}
              <p role="status" className="text-[13px] text-ink-2">
                <span className="font-semibold text-ink">When saved: </span>
                {tally.map(([k, n], i) => <span key={k}>{i ? " · " : ""}{n} {STATUS_LABEL[k]}</span>)}
              </p>
              {failing > 0 && <p className="mt-0.5 text-[13px] font-semibold text-bad">{failing === 1 ? "1 class has a failing final grade (5.00)" : `${failing} classes have a failing final grade (5.00)`} and will be marked Failed.</p>}
              <p className="mt-0.5 text-[12px] text-ink-3">1.00 is highest, 3.00 is still passing, 5.00 fails. Passed and Failed follow the final grade; use INC or Drop for the rest.</p>
            </div>
            <div className="flex gap-2.5">
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save grades"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
