import { Link } from "react-router-dom";
import { CalendarDays, Monitor } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useSectionPicker } from "../../hooks/useSectionPicker";
import { getRooms, getSectionOfferings } from "../../services/sections";
import SectionPicker from "../../components/SectionPicker";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { sumUnits, yearLabel } from "../../lib/format";
import ClassTimes from "./ClassTimes";

// Secretary: add, change or remove when and where each subject of a section meets (Schedules > Edit class times).
// Desktop only, like every edit: phones and tablets get a note and a way back to the timetable.
export default function ClassTimesPage() {
  const picker = useSectionPicker();
  const { program, year, summer, section } = picker;
  const rooms = useAsync(getRooms, [], "rooms");
  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id], "schedule-offerings");

  if (picker.loading || rooms.loading) return <LoadingState />;
  if (picker.error || rooms.error) {
    return <ErrorState error={picker.error || rooms.error} onRetry={() => { picker.reload(); rooms.reload(); }} />;
  }

  return (
    <>
      <PageHeader title="Edit class times"
        actions={<Link to="/schedules" className="btn btn-secondary no-print hidden lg:inline-flex"><CalendarDays size={16} aria-hidden="true" />View timetable</Link>} />

      <p className="no-print flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Class times are changed on a computer. <Link to="/schedules" className="font-semibold">See the timetable</Link> instead.</span>
      </p>

      <div className="hidden flex-col gap-4 lg:flex">
        <SectionPicker picker={picker} />
        {!section ? (
          <div className="card"><EmptyState>No {program.code} {summer ? "Summer" : yearLabel(year)} section this semester.</EmptyState></div>
        ) : offerings.loading ? (
          <div className="card"><LoadingState variant="list" /></div>
        ) : offerings.error ? (
          <ErrorState error={offerings.error} onRetry={offerings.reload} />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-[19px] font-bold">{section.name}</h2>
              <span className="text-[14px] text-ink-3">
                {offerings.data.length} {offerings.data.length === 1 ? "subject" : "subjects"} · {sumUnits(offerings.data.map((o) => o.curriculum_subjects))} units
              </span>
            </div>
            <ClassTimes offerings={offerings.data} rooms={rooms.data} onChanged={offerings.reload} />
          </>
        )}
      </div>
    </>
  );
}
