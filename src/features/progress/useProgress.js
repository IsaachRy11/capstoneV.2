import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getHistory, getStudent } from "../../services/students";
import { getCurriculum, getPrerequisites, getPrograms } from "../../services/catalog";
import { buildProgress, futureTerms, nextTermFor } from "../../lib/progress";

// Everything the two tracker pages (This semester, Roadmap) need, loaded once and shared by cache key:
// the student, their program, per-subject progress, the semesters still ahead and the next one.
export function useProgress() {
  const { user } = useAuth();
  const { term, termLoading } = useOutletContext();
  const state = useAsync(async () => {
    const student = await getStudent(user.studentId);
    const [curriculum, history, prerequisites, programs] = await Promise.all([
      getCurriculum(student.program_code), getHistory(user.studentId), getPrerequisites(), getPrograms(),
    ]);
    const program = programs.find((p) => p.code === student.program_code);
    return { student, program, progress: buildProgress({ curriculum, history, prerequisites }) };
  }, [user.studentId], "progress");

  const { data } = state;
  let derived = null;
  if (data && term) {
    const { student, program, progress } = data;
    const hasSummer = (y) => progress.subjects.some((s) => s.year_level === y && s.semester === 3);
    derived = {
      term,
      next: nextTermFor(term, student.year_level, program.duration_years, hasSummer),
      ahead: futureTerms(progress.subjects, student.year_level, term.semester),
    };
  }
  return { ...state, data: data && derived ? { ...data, ...derived } : null, loading: state.loading || termLoading || (!!data && !derived && !state.error) };
}
