import { useState } from "react";
import { Printer } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useSectionPicker } from "../../hooks/useSectionPicker";
import { getRooms, getSectionOfferings } from "../../services/sections";
import SectionPicker from "../../components/SectionPicker";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { sumUnits, yearLabel } from "../../lib/format";
import WeekTimetable from "./WeekTimetable";
import ClassTimes from "./ClassTimes";

// Secretary: weekly timetable of each block section (current semester), with class-time editing.
export default function SectionSchedules() {
  const picker = useSectionPicker();
  const [tab, setTab] = useState("week"); // phones: "week" timetable or "times" editor, one at a time
  const { program, year, section } = picker;
  const rooms = useAsync(getRooms, [], "rooms");
  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id], "schedule-offerings");

  if (picker.loading || rooms.loading) return <LoadingState />;
  if (picker.error || rooms.error) {
    return <ErrorState error={picker.error || rooms.error} onRetry={() => { picker.reload(); rooms.reload(); }} />;
  }

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
        actions={items.length > 0 && <button className="btn btn-secondary no-print hidden lg:inline-flex" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print schedule</button>} />

      <SectionPicker picker={picker} />

      {!section ? (
        <div className="card"><EmptyState>No {program.code} {yearLabel(year)} section this semester.</EmptyState></div>
      ) : offerings.loading ? (
        <LoadingState />
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
          {/* Phones: one view at a time instead of the timetable and the editor stacked into one long page. */}
          <div className="seg seg-fill no-print sm:hidden" role="group" aria-label="View">
            <button aria-pressed={tab === "week"} onClick={() => setTab("week")}>Week</button>
            <button aria-pressed={tab === "times"} onClick={() => setTab("times")}>Class times</button>
          </div>
          <div className={`flex-col gap-4 sm:flex sm:gap-6 ${tab === "week" ? "flex" : "hidden"}`}>
            <WeekTimetable items={items} emptyText="No classes scheduled for this section yet." />
          </div>
          <div className={`sm:block ${tab === "times" ? "block" : "hidden"}`}>
            <ClassTimes offerings={offerings.data} rooms={rooms.data} onChanged={offerings.reload} />
          </div>
        </>
      )}
    </>
  );
}
