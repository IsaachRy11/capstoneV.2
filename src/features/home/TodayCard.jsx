import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { DAY_NAMES, formatTime, todayWeekday, toMinutes } from "../../lib/schedule";

// Phone home screen: what the student has today, in time order, with the class that is on now
// or coming up next marked. classes: rows from getTermClasses().
export default function TodayCard({ classes, className = "" }) {
  const day = todayWeekday();
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const today = classes
    .filter((c) => c.status !== "dropped")
    .flatMap((c) => c.class_offerings.class_meetings.filter((m) => m.weekday === day).map((m) => ({
      key: `${c.id}-${m.starts_at}`,
      code: c.class_offerings.curriculum_subjects.code,
      title: c.class_offerings.curriculum_subjects.title,
      start: toMinutes(m.starts_at), end: toMinutes(m.ends_at),
      time: `${formatTime(m.starts_at)} – ${formatTime(m.ends_at)}`,
      room: m.rooms?.name || "Room TBA",
    })))
    .sort((a, b) => a.start - b.start);
  const current = today.find((e) => e.start <= now && now < e.end);
  const next = current ? null : today.find((e) => e.start > now);

  return (
    <section className={`card overflow-hidden ${className}`} aria-label="Today's classes">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <div>
          <h2 className="text-[17px] font-bold">Today</h2>
          <p className="text-[13px] text-ink-3">{DAY_NAMES[day]} · {today.length === 0 ? "no classes" : `${today.length} ${today.length === 1 ? "class" : "classes"}`}</p>
        </div>
        <Link to="/schedule" className="inline-flex min-h-10 items-center gap-0.5 text-[14px] font-semibold">Full week<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
      {today.length === 0 ? (
        <p className="px-4 pb-5 pt-1 text-[14px] text-ink-2">Nothing scheduled today. Your full week is on the Schedule tab.</p>
      ) : (
        <ol className="px-2 pb-2">
          {today.map((e) => {
            const state = e === current ? "Now" : e === next ? "Next" : e.end <= now ? "Done" : null;
            const live = e === current || e === next;
            return (
              <li key={e.key} className={`flex items-center gap-3 rounded-[10px] px-2 py-2.5 ${live ? "bg-tint" : ""}`}>
                <span className={`w-[68px] shrink-0 text-right font-mono text-[13px] font-semibold ${e.end <= now ? "text-ink-3" : "text-ink"}`}>{e.time.split(" – ")[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[14px] font-semibold ${e.end <= now ? "text-ink-3" : "text-ink"}`}>{e.title}</span>
                  <span className="block text-[12px] text-ink-3"><span className="font-mono">{e.code}</span> · {e.room} · until {e.time.split(" – ")[1]}</span>
                </span>
                {state && <span className={`badge ${live ? "tone-info" : "tone-neutral"}`}>{state}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
