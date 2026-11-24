// Days and times for class schedules. The one place that knows how weekdays and times are shown.
// Weekdays are numbered like the database: 1 = Monday … 7 = Sunday.

export const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LETTER = ["", "M", "T", "W", "Th", "F", "Sa", "Su"];

// Class days the app offers (Monday–Saturday).
export const SCHOOL_DAYS = [1, 2, 3, 4, 5, 6];

// Today's weekday in the database numbering (JS uses Sunday = 0).
export const todayWeekday = () => ((new Date().getDay() + 6) % 7) + 1;

// "07:30:00" → "07:30" (for <input type="time">)
export const hhmm = (t) => (t ? t.slice(0, 5) : "");

// "07:30:00" → 450 (minutes after midnight)
export const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// "13:05:00" → "1:05 PM"
export function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// "7:30–8:30 AM", or "11:30 AM–1:00 PM" when the period changes.
export function timeRange(start, end) {
  const a = formatTime(start), b = formatTime(end);
  const [aT, aP] = a.split(" "), [bT, bP] = b.split(" ");
  return aP === bP ? `${aT}–${bT} ${bP}` : `${a}–${b}`;
}

// Days a class meets, regardless of time or room: "M W F", "T Th".
export const meetingDays = (meetings = []) =>
  [...new Set(meetings.map((m) => m.weekday))].sort((a, b) => a - b).map((d) => DAY_LETTER[d]).join(" ");

// Groups meetings that share time and room: { days: "MWF", time: "7:30 AM–8:30 AM", room: "CCS Lab 1" }
export function scheduleLines(meetings = []) {
  const groups = new Map();
  for (const m of meetings) {
    const room = m.rooms?.name || "Room TBA";
    const key = `${m.starts_at}|${m.ends_at}|${room}`;
    if (!groups.has(key)) groups.set(key, { days: [], m, room });
    groups.get(key).days.push(m.weekday);
  }
  return [...groups.values()]
    .sort((a, b) => Math.min(...a.days) - Math.min(...b.days))
    .map(({ days, m, room }) => ({
      days: days.sort((a, b) => a - b).map((d) => DAY_LETTER[d]).join(""),
      time: `${formatTime(m.starts_at)}–${formatTime(m.ends_at)}`,
      room,
    }));
}
