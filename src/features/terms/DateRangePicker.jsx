import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS, addMonths, monthCells, parseDate, sameDay, startOfMonth } from "../../lib/calendar";

// Pick the first and last day of classes on a big two-month calendar: click the first day, then the last.
// starts / ends are "YYYY-MM-DD" ("" when not picked). min / max are Dates; days outside them can't be picked.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const long = (d) => d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default function DateRangePicker({ starts, ends, onChange, min, max }) {
  const s = starts ? parseDate(starts) : null;
  const e = ends ? parseDate(ends) : null;
  const [month, setMonth] = useState(() => startOfMonth(s || min || new Date()));
  const [hover, setHover] = useState(null);

  const blocked = (d) => (min && d < min) || (max && d > max);
  const pick = (d) => {
    if (!s || e || d <= s) onChange({ starts: iso(d), ends: "" });
    else onChange({ starts, ends: iso(d) });
  };
  const between = (d) => s && d > s && (e ? d < e : hover && d < hover);
  const weeks = s && e ? Math.round((e - s) / (7 * 86400000)) : null;

  const renderMonth = (m) => (
    <div className="min-w-0 flex-1">
      <h3 className="mb-2 text-center text-[15px] font-bold text-ink">{m.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</h3>
      <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-ink-3">
        {WEEKDAYS.map((w) => <span key={w} className="py-1.5">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {monthCells(m).map((d) => {
          if (d.getMonth() !== m.getMonth()) return <span key={d.toISOString()} aria-hidden="true" />;
          const isStart = s && sameDay(d, s);
          const isEnd = e && sameDay(d, e);
          const off = blocked(d);
          return (
            <button key={d.toISOString()} type="button" disabled={off} onClick={() => pick(d)}
              onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}
              aria-label={`${long(d)}${isStart ? ", first day" : ""}${isEnd ? ", last day" : ""}`} aria-pressed={Boolean(isStart || isEnd)}
              className={`mx-auto flex h-10 w-full items-center justify-center text-[14px] transition-colors
                ${isStart || isEnd ? "rounded-lg font-bold text-white" : between(d) ? "bg-tint font-semibold text-ink" : off ? "text-ink-3 opacity-40" : "rounded-lg text-ink hover:bg-hover"}`}
              style={isStart || isEnd ? { background: "var(--btn)" } : undefined}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Earlier months"><ChevronLeft size={18} /></button>
        <div className="flex min-w-0 flex-1 gap-8">
          {renderMonth(month)}
          {renderMonth(addMonths(month, 1))}
        </div>
        <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Later months"><ChevronRight size={18} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border px-4 py-3 ${s && !e ? "border-accent" : "border-line"}`}>
          <div className="text-[12px] font-semibold text-ink-3">First day of classes</div>
          <div className="mt-0.5 text-[15px] font-semibold text-ink">{s ? long(s) : "Click a day on the calendar"}</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${s && !e ? "border-accent" : "border-line"}`}>
          <div className="text-[12px] font-semibold text-ink-3">Last day of classes</div>
          <div className="mt-0.5 text-[15px] font-semibold text-ink">{e ? long(e) : s ? "Now click the last day" : "—"}</div>
        </div>
      </div>
      {weeks !== null && <p className="text-[13px] text-ink-3">{weeks} weeks of classes. Click a day again to start over.</p>}
    </div>
  );
}
