import { STUDENT_TYPE } from "./format";

// Bulk add students: turns pasted or uploaded rows into students to create, and says what is wrong with each row.
// Column order is fixed: Student ID, Last name, First name, Program, Year level, Student type (optional).
// A first line whose first cell has no digits (a header like "Student ID") is skipped; a mistyped ID is kept and flagged.
// Excel pastes are tab separated.

const ID = /^\d{4}-\d{4}$/;
const norm = (s) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

// Splits one line on tabs, semicolons or commas, keeping "quoted, values" together.
export function splitLine(line) {
  const sep = line.includes("\t") ? "\t" : line.includes(";") && !line.includes(",") ? ";" : ",";
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const typeKey = (value) => Object.entries(STUDENT_TYPE).find(([k, label]) => norm(value) === k || norm(value) === norm(label))?.[0];

// programs: [{ id, code, name, duration_years }]; existingIds: Set of student IDs already in the system.
// Returns [{ line, id, last_name, first_name, programId, programCode, year_level, studentType, errors: [] }].
export function parseStudentRows(text, programs, existingIds = new Set()) {
  const lines = String(text ?? "").split(/\r?\n/).map((l, i) => ({ line: i + 1, raw: l })).filter((l) => l.raw.trim());
  if (lines.length && !/[0-9]/.test(splitLine(lines[0].raw)[0])) lines.shift();
  const seen = new Set();
  return lines.map(({ line, raw }) => {
    const [id = "", last = "", first = "", prog = "", yearRaw = "", typeRaw = ""] = splitLine(raw);
    const errors = [];
    const program = programs.find((p) => norm(p.code) === norm(prog) || norm(p.name) === norm(prog));
    const year = Number(yearRaw);
    if (!ID.test(id)) errors.push("Student ID must look like 2026-0001");
    else if (seen.has(id)) errors.push("This ID appears twice in the file");
    else if (existingIds.has(id)) errors.push("A student with this ID already exists");
    seen.add(id);
    if (!last) errors.push("Last name is missing");
    if (!first) errors.push("First name is missing");
    if (!program) errors.push("Program must be one of " + programs.map((p) => p.code).join(", "));
    if (!Number.isInteger(year) || year < 1 || (program && year > program.duration_years)) errors.push(`Year level must be 1 to ${program?.duration_years ?? 4}`);
    let studentType = typeRaw ? typeKey(typeRaw) : year === 1 ? "freshman" : "continuing";
    if (typeRaw && !studentType) errors.push("Student type must be Freshman, Continuing, Transferee or Shiftee");
    if (studentType === "freshman" && year !== 1) errors.push("A Freshman must be in 1st year");
    return { line, id, last_name: last, first_name: first, programId: program?.id, programCode: program?.code ?? prog, year_level: year, studentType, errors };
  });
}
