import { useOutletContext } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDeficiencies, getHistory, getStudent, getTermClasses } from "../../services/students";
import { getCurriculum, getPrerequisites, getPrograms } from "../../services/catalog";
import { ErrorState, LoadingState, StudentStatusBadge } from "../../components/ui";
import { sumUnits, yearLabel } from "../../lib/format";
import { buildProgress, nextTermFor } from "../../lib/progress";
import { useClassStatus } from "../../hooks/useCalendar";
import TodayCard from "./TodayCard";
import ProgressCard from "./ProgressCard";
import WelcomeBanner from "../../components/WelcomeBanner";
import ResolveNotice from "../students/ResolveNotice";

export default function StudentHome() {
  const { user } = useAuth();
  const { term, termLoading } = useOutletContext();
  const status = useClassStatus();

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
      <WelcomeBanner tone="c" seed={4} name={student.full_name}
        line={`${student.full_name} · ${student.id} · ${student.program_name}`}
        badge={<StudentStatusBadge student={student} />}
        facts={[
          ["Year level", yearLabel(student.year_level)],
          ["Section", student.section_name || "Not yet enrolled"],
          ["Subjects this term", `${active.length} subjects`],
          ["Units this term", `${units} units`],
        ]} />

      {/* Subjects to resolve first: it is what the student most needs to know. */}
      {deficiencies.length === 0 ? (
        <section className="card flex items-center gap-3.5 px-5 py-4" style={{ background: "var(--ok-bg)", borderColor: "var(--ok-line)" }}>
          <CheckCircle2 size={22} className="shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold text-ok">No subjects to resolve</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">Every subject you've finished is passed.</p>
          </div>
        </section>
      ) : <ResolveNotice items={deficiencies} />}

      {/* Today's classes and where the student stands in the program. The full week is on Schedule and
          the grades are on Academic record, so neither is repeated here. */}
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <TodayCard classes={classes} status={status} />
        <ProgressCard progress={progress} next={next} pos={{ year: student.year_level, semester: term.semester }} />
      </div>
    </>
  );
}
