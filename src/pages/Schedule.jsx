import { useOutletContext } from "react-router-dom";
import { CalendarClock, Printer } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getTermClasses } from "../services/students";
import { ErrorState, LoadingState, PageHeader } from "../components/ui";
import { colorIndex, formatTime, termLabel } from "../lib/format";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOUR_PX = 64;
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export default function Schedule() {
  const { user } = useAuth();
  const { term, termLoading } = useOutletContext();
  const { data: classes, error, loading, reload } = useAsync(
    () => (term ? getTermClasses(user.studentId, term.id) : Promise.resolve([])),
    [user.studentId, term?.id]
  );

  if (loading || termLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // One entry per meeting of every class the student is still in.
  const events = classes
    .filter((c) => c.status !== "dropped")
    .flatMap((c) => c.class_offerings.class_meetings.map((m) => ({
      key: `${c.id}-${m.weekday}-${m.starts_at}`,
      day: m.weekday,
      start: toMin(m.starts_at),
      end: toMin(m.ends_at),
      time: `${formatTime(m.starts_at)} – ${formatTime(m.ends_at)}`,
      room: m.rooms?.name || "Room TBA",
      code: c.class_offerings.curriculum_subjects.code,
      title: c.class_offerings.curriculum_subjects.title,
    })))
    .sort((a, b) => a.day - b.day || a.start - b.start);

  const unscheduled = classes.filter((c) => c.status !== "dropped" && c.class_offerings.class_meetings.length === 0);
  const days = [1, 2, 3, 4, 5, ...[6, 7].filter((d) => events.some((e) => e.day === d))];
  const dayStart = events.length ? Math.floor(Math.min(...events.map((e) => e.start)) / 60) * 60 : 7 * 60;
  const dayEnd = events.length ? Math.ceil(Math.max(...events.map((e) => e.end)) / 60) * 60 : 17 * 60;
  const hours = Array.from({ length: (dayEnd - dayStart) / 60 }, (_, i) => dayStart + i * 60);
  const todayNum = ((new Date().getDay() + 6) % 7) + 1; // JS Sunday=0 → 7
  const todays = events.filter((e) => e.day === todayNum);

  return (
    <>
      <PageHeader title="Class schedule" subtitle={termLabel(term)}
        actions={events.length > 0 && <button className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print schedule</button>} />

      <section className="card flex items-start gap-3.5 px-5 py-4">
        <CalendarClock size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
        <div className="text-[14px] text-ink-2">
          <span className="font-semibold text-ink">Today, {DAY_NAMES[todayNum]}: </span>
          {todays.length === 0
            ? "no classes."
            : `${todays.length} ${todays.length === 1 ? "class" : "classes"}. First is ${todays[0].code} at ${todays[0].time.split(" – ")[0]} in ${todays[0].room}.`}
        </div>
      </section>

      {events.length === 0 ? (
        <div className="card px-5 py-12 text-center text-[14px] text-ink-3">No scheduled classes this semester yet.</div>
      ) : (
        <>
          {/* Weekly grid (tablet and up) */}
          <section className="card hidden overflow-x-auto md:block" aria-label="Weekly timetable">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="border-b border-line" />
              {days.map((d) => (
                <div key={d} className={`border-b border-l border-line px-3 py-3 text-center text-[13px] font-semibold ${d === todayNum ? "bg-tint text-tint-ink" : "text-ink-2"}`}>
                  {DAY_NAMES[d]}{d === todayNum && <span className="ml-1.5 text-[11px] font-medium">(today)</span>}
                </div>
              ))}

              <div className="relative" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => (
                  <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-ink-3" style={{ top: i * HOUR_PX }}>
                    {i === 0 ? "" : formatTime(`${String(h / 60).padStart(2, "0")}:00`)}
                  </div>
                ))}
              </div>
              {days.map((d) => (
                <div key={d} className={`relative border-l border-line ${d === todayNum ? "bg-surface-2" : ""}`} style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-line-2" style={{ top: i * HOUR_PX }} />)}
                  {events.filter((e) => e.day === d).map((e) => (
                    <div key={e.key} className={`av-${colorIndex(e.code)} absolute inset-x-1 overflow-hidden rounded-lg px-2.5 py-1.5`}
                      style={{ top: ((e.start - dayStart) / 60) * HOUR_PX + 1, height: ((e.end - e.start) / 60) * HOUR_PX - 2 }}
                      title={`${e.code} ${e.title} · ${e.time} · ${e.room}`}>
                      <div className="truncate text-[13px] font-bold">{e.code}</div>
                      <div className="truncate text-[12px] opacity-90">{e.time}</div>
                      <div className="truncate text-[12px] opacity-90">{e.room}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Day-by-day list (phones) */}
          <div className="flex flex-col gap-4 md:hidden">
            {days.filter((d) => events.some((e) => e.day === d)).map((d) => (
              <section key={d} className="card overflow-hidden">
                <h2 className={`border-b border-line px-5 py-3 text-[15px] font-bold ${d === todayNum ? "bg-tint text-tint-ink" : ""}`}>
                  {DAY_NAMES[d]}{d === todayNum && " (today)"}
                </h2>
                <ul>
                  {events.filter((e) => e.day === d).map((e) => (
                    <li key={e.key} className="flex items-start gap-3 border-b border-line-2 px-5 py-3 last:border-0">
                      <span className={`av-${colorIndex(e.code)} mt-1 h-3 w-3 shrink-0 rounded-full`} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-ink">{e.code} · {e.title}</div>
                        <div className="text-[13px] text-ink-2">{e.time} · {e.room}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {unscheduled.length > 0 && (
        <p className="text-[13px] text-ink-3">
          No fixed schedule yet: {unscheduled.map((c) => c.class_offerings.curriculum_subjects.code).join(", ")}. Ask the CCS office for the arrangement.
        </p>
      )}
    </>
  );
}
