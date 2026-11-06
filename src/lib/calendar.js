// Calendar helpers shared by the top-bar term calendar and the full Calendar page.
// Dates come only from school_terms (starts_on / ends_on); nothing here invents events.

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
