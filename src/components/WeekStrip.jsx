import { timeRange } from "../lib/format";

// One subject's week at a glance: a column per weekday, filled where the class meets
// (time + room), blank where it doesn't. Sunday only appears if the class meets then.
const DAYS = [
  [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"],
];

export default function WeekStrip({ meetings = [], className = "" }) {
  const days = DAYS.filter(([d]) => d <= 6 || meetings.some((m) => m.weekday === d));
  const byDay = new Map(days.map(([d]) => [d, meetings.filter((m) => m.weekday === d)]));

  if (!meetings.length) {
    return <p className={`text-[14px] text-ink-3 ${className}`}>Schedule to be arranged</p>;
  }

  return (
    <table className={`w-full table-fixed border-separate border-spacing-1.5 ${className}`}>
      <caption className="sr-only">Weekly schedule</caption>
      <thead>
        <tr>
          {days.map(([d, label]) => (
            <th key={d} scope="col" className={`pb-0.5 text-center text-[12px] font-semibold ${byDay.get(d).length ? "text-ink" : "text-ink-3"}`}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {days.map(([d, label]) => {
            const list = byDay.get(d);
            return (
              <td key={d} className="h-[68px] align-top">
                {list.length ? (
                  <div className="flex h-full flex-col justify-center gap-0.5 rounded-lg border px-2 py-2 text-center"
                    style={{ background: "var(--tint)", borderColor: "var(--accent)" }}>
                    {list.map((m) => (
                      <div key={m.starts_at}>
                        <div className="font-mono text-[12px] font-semibold leading-tight text-tint-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {timeRange(m.starts_at, m.ends_at)}
                        </div>
                        <div className="truncate text-[12px] text-ink-2" title={m.rooms?.name || "Room TBA"}>{m.rooms?.name || "Room TBA"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-line text-[12px] text-ink-3">
                    <span className="sr-only">No class on {label}</span>
                    <span aria-hidden="true">—</span>
                  </div>
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
