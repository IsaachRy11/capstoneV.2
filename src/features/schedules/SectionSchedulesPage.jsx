import { Link } from "react-router-dom";
import { Pencil, Printer } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useSectionPicker } from "../../hooks/useSectionPicker";
import { getSectionOfferings } from "../../services/sections";
import SectionPicker from "../../components/SectionPicker";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { sumUnits, yearLabel } from "../../lib/format";
import CalendarNotice from "../../components/CalendarNotice";
import { useClassStatus } from "../../hooks/useCalendar";
import WeekTimetable from "./WeekTimetable";

// Secretary: weekly timetable of each block section (current semester). Changing class times is on its own page
// (Schedules > Edit class times), so this one is only for looking and printing.
export default function SectionSchedules() {
  const picker = useSectionPicker();
  const { program, year, summer, section } = picker;
  const status = useClassStatus();
  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id], "schedule-offerings");

  if (picker.loading) return <LoadingState />;
  if (picker.error) return <ErrorState error={picker.error} onRetry={picker.reload} />;

  const items = (offerings.data || []).map((o) => ({
    id: o.id,
    code: o.curriculum_subjects.code,
    title: o.curriculum_subjects.title,
    units: o.curriculum_subjects.units,
    meetings: o.class_meetings,
  }));

  return (
    <>
      <PageHeader title="Schedules"
        actions={<>
          {items.length > 0 && <button className="btn btn-secondary no-print hidden lg:inline-flex" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print schedule</button>}
          <Link to="/schedules/edit" className="btn btn-secondary no-print hidden lg:inline-flex"><Pencil size={16} aria-hidden="true" />Edit class times</Link>
        </>} />

      <CalendarNotice status={status} />

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
            <span className="text-[13px] text-ink-3 sm:text-[14px]">
              {items.length} {items.length === 1 ? "subject" : "subjects"} · {sumUnits(items)} units · {section.home_room || "Room TBA"} · {section.enrolled} of {section.capacity} seats filled
            </span>
          </div>
          <WeekTimetable items={items} emptyText="No classes scheduled for this section yet." />
        </>
      )}
    </>
  );
}
