import { describe, expect, it } from "vitest";
import { carryOver, classStatus, edgeText, edgesOn, shiftYear, termEdges } from "./calendar";

describe("copying last year's calendar", () => {
  it("moves a date to the same day a year later", () => {
    expect(shiftYear("2026-11-30")).toBe("2027-11-30");
    expect(shiftYear("2027-01-01")).toBe("2028-01-01");
    expect(shiftYear("2028-02-29")).toBe("2029-02-28");
  });
  it("ticks fixed holidays only and leaves out start and end of classes", () => {
    const events = [
      { id: 1, school_year: "2026-2027", kind: "classes", title: "Start of Classes", starts_on: "2026-07-06", ends_on: "2026-07-06" },
      { id: 2, school_year: "2026-2027", kind: "holiday", title: "Bonifacio Day", starts_on: "2026-11-30", ends_on: "2026-11-30" },
      { id: 3, school_year: "2026-2027", kind: "holiday", title: "Chinese New Year", starts_on: "2027-02-06", ends_on: "2027-02-06" },
      { id: 4, school_year: "2026-2027", kind: "exam", title: "Midterm Exams", starts_on: "2026-09-01", ends_on: "2026-09-05" },
      { id: 5, school_year: "2025-2026", kind: "holiday", title: "Old", starts_on: "2025-11-30", ends_on: "2025-11-30" },
    ];
    expect(carryOver(events, "2026-2027")).toEqual([
      { key: 2, title: "Bonifacio Day", kind: "holiday", starts_on: "2027-11-30", ends_on: "2027-11-30", movable: false, ticked: true },
      { key: 3, title: "Chinese New Year", kind: "holiday", starts_on: "2028-02-06", ends_on: "2028-02-06", movable: true, ticked: false },
      { key: 4, title: "Midterm Exams", kind: "exam", starts_on: "2027-09-01", ends_on: "2027-09-05", movable: false, ticked: false },
    ]);
  });
});

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

describe("semester flags", () => {
  it("marks each semester's first and last day of classes", () => {
    const edges = termEdges(terms);
    expect(edges).toHaveLength(4);
    expect(edgesOn(edges, new Date(2026, 6, 6)).map(edgeText)).toEqual(["1st Semester starts"]);
    expect(edgesOn(edges, new Date(2026, 10, 7)).map(edgeText)).toEqual(["1st Semester ends"]);
    expect(edgesOn(edges, new Date(2026, 10, 23)).map(edgeText)).toEqual(["2nd Semester starts"]);
    expect(edgesOn(edges, new Date(2026, 10, 24))).toEqual([]);
  });
});
