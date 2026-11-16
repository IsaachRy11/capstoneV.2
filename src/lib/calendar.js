// Calendar helpers shared by the top-bar term calendar and the full Calendar page.
// Dates come only from school_terms (starts_on / ends_on) and the official school_calendar_events; nothing here invents events.

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "2026-08-10" -> local Date at midnight (avoids the UTC shift of new Date("2026-08-10")).
export const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// The days to show for a month, Sunday-first: 5 rows when the month fits, otherwise 6.
export function monthCells(month) {
  const first = startOfMonth(month);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i - first.getDay() + 1));
  const lastRowSpare = cells.slice(35).every((d) => d.getMonth() !== first.getMonth());
  return lastRowSpare ? cells.slice(0, 35) : cells;
}

// school_terms rows -> ranges with Date objects; rows without both dates are skipped.
export const termRanges = (terms = []) =>
  terms.filter((t) => t.starts_on && t.ends_on).map((t) => ({ ...t, start: parseDate(t.starts_on), end: parseDate(t.ends_on) }));

export const termOn = (ranges, d) => ranges.find((r) => d >= r.start && d <= r.end);

// Whole days from `today` to the end of a range (0 on the last day, never negative).
export const daysLeft = (range, today) => Math.max(0, Math.ceil((range.end - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000));

// What each kind of calendar entry is called and how it is drawn. Colors are the status variables, so both themes work.
export const EVENT_KINDS = {
  classes:      { label: "Classes start or end", tone: "info" },
  exam:         { label: "Exams",                tone: "bad" },
  holiday:      { label: "Holiday",              tone: "warn" },
  break:        { label: "Break",                tone: "ok" },
  registration: { label: "Registration",         tone: "neutral" },
  school:       { label: "School activity",      tone: "neutral" },
};

// calendar_events rows -> entries with Date objects.
export const eventRanges = (events = []) => events.map((e) => ({ ...e, start: parseDate(e.starts_on), end: parseDate(e.ends_on) }));

export const eventsOn = (ranges, d) => ranges.filter((e) => d >= e.start && d <= e.end);
export const eventsInMonth = (ranges, month) => {
  const first = startOfMonth(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return ranges.filter((e) => e.end >= first && e.start <= last).sort((a, b) => a.start - b.start || a.end - b.end);
};

// The next few things still to happen (or happening today), soonest first.
export const upcoming = (ranges, today, n = 3) => {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return ranges.filter((e) => e.end >= day).sort((a, b) => a.start - b.start || a.end - b.end).slice(0, n);
};

// "Nov 9 – 21", "Nov 7", "Jul 30 – Aug 1"
export function dateSpan(e) {
  const f = (d, o) => d.toLocaleDateString("en-PH", o);
  if (sameDay(e.start, e.end)) return f(e.start, { month: "short", day: "numeric" });
  return e.start.getMonth() === e.end.getMonth()
    ? `${f(e.start, { month: "short", day: "numeric" })} – ${e.end.getDate()}`
    : `${f(e.start, { month: "short", day: "numeric" })} – ${f(e.end, { month: "short", day: "numeric" })}`;
}
