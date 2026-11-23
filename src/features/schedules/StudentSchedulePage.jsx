import { useOutletContext } from "react-router-dom";
import { Printer } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getTermClasses } from "../../services/students";
import { ErrorState, LoadingState, PageHeader } from "../../components/ui";
import CalendarNotice from "../../components/CalendarNotice";
import { useClassStatus } from "../../hooks/useCalendar";
import WeekTimetable from "./WeekTimetable";

// Student's own weekly timetable for the current semester.
export default function Schedule() {
  const { user } = useAuth();
  const { term, termLoading } = useOutletContext();
  const { data: classes, error, loading, reload } = useAsync(
    () => (term ? getTermClasses(user.studentId, term.id) : Promise.resolve([])),
    [user.studentId, term?.id], "my-schedule"
  );

  const status = useClassStatus();

  if (loading || termLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const items = classes
    .filter((c) => c.status !== "dropped")
    .map((c) => ({
      id: c.id,
      code: c.class_offerings.curriculum_subjects.code,
      title: c.class_offerings.curriculum_subjects.title,
      meetings: c.class_offerings.class_meetings,
    }));

  return (
    <>
      <PageHeader title="Class schedule"
        actions={items.some((i) => i.meetings.length) && <button className="btn btn-secondary no-print hidden sm:inline-flex" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print schedule</button>} />
      <CalendarNotice status={status} />
      <WeekTimetable items={items} todaySummary={status?.kind !== "none"} />
      {items.some((i) => !i.meetings.length) && <p className="text-[13px] text-ink-3">Ask the CCS Secretary's Office about classes without a fixed schedule.</p>}
    </>
  );
}
