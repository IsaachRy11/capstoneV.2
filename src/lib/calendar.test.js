import { describe, expect, it } from "vitest";
import { classStatus } from "./calendar";

// The SY 2026-2027 shape: 1st semester ends Nov 7, break until Nov 21, 2nd semester starts Nov 23.
const terms = [
  { semester: 1, starts_on: "2026-07-06", ends_on: "2026-11-07" },
  { semester: 2, starts_on: "2026-11-23", ends_on: "2027-04-23" },
];
const events = [
  { id: 1, title: "Final Exams", starts_on: "2026-11-03", ends_on: "2026-11-07", kind: "exam" },
  { id: 2, title: "Semestral Break", starts_on: "2026-11-09", ends_on: "2026-11-21", kind: "break" },
  { id: 3, title: "Bonifacio Day", starts_on: "2026-11-30", ends_on: "2026-11-30", kind: "holiday" },
];
const on = (y, m, d) => classStatus(new Date(y, m - 1, d, 10), terms, events);

describe("classStatus", () => {
  it("says there are no classes during the semestral break and when the next semester starts", () => {
    const s = on(2026, 11, 16);
    expect(s).toMatchObject({ kind: "none", title: "Semestral Break", span: "Nov 9 – 21", resumesLabel: "2nd Semester starts" });
    expect(s.resumes.getDate()).toBe(23);
  });

  it("says there are no classes on a holiday and that classes resume the next day", () => {
    const s = on(2026, 11, 30);
    expect(s).toMatchObject({ kind: "none", title: "Bonifacio Day", resumesLabel: "Classes resume" });
    expect(s.resumes.getDate()).toBe(1);
  });

  it("notes an exam week", () => {
    expect(on(2026, 11, 4)).toMatchObject({ kind: "exam", title: "Final Exams" });
  });

  it("treats an ordinary school day as classes", () => {
    expect(on(2026, 8, 12)).toEqual({ kind: "classes" });
    expect(on(2026, 11, 24)).toEqual({ kind: "classes" });
  });

  it("handles the gap between semesters even without a calendar entry for it", () => {
    const s = classStatus(new Date(2026, 10, 22, 9), terms, []);
    expect(s).toMatchObject({ kind: "none", title: "Between semesters", resumesLabel: "2nd Semester starts" });
  });
});
