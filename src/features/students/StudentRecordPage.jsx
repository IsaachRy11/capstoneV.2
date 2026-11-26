import { Link, useNavigate, useParams } from "react-router-dom";
import { KeyRound, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getCredits, getDeficiencies, getGradeChanges, getHistory, getStudent, getUnitLimit, updateStudentStatus, updateUnitLimit } from "../../services/students";
import { Avatar, ErrorState, FormError, GradeLegend, LoadingState, StudentStatusBadge } from "../../components/ui";
import { STUDENT_STATUS, isActiveStudent, studentStatusLabel, studentTypeLabel, sumUnits, yearLabel } from "../../lib/format";
import TermTable from "./TermTable";
import GradeHistory from "./GradeHistory";
import DeleteStudentModal from "./DeleteStudentModal";
import ResetPasswordModal from "./ResetPasswordModal";
import ResolveNotice from "./ResolveNotice";
import StatusChangeModal from "./StatusChangeModal";
import CreditedSubjects from "./CreditedSubjects";
import { termYear } from "../../lib/progress";

export default function StudentRecord() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const params = useParams();
  const id = params.id || user.studentId;
  const isSecretary = user.role === "secretary";
  const [statusError, setStatusError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [nextStatus, setNextStatus] = useState(null); // picked in the list, waiting for "yes"
  const [limitError, setLimitError] = useState("");

  const { data, error, loading, reload } = useAsync(async () => {
    const [student, history, deficiencies, changes, limit, credits] = await Promise.all([
      getStudent(id), getHistory(id), getDeficiencies(id), isSecretary ? getGradeChanges(id) : [], getUnitLimit(id), getCredits(id),
    ]);
    return { student, history, deficiencies, changes, limit, credits };
  }, [id, isSecretary], "record");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.student) {
    return <div className="card p-6 text-[14px] text-ink-2">No student with ID {id}. <Link to="/students">Back to students</Link></div>;
  }

  const { student, history, deficiencies, changes, limit, credits } = data;
  // The most units this student may take in a term; used when a new term starts. Saved when the field loses focus.
  const saveLimit = async (raw) => {
    const n = Number(raw);
    if (n === limit) return;
    if (!Number.isInteger(n) || n < 1 || n > 60) return setLimitError("Enter a whole number from 1 to 60.");
    setLimitError("");
    try {
      await updateUnitLimit(student.id, n);
      reload();
    } catch (err) {
      setLimitError(err.message);
    }
  };
  const changeStatus = async (status) => {
    setStatusError("");
    setStatusBusy(true);
    try {
      await updateStudentStatus(student.id, status);
      setNextStatus(null);
      reload();
    } catch (err) {
      setNextStatus(null);
      setStatusError(err.message);
    } finally {
      setStatusBusy(false);
    }
  };
  const terms = [...new Map(history.map((r) => [r.school_term_id, r])).values()]
    .sort((a, b) => (b.school_year + b.semester).localeCompare(a.school_year + a.semester));
  const current = history.filter((r) => r.is_current && r.status !== "dropped");
  // Units earned: passed here plus credited from before.
  const earned = sumUnits([...history.filter((r) => r.status === "passed"), ...credits.map((c) => c.curriculum_subjects)]);
  const active = isActiveStudent(student);
  // Credits are only for shiftees and transferees; the database enforces the same rule.
  const mayCredit = isSecretary && (student.admission_type === "transferee" || student.admission_type === "shiftee");

  return (
    <>
      {isSecretary && (
        <div className="no-print -mb-2 flex flex-wrap items-center gap-x-4">
        <nav aria-label="Breadcrumb" className="hidden text-[14px] text-ink-3 sm:block">
          <Link to="/students" className="inline-flex min-h-10 items-center text-ink-3 hover:text-ink">Students</Link><span className="px-1.5">/</span><span className="font-semibold text-ink">{student.full_name}</span>
        </nav>
        </div>
      )}

      <section className="card flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="sm:hidden"><Avatar name={student.full_name} size={52} /></span>
            <span className="hidden sm:block"><Avatar name={student.full_name} size={64} /></span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]">{student.full_name}</h1>
                <StudentStatusBadge student={student} />
              </div>
              <div className="text-[14px] text-ink-2"><span className="font-mono">{student.id}</span> · <span className="sm:hidden">{student.program_code}</span><span className="hidden sm:inline">{student.program_name}</span> · {yearLabel(student.year_level)}</div>
            </div>
          </div>
          {/* Secretary on phones and tablets: view only. Printing, password resets and deleting are done on a computer. */}
          <div className={`no-print flex-wrap gap-2 ${isSecretary ? "hidden lg:flex" : "flex"}`}>
            <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print record</button>
            {isSecretary && <button className="btn btn-secondary" onClick={() => setResetting(true)}><KeyRound size={16} aria-hidden="true" />Reset password</button>}
            {isSecretary && <button className="btn btn-secondary text-bad" onClick={() => setDeleting(true)}><Trash2 size={16} aria-hidden="true" />Delete student</button>}
          </div>
        </div>
        <dl className="stat-grid border-t border-line-2 pt-5">
          {[
            ["Section", active ? student.section_name || "Not yet enrolled" : "—"],
            ["Units this term", active ? `${sumUnits(current)} units` : "—"],
            ["Units earned", `${earned} units`],
            ...(limit && !isSecretary ? [["Unit limit", `${limit} units a term`]] : []),
            ["Student type", active ? studentTypeLabel(student) : "—"],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-[12px] font-semibold text-ink-3">{k}</dt><dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd></div>
          ))}
          <div>
            <dt className="text-[12px] font-semibold text-ink-3"><label htmlFor="student-status">Student status</label></dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink">
              {isSecretary ? (
                <>
                  <span className="lg:hidden print:hidden">{studentStatusLabel(student)}</span>
                  <select id="student-status" className="field no-print hidden h-9 w-full max-w-[180px] py-0 text-[14px] lg:block" value={student.status} disabled={statusBusy} onChange={(e) => setNextStatus(e.target.value)}>
                    {Object.entries(STUDENT_STATUS).filter(([k]) => k !== "inactive" || student.status === "inactive").map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                  <span className="hidden print:inline">{studentStatusLabel(student)}</span>
                  {student.status === "active" && <span className="no-print mt-1 hidden text-[12px] font-normal text-ink-3 lg:block">Now {studentStatusLabel(student)}, set automatically from grades.</span>}
                  {statusError && <div className="no-print mt-1.5 text-[13px] font-normal"><FormError error={statusError} /></div>}
                </>
              ) : studentStatusLabel(student)}
            </dd>
          </div>
          {limit && isSecretary && (
            <div>
              <dt className="text-[12px] font-semibold text-ink-3"><label htmlFor="unit-limit">Unit limit</label></dt>
              <dd className="mt-1 text-[15px] font-semibold text-ink">
                <span className="lg:hidden print:inline">{limit} units a term</span>
                <span className="no-print hidden items-center gap-2 lg:flex">
                  <input id="unit-limit" type="number" min={1} max={60} key={limit} defaultValue={limit} onBlur={(e) => saveLimit(e.target.value)}
                    className="field h-9 w-[84px] py-0 font-mono text-[14px]" />
                  <span className="text-[13px] font-normal text-ink-3">units a term</span>
                </span>
                {limitError && <div className="no-print mt-1.5 text-[13px] font-normal"><FormError error={limitError} /></div>}
              </dd>
            </div>
          )}
          <div><dt className="text-[12px] font-semibold text-ink-3">Subjects to resolve</dt><dd className={`mt-1 text-[15px] font-semibold ${deficiencies.length ? "text-bad" : "text-ink"}`}>{deficiencies.length} {deficiencies.length === 1 ? "subject" : "subjects"}</dd></div>
        </dl>
      </section>

      {/* The secretary sees failed subjects as red rows in the grades; only the student gets the summary notice. */}
      {!isSecretary && deficiencies.length > 0 && <ResolveNotice items={deficiencies} detailed />}

      {terms.length > 0 && <GradeLegend className="no-print card px-5 py-3.5" />}
      {terms.length === 0 && credits.length === 0 && <div className="card p-6 text-[14px] text-ink-3">No classes on record yet.</div>}
      <CreditedSubjects student={student} history={history} credits={credits} canAdd={mayCredit && active} canRemove={mayCredit && active} onSaved={reload} />
      {/* On paper the terms sit in two columns so the whole record fits one page. */}
      <div className="record-terms flex flex-col gap-4 sm:gap-6">
        {terms.map((t, i) => (
          <TermTable key={t.school_term_id} defaultOpen={i === 0} term={t} year={termYear(history, t, credits)} rows={history.filter((r) => r.school_term_id === t.school_term_id)} canEdit={isSecretary} onSaved={reload} />
        ))}
      </div>

      {isSecretary && <GradeHistory changes={changes} />}
      {nextStatus && <StatusChangeModal student={student} history={history} credits={credits} status={nextStatus} busy={statusBusy} onClose={() => setNextStatus(null)} onConfirm={() => changeStatus(nextStatus)} />}
      {resetting && <ResetPasswordModal student={student} onClose={() => setResetting(false)} />}
      {deleting && <DeleteStudentModal student={student} onClose={() => setDeleting(false)} onDeleted={() => navigate("/students", { replace: true })} />}
    </>
  );
}
