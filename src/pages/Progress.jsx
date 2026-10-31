import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { GraduationCap, TriangleAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getHistory, getStudent } from "../services/students";
import { getCurriculum, getPrerequisites, getPrograms } from "../services/catalog";
import { Badge, ErrorState, GradeLegend, LoadingState, PageHeader } from "../components/ui";
import { formatGrade, semesterLabel, sumUnits, yearLabel } from "../lib/format";
import { SUBJECT_STATE, buildProgress, midtermWarning, nextTermFor } from "../lib/progress";

const FILTERS = [["all", "All"], ["passed", "Passed"], ["in_progress", "Taking now"], ["back", "Back subjects"], ["not_taken", "Not yet taken"]];

function Stat({ label, value, sub, children }) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <span className="font-display text-[30px] font-bold tracking-tight text-ink">{value}</span>
      {sub && <span className="text-[13px] text-ink-3">{sub}</span>}
      {children}
    </div>
  );
}

const dash = <span className="text-ink-3">—</span>;

function MidtermCell({ s }) {
  if (s.midterm === null) return dash;
  const w = s.state === "in_progress" ? midtermWarning(s.midterm) : null;
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-2">
      <span className={`font-mono font-semibold ${Number(s.midterm) > 3 ? "text-bad" : ""}`}>{formatGrade(s.midterm)}</span>
      {w && <Badge tone={w.level}>{w.text}</Badge>}
    </span>
  );
}

function FinalCell({ s }) {
  if (s.state === "back" && s.backReason !== "Failed") return <span className="font-semibold text-bad">{s.backReason}</span>;
  if (s.final === null) return dash;
  return <span className={`font-mono font-semibold ${Number(s.final) > 3 ? "text-bad" : ""}`}>{formatGrade(s.final)}</span>;
}

export default function Progress() {
  const { user } = useAuth();
  const { term } = useOutletContext();
  const [filter, setFilter] = useState("all");

  const { data, error, loading, reload } = useAsync(async () => {
    const student = await getStudent(user.studentId);
    const [curriculum, history, prerequisites, programs] = await Promise.all([
      getCurriculum(student.program_code), getHistory(user.studentId), getPrerequisites(), getPrograms(),
    ]);
    const program = programs.find((p) => p.code === student.program_code);
    return { student, program, progress: buildProgress({ curriculum, history, prerequisites }) };
  }, [user.studentId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { student, program, progress } = data;
  const pct = progress.totalUnits ? Math.round((progress.unitsEarned / progress.totalUnits) * 100) : 0;
  const next = nextTermFor(term, student.year_level, program.duration_years);
  const nextRegular = next ? progress.subjects.filter((s) => s.year_level === next.year && s.semester === next.semester) : [];
  const retakeNext = next ? progress.back.filter((s) => s.semester === next.semester) : [];
  const years = [...new Set(progress.subjects.map((s) => s.year_level))].sort();
  const visible = (s) => filter === "all" || s.state === filter;

  return (
    <>
      <PageHeader title="Subject tracker" subtitle={`${student.program_name} · where you stand on every subject in your curriculum`} />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Stat label="Units earned" value={<>{progress.unitsEarned}<span className="text-[17px] font-semibold text-ink-3"> / {progress.totalUnits}</span></>} sub={`${pct}% of your program`}>
          <div className="bar" role="img" aria-label={`${pct} percent of units earned`}><span style={{ width: `${pct}%` }} /></div>
        </Stat>
        <Stat label="Subjects passed" value={<>{progress.passedCount}<span className="text-[17px] font-semibold text-ink-3"> / {progress.total}</span></>} sub="Out of every subject in your curriculum" />
        <Stat label="This semester" value={<>{progress.inProgress.length}<span className="text-[17px] font-semibold text-ink-3"> {progress.inProgress.length === 1 ? "subject" : "subjects"}</span></>} sub={`${sumUnits(progress.inProgress)} units in total`} />
        <Stat label="Back subjects" value={<span className={progress.back.length ? "text-bad" : ""}>{progress.back.length}</span>} sub={progress.back.length ? "Need to be retaken" : "None. Keep it up."} />
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[17px] font-bold">{next ? `Next semester: ${yearLabel(next.year)}, ${semesterLabel(next.semester)}` : "Next semester"}</h2>
            <p className="mt-1 text-[13px] text-ink-3">Based on your curriculum. The CCS office confirms your final load at enrollment.</p>
          </div>
        </div>
        {!next ? (
          <div className="flex items-center gap-3 px-5 py-5 text-[14px] text-ink-2">
            <GraduationCap size={20} className="text-accent" aria-hidden="true" />
            This is the last semester of your program. Clear any back subjects to finish on time.
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-5 py-5">
            {retakeNext.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ background: "var(--bad-bg)" }}>
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
                <p className="text-[14px] text-ink-2">
                  <span className="font-semibold text-bad">Offered again next semester: </span>
                  {retakeNext.map((s) => `${s.code} ${s.title}`).join(", ")}. Ask the CCS office about adding {retakeNext.length === 1 ? "it" : "them"} to your load.
                </p>
              </div>
            )}
            <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
              {nextRegular.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg border border-line-2 bg-surface-2 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] text-accent">{s.code}</span>
                    <span className="block text-[14px] font-medium text-ink">{s.title}</span>
                    {s.missingPrereqs.length > 0 && <span className="mt-1 block text-[12px] text-warn">Needs {s.missingPrereqs.map((p) => p.code).join(", ")} first</span>}
                  </span>
                  <span className="whitespace-nowrap text-[13px] text-ink-2">{Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-ink-3">{nextRegular.length} subjects · {sumUnits(nextRegular)} units</p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3">
        <div className="seg self-start overflow-x-auto" role="group" aria-label="Show subjects">
          {FILTERS.map(([k, label]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>)}
        </div>
        <GradeLegend warnings className="card px-5 py-3.5" />
      </div>

      {years.map((y) => {
        const yearSubjects = progress.subjects.filter((s) => s.year_level === y && visible(s));
        if (!yearSubjects.length) return null;
        return (
          <section key={y} className="flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">{yearLabel(y)}</h2>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
              {[1, 2, 3].map((sem) => {
                const rows = yearSubjects.filter((s) => s.semester === sem);
                if (!rows.length) return null;
                return (
                  <div key={sem} className="card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                      <h3 className="text-[15px] font-bold">{semesterLabel(sem)}</h3>
                      <span className="text-[13px] text-ink-3">{rows.filter((r) => r.state === "passed").length} of {rows.length} passed</span>
                    </div>
                    <table className="data-table">
                      <thead><tr><th>Subject</th><th>Status</th><th className="!text-center">Midterm</th><th className="!text-center">Final</th></tr></thead>
                      <tbody>
                        {rows.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <span className="block font-mono text-[13px] text-accent">{s.code}</span>
                              <span className="block font-medium">{s.title}</span>
                              {s.state === "not_taken" && s.missingPrereqs.length > 0 && (
                                <span className="mt-0.5 block text-[12px] text-warn">Needs {s.missingPrereqs.map((p) => p.code).join(", ")} first</span>
                              )}
                              {s.state === "back" && s.attempts > 1 && <span className="mt-0.5 block text-[12px] text-ink-3">{s.attempts} attempts</span>}
                            </td>
                            <td><Badge tone={SUBJECT_STATE[s.state].tone} dot>{SUBJECT_STATE[s.state].label}</Badge></td>
                            <td className="text-center text-[13px]"><MidtermCell s={s} /></td>
                            <td className="text-center text-[13px]"><FinalCell s={s} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {filter !== "all" && !progress.subjects.some(visible) && (
        <div className="card px-5 py-10 text-center text-[14px] text-ink-3">No subjects in this group.</div>
      )}
    </>
  );
}
