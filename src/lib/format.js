// Display helpers. Pure functions only — no data lives here.

export const yearLabel = (y) => ["", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"][y] || `Year ${y}`;
export const semesterLabel = (s) => (s === 1 ? "1st Semester" : s === 2 ? "2nd Semester" : "Summer");
export const termLabel = (t) => (t ? `SY ${t.school_year.replace("-", "–")} · ${semesterLabel(t.semester)}` : "");

// "Bachelor of Science in Computer Science" → "BS Computer Science" (display only).
export const shortProgramName = (name = "") => name.replace(/^Bachelor of Science in /, "BS ");

export const formatGrade = (g) => (g === null || g === undefined ? "—" : Number(g).toFixed(2));
export const GRADE_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0];

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// Stable 1–6 color slot for a name or code (maps to .av-1 … .av-6 in index.css).
export const colorIndex = (s = "") => ([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 6) + 1;

// Same rule as the database's norm_key(): "IT 101" → "it101"
export const normKey = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

// Students sign in with their student ID. Behind the scenes their login is the address below
// (created by scripts/create-student-accounts.mjs). Staff sign in with their real email.
export const STUDENT_LOGIN_DOMAIN = "students.ccs-monitor.test";
export const isStudentId = (s = "") => /^\d{4}-\d{4}$/.test(s.trim());
export const loginEmail = (identifier = "") =>
  isStudentId(identifier) ? `${identifier.trim()}@${STUDENT_LOGIN_DOMAIN}` : identifier.trim().toLowerCase();

// admission_type values shown as "Student type". "new" is shown as "Regular student" (every year, not just 1st).
export const STUDENT_TYPE = { new: "Regular student", transferee: "Transferee", shiftee: "Shiftee", returnee: "Returnee" };

// Subject type is inferred from the code, the same way the curriculum migration does it.
export function inferSubjectKind(code, title = "") {
  if (/internship|practicum|on-the-job/i.test(title)) return "internship";
  if (/elective/i.test(code)) return "elective";
  if (/^GE\s/i.test(code)) return "general_education";
  if (/^PATHFIT/i.test(code)) return "pathfit";
  if (/^NSTP/i.test(code)) return "nstp";
  return "major";
}

export const STATUS_LABEL = { enrolled: "Enrolled", passed: "Passed", failed: "Failed", incomplete: "INC", dropped: "Dropped" };
// Yellow is reserved for "close to the passing line"; INC and Dropped are grey (no final grade).
export const STATUS_TONE = { enrolled: "info", passed: "ok", failed: "bad", incomplete: "neutral", dropped: "neutral" };

const DAYS = ["", "M", "T", "W", "Th", "F", "Sa", "Su"];

export function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// Days a class meets, regardless of time or room: "M W F", "T Th".
export const meetingDays = (meetings = []) =>
  [...new Set(meetings.map((m) => m.weekday))].sort((a, b) => a - b).map((d) => DAYS[d]).join(" ");

// "7:30–8:30 AM", or "11:30 AM–1:00 PM" when the period changes.
export function timeRange(start, end) {
  const a = formatTime(start), b = formatTime(end);
  const [aT, aP] = a.split(" "), [bT, bP] = b.split(" ");
  return aP === bP ? `${aT}–${bT} ${bP}` : `${a}–${b}`;
}

// Groups meetings that share time and room: "MWF 7:30 AM–8:30 AM · CCS Lab 1"
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
      days: days.sort((a, b) => a - b).map((d) => DAYS[d]).join(""),
      time: `${formatTime(m.starts_at)}–${formatTime(m.ends_at)}`,
      room,
    }));
}

export const sumUnits = (rows) => rows.reduce((t, r) => t + Number(r.units || 0), 0);

export function toCsv(rows, columns) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [columns.map((c) => esc(c.label)).join(","), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(","))].join("\n");
}

export function downloadFile(name, text, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
