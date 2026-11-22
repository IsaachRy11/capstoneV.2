// Labels for terms, grades, students and subjects. Pure functions only — no data lives here.
// Related helpers: schedule.js (days and times), csv.js (export), login.js (student-ID sign-in).

export const yearLabel = (y) => ["", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"][y] || `Year ${y}`;
export const semesterLabel = (s) => (s === 1 ? "1st Semester" : s === 2 ? "2nd Semester" : "Summer");
// "3rd Year · 1st Semester"; summer is just "Summer" (it also holds retakes from any year).
export const yearSemesterLabel = (year, sem) => (sem === 3 ? "Summer" : `${yearLabel(year)} · ${semesterLabel(sem)}`);
export const termLabel = (t) => (t ? `SY ${t.school_year.replace("-", "–")} · ${semesterLabel(t.semester)}` : "");

// "Bachelor of Science in Computer Science" → "BS Computer Science" (display only).
export const shortProgramName = (name = "") => name.replace(/^Bachelor of Science in /, "BS ");

export const formatGrade = (g) => (g === null || g === undefined ? "—" : Number(g).toFixed(2));
export const GRADE_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0];

export const STATUS_LABEL = { enrolled: "Enrolled", passed: "Passed", failed: "Failed", incomplete: "INC", dropped: "Dropped" };
// INC and Dropped are grey (no final grade).
export const STATUS_TONE = { enrolled: "info", passed: "ok", failed: "bad", incomplete: "neutral", dropped: "neutral" };

// "BSIT 1-T" -> "T" (the block section letter)
export const sectionLetter = (name) => String(name).split("-").pop();

// Student TYPE, shown everywhere: Freshman, Continuing, Transferee, Shiftee. The database keeps admission_type
// (new, returnee, transferee, shiftee); the type shown also follows the year level: a "new" student is a Freshman
// only in 1st year and Continuing after that, and a returnee is always Continuing.
export const STUDENT_TYPE = { freshman: "Freshman", continuing: "Continuing", transferee: "Transferee", shiftee: "Shiftee" };
export const studentTypeKey = (s) =>
  s.admission_type === "transferee" || s.admission_type === "shiftee" ? s.admission_type
  : s.admission_type === "returnee" || Number(s.year_level) > 1 ? "continuing" : "freshman";
export const studentTypeLabel = (s) => STUDENT_TYPE[studentTypeKey(s)];
// What the secretary picks when creating a student -> the admission_type stored.
export const ADMISSION_FOR_TYPE = { freshman: "new", continuing: "returnee", transferee: "transferee", shiftee: "shiftee" };

// Student STATUS. students.status is what the secretary sets (only "active" students can be enrolled in classes);
// while active, the status shown is Regular or Irregular, which the database works out from the grades.
export const STUDENT_STATUS = { active: "Active (regular or irregular)", graduated: "Graduated", dropped: "Dropped", shifted_out: "Shifted out", inactive: "Inactive" };
export const STUDENT_STATUS_LABEL = { regular: "Regular", irregular: "Irregular", graduated: "Graduated", dropped: "Dropped", shifted_out: "Shifted out", inactive: "Inactive" };
export const STUDENT_STATUS_TONE = { regular: "ok", irregular: "warn", graduated: "info", dropped: "neutral", shifted_out: "neutral", inactive: "neutral" };
export const studentStatusKey = (s) => (s.status && s.status !== "active" ? s.status : s.standing === "irregular" ? "irregular" : "regular");
export const studentStatusLabel = (s) => STUDENT_STATUS_LABEL[studentStatusKey(s)];

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// Stable 1–6 color slot for a name or code (maps to .av-1 … .av-6 in index.css).
export const colorIndex = (s = "") => ([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 6) + 1;

// Same rule as the database's norm_key(): "IT 101" → "it101"
export const normKey = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

// Subject type is inferred from the code, the same way the curriculum migration does it.
export function inferSubjectKind(code, title = "") {
  if (/internship|practicum|on-the-job/i.test(title) || /^PRAC$/i.test(code.trim())) return "internship";
  if (/elective/i.test(code) || /^(IT|CS)\s*EL\s/i.test(code)) return "elective";
  if (/^(GE|THEO)\s/i.test(code)) return "general_education"; // GE, GE electives (GE EL) and theology
  if (/^PATHFIT/i.test(code)) return "pathfit";
  if (/^NSTP/i.test(code)) return "nstp";
  return "major";
}

export const sumUnits = (rows) => rows.reduce((t, r) => t + Number(r.units || 0), 0);
