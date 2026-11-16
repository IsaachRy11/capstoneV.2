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
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div>
          <h2 className="text-[17px] font-bold">Today</h2>
          <p className="text-[13px] text-ink-3">{DAY_NAMES[day]} · {today.length === 0 ? "no classes" : `${today.length} ${today.length === 1 ? "class" : "classes"}`}</p>
        </div>
        <Link to="/schedule" className="inline-flex min-h-10 items-center gap-0.5 text-[14px] font-semibold">Full week<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
      {today.length === 0 ? (
        <p className="border-t border-line px-4 py-5 text-[14px] text-ink-2 sm:px-5">Nothing scheduled today. Your full week is on the Schedule tab.</p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[112px]">Time</th><th>Subject</th><th className="hidden sm:table-cell">Room</th><th className="w-px !text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {today.map((e) => {
                const state = e === current ? "Now" : e === next ? "Next" : e.end <= now ? "Done" : "Later";
                const live = e === current || e === next;
                const past = e.end <= now;
                return (
                  <tr key={e.key} className={live ? "bg-tint" : ""}>
                    <td className={`whitespace-nowrap align-top font-mono text-[13px] font-semibold ${past ? "text-ink-3" : "text-ink"}`}>
                      {e.time.split(" – ")[0]}
                      <span className="block text-[11px] font-normal text-ink-3">to {e.time.split(" – ")[1]}</span>
                    </td>
                    <td className="min-w-0 align-top">
                      <span className="block font-mono text-[12px] text-accent">{e.code}</span>
                      <span className={`block font-medium ${past ? "text-ink-3" : "text-ink"}`}>{e.title}</span>
                      <span className="mt-0.5 block text-[12px] text-ink-3 sm:hidden">{e.room}</span>
                    </td>
                    <td className="hidden align-top text-[13px] text-ink-2 sm:table-cell">{e.room}</td>
                    <td className="text-center align-top"><span className={`badge ${live ? "tone-info" : "tone-neutral"}`}>{state}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
