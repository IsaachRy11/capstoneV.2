import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { getCalendarEvents, getTerms } from "../services/catalog";
import { semesterLabel, termLabel } from "../lib/format";
import { EVENT_KINDS, WEEKDAYS, dateSpan, daysLeft as daysLeftIn, eventRanges, eventsOn, monthCells, sameDay, termOn as termOnDay, termRanges, upcoming } from "../lib/calendar";

// Top-bar chip showing the current term; opens a month calendar with every term's real dates
// (school_terms.starts_on / ends_on). No invented events. "Open full calendar" goes to /calendar.

const fmt = (d, opts) => d.toLocaleDateString("en-PH", opts);

export default function TermCalendar({ term }) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const wrap = useRef(null);
  const terms = useAsync(async () => (open ? { terms: await getTerms(), events: await getCalendarEvents() } : null), [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const ranges = termRanges(terms.data?.terms || []);
  const events = eventRanges(terms.data?.events || []);
  const next = upcoming(events, today, 3);
  const termOn = (d) => termOnDay(ranges, d);
  const shown = monthCells(month);

  const current = ranges.find((r) => r.is_current);
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysLeft = current ? daysLeftIn(current, today) : null;
  const ended = current ? dayStart > current.end : false;

  if (!term) return null;
  return (
    <div ref={wrap} className="relative hidden sm:block">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}
        className={`inline-flex h-11 min-w-[290px] items-center justify-center gap-2.5 whitespace-nowrap rounded-lg border px-5 text-[14px] font-semibold ${open ? "border-accent text-ink" : "border-line text-ink-2 hover:bg-hover hover:text-ink"}`}>
        <Calendar size={16} aria-hidden="true" />{termLabel(term)}
      </button>

      {open && (
        <div role="dialog" aria-label="Academic calendar" className="card absolute right-0 top-12 z-50 w-[340px] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button className="icon-btn h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={17} /></button>
            <div className="text-center">
              <div className="font-display text-[15px] font-bold text-ink">{fmt(month, { month: "long", year: "numeric" })}</div>
              {!(month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()) && (
                <button className="text-[12px] font-semibold text-accent" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Back to today</button>
              )}
            </div>
            <button className="icon-btn h-8 w-8" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={17} /></button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center" role="grid">
            {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-[11px] font-semibold text-ink-3">{w}</div>)}
            {shown.map((d) => {
              const inMonth = d.getMonth() === month.getMonth();
              const t = termOn(d);
              const isStart = t && sameDay(d, t.start);
              const isEnd = t && sameDay(d, t.end);
              const isToday = sameDay(d, today);
              const dayEvents = eventsOn(events, d);
              return (
                <div key={d.toISOString()} role="gridcell"
                  aria-label={`${fmt(d, { weekday: "long", month: "long", day: "numeric" })}${t ? `, ${semesterLabel(t.semester)}` : ""}${isStart ? " starts" : ""}${isEnd ? " ends" : ""}${dayEvents.map((e) => `, ${e.title}`).join("")}${isToday ? ", today" : ""}`}
                  title={dayEvents.map((e) => e.title).join(" · ") || undefined}
                  className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px]
                    ${!inMonth ? "text-ink-3 opacity-40" : t ? "text-ink" : "text-ink-2"}
                    ${t && inMonth ? "bg-tint" : ""}
                    ${(isStart || isEnd) && inMonth ? "font-bold text-white" : ""}
                    ${isToday ? "ring-2 ring-accent" : ""}`}
                  style={(isStart || isEnd) && inMonth ? { background: "var(--btn)" } : undefined}>
                  {d.getDate()}
                  {inMonth && dayEvents.length > 0 && !isStart && !isEnd && <span className={`absolute bottom-0.5 h-1 w-1 rounded-full tone-${EVENT_KINDS[dayEvents[0].kind].tone}`} style={{ background: "currentColor" }} aria-hidden="true" />}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-2 pt-3 text-[12px] text-ink-3" aria-label="Legend">
            <span className="font-semibold uppercase tracking-[0.08em]">Legend</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-tint" />Semester days</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--btn)" }} />Start / end</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ink-3" />School calendar entry</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-accent" />Today</span>
          </div>

          {next.length > 0 && (
            <div className="mt-3 border-t border-line-2 pt-3">
              <h3 className="px-2 text-[12px] font-semibold text-ink-3">Coming up</h3>
              <ul className="mt-1 flex flex-col">
                {next.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-[13px]">
                    <span className="min-w-0 truncate font-medium text-ink">{e.title}</span>
                    <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">{dateSpan(e)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {terms.loading && <p className="mt-3 text-[13px] text-ink-3">Loading terms…</p>}
          {terms.error && <p className="mt-3 text-[13px] text-bad">Couldn't load the term dates.</p>}
          {ranges.length > 0 && (
            <ul className="mt-3 flex max-h-[150px] flex-col gap-1 overflow-y-auto border-t border-line-2 pt-3">
              {[...ranges].reverse().map((r) => (
                <li key={r.id}>
                  <button onClick={() => setMonth(new Date(r.start.getFullYear(), r.start.getMonth(), 1))}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-hover ${r.is_current ? "font-semibold text-ink" : "text-ink-2"}`}>
                    <span>{termLabel(r)}</span>
                    <span className="whitespace-nowrap text-[12px] text-ink-3">{fmt(r.start, { month: "short", day: "numeric" })} – {fmt(r.end, { month: "short", day: "numeric" })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {daysLeft !== null && <p className="mt-2 px-2 text-[12px] text-ink-3">{ended ? `This semester ended ${fmt(current.end, { month: "long", day: "numeric" })}.` : daysLeft === 0 ? "This semester ends today." : `${daysLeft} days left in this semester.`}</p>}
          <Link to="/calendar" onClick={() => setOpen(false)} className="btn btn-secondary mt-3 w-full">
            <Maximize2 size={15} aria-hidden="true" />Open full calendar
          </Link>
        </div>
      )}
    </div>
  );
}
