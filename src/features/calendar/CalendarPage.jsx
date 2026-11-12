import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getTerms } from "../../services/catalog";
import { semesterLabel, termLabel } from "../../lib/format";
import { WEEKDAYS, addMonths, daysLeft, monthCells, sameDay, startOfMonth, termOn, termRanges } from "../../lib/calendar";
import { BackButton, EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";

// Full-page academic calendar. Shows only real term dates from school_terms (start, end, the days
// in between) and today. No invented events.
const fmt = (d, opts) => d.toLocaleDateString("en-PH", opts);

export default function CalendarPage() {
  const { term } = useOutletContext();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const { data, error, loading, reload } = useAsync(getTerms, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const ranges = termRanges(data);
  const cells = monthCells(month);
  const current = ranges.find((r) => r.is_current);
  const isThisMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
  const marks = (d) => ranges.flatMap((r) => [
    ...(sameDay(d, r.start) ? [{ r, text: `${semesterLabel(r.semester)} starts` }] : []),
    ...(sameDay(d, r.end) ? [{ r, text: `${semesterLabel(r.semester)} ends` }] : []),
  ]);
  const monthEvents = ranges
    .flatMap((r) => [{ d: r.start, r, text: "starts" }, { d: r.end, r, text: "ends" }])
    .filter((e) => e.d.getMonth() === month.getMonth() && e.d.getFullYear() === month.getFullYear())
    .sort((a, b) => a.d - b.d);

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
              const inMonth = d.getMonth() === month.getMonth();
              const t = termOn(ranges, d);
              const isToday = sameDay(d, today);
              const m = marks(d);
              return (
                <div key={d.toISOString()} role="gridcell"
                  aria-label={`${fmt(d, { weekday: "long", month: "long", day: "numeric" })}${t ? `, ${semesterLabel(t.semester)}` : ""}${m.map((x) => `, ${x.text}`).join("")}${isToday ? ", today" : ""}`}
                  className={`flex min-h-[56px] flex-col gap-1 border-line p-1.5 sm:min-h-[104px] sm:p-2 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${t && inMonth ? "bg-tint" : ""} ${inMonth ? "" : "opacity-45"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${isToday ? "font-bold text-white" : t ? "font-semibold text-ink" : "text-ink-2"}`}
                    style={isToday ? { background: "var(--btn)" } : undefined}>
                    {d.getDate()}
                  </span>
                  {inMonth && m.map((x) => (
                    <span key={x.text} className="hidden truncate rounded-md px-1.5 py-0.5 text-[12px] font-semibold sm:block" style={{ background: "var(--btn)", color: "#fff" }}>{x.text}</span>
                  ))}
                  {inMonth && m.length > 0 && <span className="mx-auto h-1.5 w-1.5 rounded-full sm:hidden" style={{ background: "var(--btn)" }} aria-hidden="true" />}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-[12px] text-ink-3 sm:px-5">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-tint ring-1 ring-line" />Semester days</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded" style={{ background: "var(--btn)" }} />Start or end</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--btn)" }} />Today</span>
          </div>

          {/* Phones: the cells are too small for labels, so list this month's dates below */}
          {monthEvents.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:hidden">
              {monthEvents.map((e) => (
                <li key={e.d.toISOString() + e.text} className="flex items-center gap-2 text-[13px] text-ink">
                  <Flag size={14} className="text-accent" aria-hidden="true" />
                  <span className="font-semibold">{fmt(e.d, { month: "short", day: "numeric" })}</span>
                  <span className="text-ink-2">{termLabel(e.r)} {e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-[1_1_280px] flex-col gap-5">
          {current && (
            <section className="card p-5">
              <h2 className="text-[13px] font-semibold text-ink-3">This semester</h2>
              <p className="mt-1 font-display text-[18px] font-bold text-ink">{termLabel(current)}</p>
              <p className="mt-1 text-[14px] text-ink-2">{fmt(current.start, { month: "long", day: "numeric" })} – {fmt(current.end, { month: "long", day: "numeric", year: "numeric" })}</p>
              <p className="mt-3 text-[14px] font-semibold text-ink">
                {daysLeft(current, today) === 0 ? "Ends today" : `${daysLeft(current, today)} days left`}
              </p>
            </section>
          )}
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
