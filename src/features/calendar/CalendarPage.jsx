import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getCalendarEvents, getTerms } from "../../services/catalog";
import { semesterLabel, termLabel } from "../../lib/format";
import { EVENT_KINDS, WEEKDAYS, addMonths, dateSpan, daysLeft, eventRanges, eventsInMonth, eventsOn, monthCells, sameDay, startOfMonth, termOn, termRanges, upcoming } from "../../lib/calendar";
import { BackButton, EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";

// Full-page academic calendar: the official school calendar (exams, holidays, breaks, activities) on top of the
// term dates from school_terms, and today. Nothing here is invented: every entry comes from the database.
const fmt = (d, opts) => d.toLocaleDateString("en-PH", opts);

// Where the current semester stands today, in words.
function semesterStatus(range, today) {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (day < range.start) return `Starts ${fmt(range.start, { month: "long", day: "numeric" })}`;
  if (day > range.end) return `Ended ${fmt(range.end, { month: "long", day: "numeric" })}`;
  const n = daysLeft(range, today);
  return n === 0 ? "Ends today" : `${n} ${n === 1 ? "day" : "days"} left`;
}

export default function CalendarPage() {
  const { term } = useOutletContext();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const { data, error, loading, reload } = useAsync(async () => {
    const [terms, events] = await Promise.all([getTerms(), getCalendarEvents()]);
    return { terms, events };
  }, [], "calendar");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const ranges = termRanges(data.terms);
  const events = eventRanges(data.events);
  // Terms whose school year has an official calendar get their start/end from it; older years still show the term dates.
  const officialYears = new Set(data.events.map((e) => e.school_year));
  const looseTerms = ranges.filter((r) => !officialYears.has(r.school_year));
  const cells = monthCells(month);
  const current = ranges.find((r) => r.is_current);
  const isThisMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
  const termMarks = (d) => looseTerms.flatMap((r) => [
    ...(sameDay(d, r.start) ? [`${semesterLabel(r.semester)} starts`] : []),
    ...(sameDay(d, r.end) ? [`${semesterLabel(r.semester)} ends`] : []),
  ]);
  const inMonth = eventsInMonth(events, month);
  const next = upcoming(events, today, 5);

  return (
    <>
      <BackButton fallback="/" />
      <PageHeader title="Calendar" subtitle={term ? `Current term: ${termLabel(term)}` : "Academic calendar"} />

      <div className="flex flex-wrap items-start gap-5">
        <section className="card min-w-0 flex-[999_1_640px] overflow-hidden" aria-label="Month calendar">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
            <h2 className="mr-auto font-display text-[20px] font-bold text-ink">{fmt(month, { month: "long", year: "numeric" })}</h2>
            {!isThisMonth && <button className="btn btn-secondary btn-sm" onClick={() => setMonth(startOfMonth(today))}>Today</button>}
            <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 border-b border-line bg-surface-2">
            {WEEKDAYS.map((w) => <div key={w} className="px-2 py-2 text-center text-[12px] font-semibold text-ink-3">{w}</div>)}
          </div>
          <div className="grid grid-cols-7" role="grid">
            {cells.map((d, i) => {
              const here = d.getMonth() === month.getMonth();
              const t = termOn(ranges, d);
              const isToday = sameDay(d, today);
              const dayEvents = eventsOn(events, d);
              const marks = termMarks(d);
              const shown = dayEvents.slice(0, 2);
              const more = dayEvents.length - shown.length;
              return (
                <div key={d.toISOString()} role="gridcell"
                  aria-label={`${fmt(d, { weekday: "long", month: "long", day: "numeric" })}${t ? `, ${semesterLabel(t.semester)}` : ""}${dayEvents.map((e) => `, ${e.title}`).join("")}${marks.map((m) => `, ${m}`).join("")}${isToday ? ", today" : ""}`}
                  className={`flex min-h-[56px] flex-col gap-1 border-line p-1.5 sm:min-h-[112px] sm:p-2 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${t && here ? "bg-tint" : ""} ${here ? "" : "opacity-45"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${isToday ? "font-bold text-white" : t ? "font-semibold text-ink" : "text-ink-2"}`}
                    style={isToday ? { background: "var(--btn)" } : undefined}>
                    {d.getDate()}
                  </span>
                  {here && shown.map((e) => (
                    <span key={e.id} title={e.title} className={`hidden truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold sm:block tone-${EVENT_KINDS[e.kind].tone}`}>{e.title}</span>
                  ))}
                  {here && more > 0 && <span className="hidden px-1 text-[11px] font-semibold text-ink-3 sm:block">+{more} more</span>}
                  {here && marks.map((m) => (
                    <span key={m} className="hidden truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white sm:block" style={{ background: "var(--btn)" }}>{m}</span>
                  ))}
                  {here && (dayEvents.length > 0 || marks.length > 0) && (
                    <span className="mx-auto flex gap-0.5 sm:hidden" aria-hidden="true">
                      {dayEvents.slice(0, 3).map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full tone-${EVENT_KINDS[e.kind].tone}`} style={{ background: "currentColor" }} />)}
                      {marks.length > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--btn)" }} />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[12px] text-ink-3 sm:px-5" aria-label="Legend">
            <span className="font-semibold uppercase tracking-[0.08em]">Legend</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-tint ring-1 ring-line" />Semester days</span>
            {Object.entries(EVENT_KINDS).filter(([k]) => data.events.some((e) => e.kind === k)).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-5 rounded tone-${v.tone}`} style={{ background: "currentColor" }} />{v.label}</span>)}
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--btn)" }} />Today</span>
          </div>

          {/* The month's entries as a list: the cells are small, and phones can't show labels in them at all. */}
          <div className="border-t border-line">
            <h3 className="px-4 pt-3 text-[13px] font-semibold text-ink-3 sm:px-5">In {fmt(month, { month: "long", year: "numeric" })}</h3>
            {inMonth.length === 0 ? (
              <p className="px-4 pb-4 pt-1 text-[13px] text-ink-3 sm:px-5">Nothing on the school calendar this month.</p>
            ) : (
              <ul className="flex flex-col px-2 pb-2 pt-1">
                {inMonth.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px]">
                    <span className="w-[88px] shrink-0 font-mono text-[12px] font-semibold text-ink-2">{dateSpan(e)}</span>
                    <span className="min-w-0 flex-1 font-medium text-ink">{e.title}</span>
                    <span className={`badge tone-${EVENT_KINDS[e.kind].tone} hidden sm:inline-flex`}>{EVENT_KINDS[e.kind].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="flex flex-[1_1_280px] flex-col gap-5">
          {current && (
            <section className="card p-5">
              <h2 className="text-[13px] font-semibold text-ink-3">This semester</h2>
              <p className="mt-1 font-display text-[18px] font-bold text-ink">{termLabel(current)}</p>
              <p className="mt-1 text-[14px] text-ink-2">{fmt(current.start, { month: "long", day: "numeric" })} – {fmt(current.end, { month: "long", day: "numeric", year: "numeric" })}</p>
              <p className="mt-3 text-[14px] font-semibold text-ink">{semesterStatus(current, today)}</p>
            </section>
          )}
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-bold text-ink">Coming up</h2>
            {next.length === 0 ? <EmptyState>No upcoming dates on the school calendar.</EmptyState> : (
              <ul className="flex flex-col p-2">
                {next.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setMonth(startOfMonth(e.start))} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover">
                      <Flag size={14} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-ink">{e.title}</span>
                        <span className="block text-[12px] text-ink-3">{dateSpan(e)}{e.start.getFullYear() !== today.getFullYear() ? `, ${e.start.getFullYear()}` : ""}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-bold text-ink">All terms</h2>
            {ranges.length === 0 ? <EmptyState>No term dates have been set yet.</EmptyState> : (
              <ul className="flex flex-col p-2">
                {[...ranges].reverse().map((r) => (
                  <li key={r.id}>
                    <button onClick={() => setMonth(startOfMonth(r.start))}
                      className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left hover:bg-hover ${r.is_current ? "bg-tint" : ""}`}>
                      <span className={`text-[14px] ${r.is_current ? "font-semibold text-tint-ink" : "font-medium text-ink"}`}>{termLabel(r)}</span>
                      <span className="text-[12px] text-ink-3">{fmt(r.start, { month: "short", day: "numeric", year: "numeric" })} – {fmt(r.end, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
