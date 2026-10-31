import { useState } from "react";
import { Printer } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { getPrograms } from "../services/catalog";
import { getSectionOfferings, listCurrentSections } from "../services/sections";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";
import WeekTimetable from "../components/WeekTimetable";
import { sumUnits, yearLabel } from "../lib/format";

// Secretary: weekly timetable of each block section, current semester only.
export default function SectionSchedules() {
  const [programCode, setProgramCode] = useState(null);
  const [year, setYear] = useState(1);

  const base = useAsync(async () => {
    const [programs, sections] = await Promise.all([getPrograms(), listCurrentSections()]);
    return { programs, sections };
  }, []);

  const program = base.data?.programs.find((p) => p.code === programCode) || base.data?.programs[0];
  const section = base.data?.sections.find((s) => s.program_code === program?.code && s.year_level === year);
  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id]);

  if (base.loading) return <LoadingState />;
  if (base.error) return <ErrorState error={base.error} onRetry={base.reload} />;

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
        actions={items.length > 0 && <button className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print schedule</button>} />

      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="seg" role="group" aria-label="Program">
          {base.data.programs.map((p) => (
            <button key={p.code} aria-pressed={p.code === program.code} onClick={() => { setProgramCode(p.code); if (year > p.duration_years) setYear(1); }}>{p.code}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Year level">
          {Array.from({ length: program.duration_years }, (_, i) => i + 1).map((y) => (
            <button key={y} aria-pressed={y === year} onClick={() => setYear(y)}>{yearLabel(y)}</button>
          ))}
        </div>
      </div>

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
            <span className="text-[14px] text-ink-3">
              {items.length} {items.length === 1 ? "subject" : "subjects"} · {sumUnits(items)} units · {section.home_room || "Room TBA"} · {section.enrolled} of {section.capacity} seats filled
            </span>
          </div>
          <WeekTimetable items={items} emptyText="No classes scheduled for this section yet." />
        </>
      )}
    </>
  );
}
