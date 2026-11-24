import { DAY_SHORT, timeRange } from "../../lib/schedule";

// One subject's week at a glance: a column per weekday, filled where the class meets
// (time + room), blank where it doesn't. Sunday only appears if the class meets then.

export default function WeekStrip({ meetings = [], className = "" }) {
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => d <= 6 || meetings.some((m) => m.weekday === d));
  const byDay = new Map(days.map((d) => [d, meetings.filter((m) => m.weekday === d)]));

  if (!meetings.length) {
    return <p className={`text-[14px] text-ink-3 ${className}`}>Schedule to be arranged</p>;
  }

  return (
    <div className={`min-w-0 ${className}`}>
    {/* Phones: six day columns don't fit, so the meeting days are a short list. */}
    <ul className="flex w-full flex-col gap-1.5 sm:hidden">
      {days.filter((d) => byDay.get(d).length).map((d) => byDay.get(d).map((m) => (
        <li key={d + m.starts_at} className="flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2" style={{ background: "var(--tint)", borderColor: "var(--accent)" }}>
          <span className="text-[13px] font-semibold text-ink">{DAY_SHORT[d]}</span>
          <span className="text-right text-[13px] text-ink-2"><span className="font-mono font-semibold text-tint-ink">{timeRange(m.starts_at, m.ends_at)}</span> · {m.rooms?.name || "Room TBA"}</span>
        </li>
      )))}
    </ul>
    <table className="no-grid hidden w-full table-fixed border-separate border-spacing-1.5 sm:table">
      <caption className="sr-only">Weekly schedule</caption>
      <thead>
        <tr>
          {days.map((d) => (
            <th key={d} scope="col" className={`pb-0.5 text-center text-[12px] font-semibold ${byDay.get(d).length ? "text-ink" : "text-ink-3"}`}>
              {DAY_SHORT[d]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {days.map((d) => {
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
                    <span className="sr-only">No class on {DAY_SHORT[d]}</span>
                    <span aria-hidden="true">—</span>
                  </div>
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
    </div>
  );
}
