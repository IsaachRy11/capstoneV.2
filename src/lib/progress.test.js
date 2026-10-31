import { describe, expect, it } from "vitest";
import { buildProgress, midtermWarning, nextTermFor } from "./progress";

const curriculum = [
  { id: 1, code: "IT 101", units: 3, year_level: 1, semester: 1 },
  { id: 2, code: "IT 103", units: 3, year_level: 1, semester: 2 },
  { id: 3, code: "IT 201", units: 3, year_level: 2, semester: 1 },
  { id: 4, code: "IT 204", units: 3, year_level: 2, semester: 2 },
  { id: 5, code: "GE 4", units: 3, year_level: 1, semester: 2 },
];

const history = [
  { subject_id: 1, status: "failed", midterm_grade: 5, final_grade: 5, is_current: false },
  { subject_id: 1, status: "passed", midterm_grade: 2, final_grade: 2.25, is_current: false },
  { subject_id: 2, status: "failed", midterm_grade: 5, final_grade: 5, is_current: false },
  { subject_id: 3, status: "enrolled", midterm_grade: 2.75, final_grade: null, is_current: true },
  { subject_id: 5, status: "incomplete", midterm_grade: 2.5, final_grade: null, is_current: false },
];

const bySubject = (p) => Object.fromEntries(p.subjects.map((s) => [s.code, s]));

describe("buildProgress", () => {
  const p = buildProgress({ curriculum, history, prerequisites: [{ subject_id: 4, prerequisite_id: 2 }] });
  const s = bySubject(p);

  it("counts a retaken subject as passed, with the passing attempt's grades", () => {
    expect(s["IT 101"]).toMatchObject({ state: "passed", midterm: 2, final: 2.25, attempts: 2 });
  });

  it("marks a failed subject that was never passed as a back subject", () => {
    expect(s["IT 103"]).toMatchObject({ state: "back", backReason: "Failed" });
  });

  it("treats INC as a back subject", () => {
    expect(s["GE 4"]).toMatchObject({ state: "back", backReason: "INC" });
  });

  it("shows a current-term subject as taking now, with its midterm", () => {
    expect(s["IT 201"]).toMatchObject({ state: "in_progress", midterm: 2.75, final: null });
  });

  it("flags an untaken subject whose prerequisite isn't passed", () => {
    expect(s["IT 204"].state).toBe("not_taken");
    expect(s["IT 204"].missingPrereqs.map((x) => x.code)).toEqual(["IT 103"]);
  });

  it("only counts passed subjects toward units earned", () => {
    expect(p).toMatchObject({ unitsEarned: 3, totalUnits: 15, passedCount: 1 });
    expect(p.back).toHaveLength(2);
    expect(p.inProgress).toHaveLength(1);
  });
});

describe("midtermWarning", () => {
  it("passes quietly at 2.50 and better", () => {
    expect(midtermWarning(1)).toBeNull();
    expect(midtermWarning(2.5)).toBeNull();
  });

  it("warns at 2.75 – 3.00 (still passing)", () => {
    expect(midtermWarning(2.75)?.level).toBe("warn");
    expect(midtermWarning(3)?.level).toBe("warn");
  });

  it("flags anything past 3.00 as failing", () => {
    expect(midtermWarning(5)?.level).toBe("bad");
  });

  it("ignores a missing grade", () => {
    expect(midtermWarning(null)).toBeNull();
    expect(midtermWarning(undefined)).toBeNull();
  });
});

describe("nextTermFor", () => {
  it("goes from 1st to 2nd semester in the same year", () => {
    expect(nextTermFor({ semester: 1 }, 2, 4)).toEqual({ year: 2, semester: 2 });
  });

  it("goes from 2nd semester to the next year's 1st semester", () => {
    expect(nextTermFor({ semester: 2 }, 2, 4)).toEqual({ year: 3, semester: 1 });
  });

  it("returns null in the last semester of the program", () => {
    expect(nextTermFor({ semester: 2 }, 4, 4)).toBeNull();
    expect(nextTermFor({ semester: 2 }, 2, 2)).toBeNull();
  });
});
