import { describe, expect, it } from "vitest";
import { gradeStatusLabel, termAverage } from "./format";
import { ADMISSION_FOR_TYPE, formatGrade, inferSubjectKind, initials, normKey, shortProgramName, studentStatusKey, studentStatusLabel, studentTypeKey, studentTypeLabel, sumUnits, termLabel } from "./format";
import { formatTime, meetingDays, scheduleLines, timeRange } from "./schedule";
import { isSecretaryId, isStudentId, loginEmail } from "./login";
import { toCsv } from "./csv";

describe("grades and labels", () => {
  it("shows grades with two decimals and a dash when empty", () => {
    expect(formatGrade(2)).toBe("2.00");
    expect(formatGrade(1.25)).toBe("1.25");
    expect(formatGrade(null)).toBe("—");
  });

  it("builds the term label shown in the top bar", () => {
    expect(termLabel({ school_year: "2026-2027", semester: 1 })).toBe("SY 2026–2027 · 1st Semester");
  });

  it("shortens only the 'Bachelor of Science in' prefix", () => {
    expect(shortProgramName("Bachelor of Science in Computer Science")).toBe("BS Computer Science");
    expect(shortProgramName("Associate in Computer Technology")).toBe("Associate in Computer Technology");
  });

  it("makes initials from the first two words", () => {
    expect(initials("Francis Quijano")).toBe("FQ");
    expect(initials("")).toBe("?");
  });

  it("normalizes codes the same way as the database", () => {
    expect(normKey(" IT  101 ")).toBe("it101");
  });

  it("infers the subject type from the code, never 'major' for GE/PATHFIT/NSTP", () => {
    expect(inferSubjectKind("GE 4")).toBe("general_education");
    expect(inferSubjectKind("PATHFIT 2")).toBe("pathfit");
    expect(inferSubjectKind("NSTP 11")).toBe("nstp");
    expect(inferSubjectKind("IT Elective 1")).toBe("elective");
    expect(inferSubjectKind("IT 403", "IT Internship / On-the-Job Training")).toBe("internship");
    expect(inferSubjectKind("IT 101")).toBe("major");
    expect(inferSubjectKind("IT EL 1", "IT Elective 1")).toBe("elective");
    expect(inferSubjectKind("GE EL 2", "Gender and Society")).toBe("general_education");
    expect(inferSubjectKind("THEO 1A", "Old Testament")).toBe("general_education");
    expect(inferSubjectKind("PRAC", "Practicum/Analytics Internship")).toBe("internship");
    expect(inferSubjectKind("CAPSTONE 1", "Capstone Project 1")).toBe("major");
  });

  it("adds up units", () => {
    expect(sumUnits([{ units: 3 }, { units: "2" }, { units: 3 }])).toBe(8);
  });
});

describe("schedules", () => {
  const meetings = [
    { weekday: 1, starts_at: "07:30:00", ends_at: "08:30:00", rooms: { name: "CCS Lab 1" } },
    { weekday: 3, starts_at: "07:30:00", ends_at: "08:30:00", rooms: { name: "CCS Lab 1" } },
    { weekday: 5, starts_at: "07:30:00", ends_at: "08:30:00", rooms: { name: "CCS Lab 1" } },
  ];

  it("formats 12-hour times", () => {
    expect(formatTime("07:30:00")).toBe("7:30 AM");
    expect(formatTime("13:05:00")).toBe("1:05 PM");
    expect(formatTime("12:00:00")).toBe("12:00 PM");
  });

  it("drops the repeated AM/PM in a time range", () => {
    expect(timeRange("07:30:00", "08:30:00")).toBe("7:30–8:30 AM");
    expect(timeRange("11:30:00", "13:00:00")).toBe("11:30 AM–1:00 PM");
  });

  it("groups same time and room into one line", () => {
    expect(scheduleLines(meetings)).toEqual([{ days: "MWF", time: "7:30 AM–8:30 AM", room: "CCS Lab 1" }]);
  });

  it("lists meeting days regardless of rooms", () => {
    expect(meetingDays([...meetings, { weekday: 3, starts_at: "09:00:00", ends_at: "10:00:00" }])).toBe("M W F");
    expect(meetingDays([])).toBe("");
  });
});

describe("login", () => {
  it("turns a student ID into the student's login address", () => {
    expect(loginEmail(" 2025-0001 ")).toBe("2025-0001@students.ccs-monitor.test");
  });

  it("turns a secretary ID into the secretary's login address", () => {
    expect(loginEmail(" CCS-001 ")).toBe("ccs-001@staff.ccs-monitor.test");
    expect(isSecretaryId("CCS-001")).toBe(true);
    expect(isSecretaryId("2025-0001")).toBe(false);
  });

  it("leaves other emails alone (lower-cased)", () => {
    expect(loginEmail("Demo.Secretary@ccs-monitor.test")).toBe("demo.secretary@ccs-monitor.test");
  });

  it("only treats the ####-#### pattern as a student ID", () => {
    expect(isStudentId("2025-0001")).toBe(true);
    expect(isStudentId("2025-001")).toBe(false);
    expect(isStudentId("CCS-001")).toBe(false);
  });
});

describe("CSV export", () => {
  it("quotes every cell and escapes quotes", () => {
    const csv = toCsv([{ name: 'Ana "AJ" Cruz', id: "2025-0001" }], [
      { label: "Name", value: (r) => r.name },
      { label: "ID", value: (r) => r.id },
    ]);
    expect(csv).toBe('"Name","ID"\n"Ana ""AJ"" Cruz","2025-0001"');
  });
});

describe("student type and status", () => {
  it("shows Freshman only for a first-time 1st year student, Continuing after that", () => {
    expect(studentTypeLabel({ admission_type: "new", year_level: 1 })).toBe("Freshman");
    expect(studentTypeLabel({ admission_type: "new", year_level: 3 })).toBe("Continuing");
    expect(studentTypeLabel({ admission_type: "returnee", year_level: 1 })).toBe("Continuing");
  });

  it("keeps Transferee and Shiftee whatever the year", () => {
    expect(studentTypeKey({ admission_type: "transferee", year_level: 1 })).toBe("transferee");
    expect(studentTypeKey({ admission_type: "shiftee", year_level: 4 })).toBe("shiftee");
  });

  it("stores the type the secretary picked as an admission type", () => {
    expect(ADMISSION_FOR_TYPE).toEqual({ freshman: "new", continuing: "returnee", transferee: "transferee", shiftee: "shiftee" });
  });

  it("shows Regular or Irregular while active, otherwise Graduated or Withdrawn", () => {
    expect(studentStatusLabel({ status: "active", standing: "regular" })).toBe("Regular");
    expect(studentStatusLabel({ status: "active", standing: "irregular" })).toBe("Irregular");
    expect(studentStatusKey({ status: "graduated", standing: "irregular" })).toBe("graduated");
    expect(studentStatusLabel({ status: "dropped", standing: "regular" })).toBe("Withdrawn");
    expect(studentStatusLabel({ status: "shifted_out", standing: "regular" })).toBe("Shifted out");
    expect(studentStatusLabel({ standing: "irregular" })).toBe("Irregular");
  });
});

describe("term average and academic record wording", () => {
  const row = (final_grade, units, status = "passed") => ({ final_grade, units, status });
  it("weights final grades by units", () => {
    expect(termAverage([row(1, 3), row(2, 2)])).toBe("1.40");
    expect(termAverage([row(5, 3, "failed"), row(1, 3)])).toBe("3.00");
  });
  it("gives no average until every subject that gets a grade has one", () => {
    expect(termAverage([row(1.5, 3), row(null, 3, "enrolled")])).toBeNull();
    expect(termAverage([row(1.5, 3), row(null, 3, "incomplete")])).toBeNull();
    expect(termAverage([])).toBeNull();
  });
  it("leaves NSTP and PATHFIT out, even when one has no final grade", () => {
    const named = (code, final_grade, units) => ({ code, final_grade, units, status: final_grade === null ? "incomplete" : "passed" });
    expect(termAverage([named("IT 101", 1.5, 3), named("PATHFIT 1", 3, 2), named("NSTP 11", null, 3)])).toBe("1.50");
    expect(termAverage([named("PATHFIT 1", 1, 2)])).toBeNull();
  });
  it("leaves dropped subjects out", () => {
    expect(termAverage([row(1.5, 3), row(null, 3, "dropped")])).toBe("1.50");
  });
  it("says what is missing instead of Enrolled", () => {
    expect(gradeStatusLabel("enrolled", null)).toBe("No grades yet");
    expect(gradeStatusLabel("enrolled", 1.75)).toBe("No final grade yet");
    expect(gradeStatusLabel("incomplete", null)).toBe("NC");
  });
});
