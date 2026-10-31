import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Pencil, Printer } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getHistory, getSectionInfo, getStudent, updateGrade } from "../services/students";
import { supabase, unwrap } from "../lib/supabase";
import { Avatar, Badge, ErrorState, FormError, LoadingState, StandingBadge, StatusBadge } from "../components/ui";
import { GRADE_OPTIONS, formatGrade, semesterLabel, sumUnits, yearLabel } from "../lib/format";

const ADMISSION = { new: "New student", transferee: "Transferee", shiftee: "Shiftee", returnee: "Returnee" };

function TermTable({ term, rows, canEdit, onSaved }) {
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
      await Promise.all(changed.map((r) => {
        const d = draft[r.enrollment_id];
        return updateGrade(r.enrollment_id, { midterm: d.midterm === "" ? null : Number(d.midterm), final: d.final === "" ? null : Number(d.final), status: d.status });
      }));
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

export default function StudentRecord() {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id || user.studentId;
  const isSecretary = user.role === "secretary";

  const { data, error, loading, reload } = useAsync(async () => {
    const [student, history, deficiencies] = await Promise.all([
      getStudent(id), getHistory(id),
      unwrap(supabase.from("v_student_deficiencies").select("enrollment_id, code, title, status, final_grade, school_year, semester, curriculum_year").eq("student_id", id)),
    ]);
    const section = student ? await getSectionInfo(student.section_id) : null;
    return { student, history, deficiencies, section };
  }, [id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.student) {
    return <div className="card p-6 text-[14px] text-ink-2">No student with ID {id}. <Link to="/students">Back to students</Link></div>;
  }

  const { student, history, deficiencies, section } = data;
  const terms = [...new Map(history.map((r) => [r.school_term_id, r])).values()]
    .sort((a, b) => (b.school_year + b.semester).localeCompare(a.school_year + a.semester));
  const current = history.filter((r) => r.is_current && r.status !== "dropped");
  const earned = sumUnits(history.filter((r) => r.status === "passed"));

  return (
    <>
      {isSecretary && (
        <nav aria-label="Breadcrumb" className="no-print -mb-2 text-[14px] text-ink-3">
          <Link to="/students" className="text-ink-3 hover:text-ink">Students</Link><span className="px-1.5">/</span><span className="font-semibold text-ink">{student.full_name}</span>
        </nav>
      )}

      <section className="card flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={student.full_name} size={64} />
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[26px] font-bold tracking-tight">{student.full_name}</h1>
                <StandingBadge standing={student.standing} />
              </div>
              <div className="text-[14px] text-ink-2"><span className="font-mono">{student.id}</span> · {student.program_name} · {yearLabel(student.year_level)}</div>
            </div>
          </div>
          <button className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print record</button>
        </div>
        <dl className="grid gap-4 border-t border-line-2 pt-5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          {[
            ["Section", student.section_name || "Not registered"],
            ["Home room", section?.rooms?.name || "TBA"],
            ["Units this term", `${sumUnits(current)} units`],
            ["Units earned", `${earned} units`],
            ["Admission", ADMISSION[student.admission_type]],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-[12px] font-semibold text-ink-3">{k}</dt><dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd></div>
          ))}
          <div><dt className="text-[12px] font-semibold text-ink-3">Back subjects</dt><dd className={`mt-1 text-[15px] font-semibold ${deficiencies.length ? "text-bad" : "text-ink"}`}>{deficiencies.length}</dd></div>
        </dl>
      </section>

      {deficiencies.length > 0 && (
        <div role="alert" className="flex items-start gap-3.5 rounded-xl border px-5 py-4" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)" }}>
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <div className="text-[15px] font-bold text-bad">{deficiencies.length === 1 ? "1 back subject" : `${deficiencies.length} back subjects`} to resolve</div>
            <ul className="text-[14px] leading-relaxed text-ink-2">
              {deficiencies.map((d) => (
                <li key={d.enrollment_id}>
                  <span className="font-mono">{d.code}</span> {d.title}: {d.status === "failed" ? "failed (5.00)" : d.status === "incomplete" ? "incomplete (INC)" : "dropped"} in {yearLabel(d.curriculum_year)}, {semesterLabel(d.semester)}, SY {d.school_year.replace("-", "–")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {terms.length === 0 && <div className="card p-6 text-[14px] text-ink-3">No classes on record yet.</div>}
      {terms.map((t) => (
        <TermTable key={t.school_term_id} term={t} rows={history.filter((r) => r.school_term_id === t.school_term_id)} canEdit={isSecretary} onSaved={reload} />
      ))}
    </>
  );
}
