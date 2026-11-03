import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { getTerms } from "../services/catalog";
import { semesterLabel, termLabel } from "../lib/format";

// Top-bar chip showing the current term; opens a month calendar with every term's real dates
// (school_terms.starts_on / ends_on). No invented events.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmt = (d, opts) => d.toLocaleDateString("en-PH", opts);

export default function TermCalendar({ term }) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const wrap = useRef(null);
  const terms = useAsync(() => (open ? getTerms() : Promise.resolve(null)), [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const ranges = (terms.data || [])
    .filter((t) => t.starts_on && t.ends_on)
    .map((t) => ({ ...t, start: parseDate(t.starts_on), end: parseDate(t.ends_on) }));
  const termOn = (d) => ranges.find((r) => d >= r.start && d <= r.end);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i - first.getDay() + 1));
  const lastRow = cells.slice(35).every((d) => d.getMonth() !== month.getMonth());
  const shown = lastRow ? cells.slice(0, 35) : cells;

  const current = ranges.find((r) => r.is_current);
  const daysLeft = current ? Math.max(0, Math.ceil((current.end - today) / 86400000)) : null;

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
              return (
                <div key={d.toISOString()} role="gridcell"
                  aria-label={`${fmt(d, { weekday: "long", month: "long", day: "numeric" })}${t ? `, ${semesterLabel(t.semester)}` : ""}${isStart ? " starts" : ""}${isEnd ? " ends" : ""}${isToday ? ", today" : ""}`}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px]
                    ${!inMonth ? "text-ink-3 opacity-40" : t ? "text-ink" : "text-ink-2"}
                    ${t && inMonth ? "bg-tint" : ""}
                    ${(isStart || isEnd) && inMonth ? "font-bold text-white" : ""}
                    ${isToday ? "ring-2 ring-accent" : ""}`}
                  style={(isStart || isEnd) && inMonth ? { background: "var(--btn)" } : undefined}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-4 border-t border-line-2 pt-3 text-[12px] text-ink-3">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-tint" />Semester days</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: "var(--btn)" }} />Start / end</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-accent" />Today</span>
          </div>

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
          {daysLeft !== null && <p className="mt-2 px-2 text-[12px] text-ink-3">{daysLeft === 0 ? "This semester ends today." : `${daysLeft} days left in this semester.`}</p>}
        </div>
      )}
    </div>
  );
}
