import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Printer } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDeficiencies, getGradeChanges, getHistory, getStudent, updateStudentStatus } from "../../services/students";
import { Avatar, BackButton, ErrorState, FormError, GradeLegend, LoadingState, StandingBadge } from "../../components/ui";
import { STUDENT_STATUS, STUDENT_TYPE, semesterLabel, sumUnits, yearLabel } from "../../lib/format";
import TermTable from "./TermTable";
import GradeHistory from "./GradeHistory";

export default function StudentRecord() {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id || user.studentId;
  const isSecretary = user.role === "secretary";
  const [statusError, setStatusError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(async () => {
    const [student, history, deficiencies, changes] = await Promise.all([
      getStudent(id), getHistory(id), getDeficiencies(id), isSecretary ? getGradeChanges(id) : [],
    ]);
    return { student, history, deficiencies, changes };
  }, [id, isSecretary]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.student) {
    return <div className="card p-6 text-[14px] text-ink-2">No student with ID {id}. <Link to="/students">Back to students</Link></div>;
  }

  const { student, history, deficiencies, changes } = data;
  const changeStatus = async (status) => {
    setStatusError("");
    setStatusBusy(true);
    try {
      await updateStudentStatus(student.id, status);
      reload();
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusBusy(false);
    }
  };
  const terms = [...new Map(history.map((r) => [r.school_term_id, r])).values()]
    .sort((a, b) => (b.school_year + b.semester).localeCompare(a.school_year + a.semester));
  const current = history.filter((r) => r.is_current && r.status !== "dropped");
  const earned = sumUnits(history.filter((r) => r.status === "passed"));

  return (
    <>
      {isSecretary && (
        <div className="no-print -mb-2 flex flex-wrap items-center gap-x-4">
        <BackButton fallback="/students" />
        <nav aria-label="Breadcrumb" className="text-[14px] text-ink-3">
          <Link to="/students" className="inline-flex min-h-10 items-center text-ink-3 hover:text-ink">Students</Link><span className="px-1.5">/</span><span className="font-semibold text-ink">{student.full_name}</span>
        </nav>
        </div>
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
            ["Units this term", `${sumUnits(current)} units`],
            ["Units earned", `${earned} units`],
            ["Student type", STUDENT_TYPE[student.admission_type]],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-[12px] font-semibold text-ink-3">{k}</dt><dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd></div>
          ))}
          <div>
            <dt className="text-[12px] font-semibold text-ink-3"><label htmlFor="student-status">Student status</label></dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink">
              {isSecretary ? (
                <>
                  <select id="student-status" className="field no-print h-9 w-auto min-w-[150px] py-0 text-[14px]" value={student.status} disabled={statusBusy} onChange={(e) => changeStatus(e.target.value)}>
                    {Object.entries(STUDENT_STATUS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                  <span className="hidden print:inline">{STUDENT_STATUS[student.status]}</span>
                  {statusError && <div className="no-print mt-1.5 text-[13px] font-normal"><FormError error={statusError} /></div>}
                </>
              ) : STUDENT_STATUS[student.status]}
            </dd>
          </div>
          <div><dt className="text-[12px] font-semibold text-ink-3">Failed subjects</dt><dd className={`mt-1 text-[15px] font-semibold ${deficiencies.length ? "text-bad" : "text-ink"}`}>{deficiencies.length} {deficiencies.length === 1 ? "subject" : "subjects"}</dd></div>
        </dl>
      </section>

      {deficiencies.length > 0 && (
        <div role="alert" className="flex items-start gap-3.5 rounded-xl border px-5 py-4" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)" }}>
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <div className="text-[15px] font-bold text-bad">{deficiencies.length === 1 ? "1 failed subject" : `${deficiencies.length} failed subjects`} to resolve</div>
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

      {terms.length > 0 && <GradeLegend className="card px-5 py-3.5" />}
      {terms.length === 0 && <div className="card p-6 text-[14px] text-ink-3">No classes on record yet.</div>}
      {terms.map((t) => (
        <TermTable key={t.school_term_id} term={t} rows={history.filter((r) => r.school_term_id === t.school_term_id)} canEdit={isSecretary} onSaved={reload} />
      ))}

      {isSecretary && <GradeHistory changes={changes} />}
    </>
  );
}
