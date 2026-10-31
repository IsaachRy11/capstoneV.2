import { describe, expect, it } from "vitest";
import {
  formatGrade, formatTime, inferSubjectKind, initials, meetingDays, normKey,
  scheduleLines, shortProgramName, sumUnits, termLabel, timeRange, toCsv,
} from "./format";

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

describe("CSV export", () => {
  it("quotes every cell and escapes quotes", () => {
    const csv = toCsv([{ name: 'Ana "AJ" Cruz', id: "2025-0001" }], [
      { label: "Name", value: (r) => r.name },
      { label: "ID", value: (r) => r.id },
    ]);
    expect(csv).toBe('"Name","ID"\n"Ana ""AJ"" Cruz","2025-0001"');
  });
});
