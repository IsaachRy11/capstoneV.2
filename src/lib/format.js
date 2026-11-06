// Labels for terms, grades, students and subjects. Pure functions only — no data lives here.
// Related helpers: schedule.js (days and times), csv.js (export), login.js (student-ID sign-in).

export const yearLabel = (y) => ["", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"][y] || `Year ${y}`;
export const semesterLabel = (s) => (s === 1 ? "1st Semester" : s === 2 ? "2nd Semester" : "Summer");
export const termLabel = (t) => (t ? `SY ${t.school_year.replace("-", "–")} · ${semesterLabel(t.semester)}` : "");

// "Bachelor of Science in Computer Science" → "BS Computer Science" (display only).
export const shortProgramName = (name = "") => name.replace(/^Bachelor of Science in /, "BS ");

export const formatGrade = (g) => (g === null || g === undefined ? "—" : Number(g).toFixed(2));
export const GRADE_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0];

export const STATUS_LABEL = { enrolled: "Enrolled", passed: "Passed", failed: "Failed", incomplete: "INC", dropped: "Dropped" };
// INC and Dropped are grey (no final grade).
export const STATUS_TONE = { enrolled: "info", passed: "ok", failed: "bad", incomplete: "neutral", dropped: "neutral" };

// admission_type values shown as "Student type". "new" is shown as "Regular student" (every year, not just 1st).
export const STUDENT_TYPE = { new: "Regular student", transferee: "Transferee", shiftee: "Shiftee", returnee: "Returnee" };

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// Stable 1–6 color slot for a name or code (maps to .av-1 … .av-6 in index.css).
export const colorIndex = (s = "") => ([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 6) + 1;

// Same rule as the database's norm_key(): "IT 101" → "it101"
export const normKey = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

// Subject type is inferred from the code, the same way the curriculum migration does it.
export function inferSubjectKind(code, title = "") {
  if (/internship|practicum|on-the-job/i.test(title)) return "internship";
  if (/elective/i.test(code)) return "elective";
  if (/^GE\s/i.test(code)) return "general_education";
  if (/^PATHFIT/i.test(code)) return "pathfit";
  if (/^NSTP/i.test(code)) return "nstp";
  return "major";
}

export const sumUnits = (rows) => rows.reduce((t, r) => t + Number(r.units || 0), 0);
