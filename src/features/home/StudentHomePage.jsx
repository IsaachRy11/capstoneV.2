import { Link, useOutletContext } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDeficiencies, getHistory, getStudent, getTermClasses } from "../../services/students";
import { getCurriculum, getPrerequisites, getPrograms } from "../../services/catalog";
import { ErrorState, LoadingState, StandingBadge } from "../../components/ui";
import { sumUnits, yearLabel } from "../../lib/format";
import { buildProgress, nextTermFor } from "../../lib/progress";
import TodayCard from "./TodayCard";
import ProgressCard from "./ProgressCard";

export default function StudentHome() {
  const { user } = useAuth();
  const { term, termLoading } = useOutletContext();

  const { data, error, loading, reload } = useAsync(async () => {
    if (termLoading) return null; // wait for the semester instead of loading everything twice
    const student = await getStudent(user.studentId);
    const [classes, deficiencies, curriculum, history, prerequisites, programs] = await Promise.all([
      term ? getTermClasses(user.studentId, term.id) : [],
      getDeficiencies(user.studentId),
      getCurriculum(student.program_code), getHistory(user.studentId), getPrerequisites(), getPrograms(),
    ]);
    const program = programs.find((p) => p.code === student.program_code);
    const progress = buildProgress({ curriculum, history, prerequisites });
    const next = program
      ? nextTermFor(term, student.year_level, program.duration_years, (y) => progress.subjects.some((x) => x.year_level === y && x.semester === 3))
      : null;
    return { student, classes, deficiencies, progress, next };
  }, [user.studentId, term?.id, termLoading], "home");

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <LoadingState />;

  const { student, classes, deficiencies, progress, next } = data;
  const active = classes.filter((c) => c.status !== "dropped");
  const units = sumUnits(active.map((c) => c.class_offerings.curriculum_subjects));

  return (
    <>
      <section className="card flex flex-col gap-6 p-7" style={{ borderTop: "4px solid var(--accent)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] text-ink-2">Welcome back,</span>
            <h1 className="text-[30px] font-bold tracking-tight">{student.full_name}</h1>
            <span className="text-[14px] text-ink-2"><span className="font-mono">{student.id}</span> · {student.program_name}</span>
          </div>
          <StandingBadge standing={student.standing} />
        </div>
        <dl className="stat-grid border-t border-line-2 pt-5">
          {[
            ["Year level", yearLabel(student.year_level)],
            ["Section", student.section_name || "Not registered"],
            ["Subjects this term", `${active.length} subjects`],
            ["Units this term", `${units} units`],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-[12px] font-semibold text-ink-3">{k}</dt><dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd></div>
          ))}
        </dl>
      </section>

      {/* Failed-subject status first: it is what the student most needs to know. */}
      {deficiencies.length === 0 ? (
        <section className="card flex items-center gap-3.5 px-5 py-4" style={{ background: "var(--ok-bg)", borderColor: "var(--ok-line)" }}>
          <CheckCircle2 size={22} className="shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold text-ok">No failed subjects</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">Every subject you've finished is passed.</p>
          </div>
        </section>
      ) : (
        <section className="card flex items-start gap-3.5 px-5 py-4" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)" }}>
          <AlertTriangle size={22} className="shrink-0 text-bad" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold text-bad">{deficiencies.length === 1 ? "1 failed subject" : `${deficiencies.length} failed subjects`}</h2>
            <ul className="mt-1 text-[14px] leading-relaxed text-ink-2">
              {deficiencies.map((d) => <li key={d.enrollment_id}><span className="font-mono">{d.code}</span> {d.title}</li>)}
            </ul>
            <p className="mt-2 text-[13px] text-ink-3">
              <Link to="/progress" className="font-semibold">See when they're offered again</Link>, then talk to the CCS office about retaking them.
            </p>
          </div>
        </section>
      )}

      {/* Today's classes and where the student stands in the program. The full week is on Schedule and
          the grades are on Academic record, so neither is repeated here. */}
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <TodayCard classes={classes} />
        <ProgressCard progress={progress} next={next} pos={{ year: student.year_level, semester: term.semester }} />
      </div>
    </>
  );
}
