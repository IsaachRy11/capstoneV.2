import { describe, expect, it } from "vitest";
import { buildProgress, futureTerms, nextTermFor, prerequisiteStatus, prerequisiteText, requirementText } from "./progress";

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

  it("marks a failed subject that was never passed as a failed subject", () => {
    expect(s["IT 103"]).toMatchObject({ state: "back", backReason: "Failed" });
  });

  it("treats NC as a subject still to resolve", () => {
    expect(s["GE 4"]).toMatchObject({ state: "back", backReason: "NC" });
  });

  it("shows a current-term subject as enrolled, with its midterm", () => {
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

describe("nextTermFor", () => {
  it("goes from 1st to 2nd semester in the same year", () => {
    expect(nextTermFor({ semester: 1 }, 2, 4)).toEqual({ year: 2, semester: 2 });
  });

  it("goes from 2nd semester to the next year's 1st semester", () => {
    expect(nextTermFor({ semester: 2 }, 2, 4)).toEqual({ year: 3, semester: 1 });
  });

  it("goes to summer when the curriculum has summer subjects after that year", () => {
    const summerAfter3 = (y) => y === 3;
    expect(nextTermFor({ semester: 2 }, 3, 4, summerAfter3)).toEqual({ year: 3, semester: 3 });
    expect(nextTermFor({ semester: 3 }, 3, 4, summerAfter3)).toEqual({ year: 4, semester: 1 });
    expect(nextTermFor({ semester: 2 }, 2, 4, summerAfter3)).toEqual({ year: 3, semester: 1 });
  });

  it("returns null in the last semester of the program", () => {
    expect(nextTermFor({ semester: 2 }, 4, 4)).toBeNull();
    expect(nextTermFor({ semester: 2 }, 2, 2)).toBeNull();
  });
});

describe("requirementText", () => {
  it("lists unpassed prerequisites and a year standing the student doesn't have yet", () => {
    const s = { missingPrereqs: [{ code: "IT 201" }, { code: "IT 202" }], standing_required: 4 };
    expect(requirementText(s, 3)).toBe("Needs IT 201, IT 202 first and 4th year standing");
    expect(requirementText({ missingPrereqs: [], standing_required: 3 }, 3)).toBe("");
    expect(requirementText({ missingPrereqs: [], standing_required: 3 }, 2)).toBe("Needs 3rd year standing");
  });
});

describe("unlocks and futureTerms", () => {
  const prog = buildProgress({ curriculum, history, prerequisites: [{ subject_id: 4, prerequisite_id: 3 }, { subject_id: 2, prerequisite_id: 1 }] });
  const byCode = bySubject(prog);

  it("lists what passing a subject opens", () => {
    expect(byCode["IT 201"].unlocks.map((x) => x.code)).toEqual(["IT 204"]);
    expect(byCode["IT 101"].unlocks.map((x) => x.code)).toEqual(["IT 103"]);
    expect(byCode["IT 204"].unlocks).toEqual([]);
  });

  it("lists the remaining semesters in order, without passed or current subjects", () => {
    // Student standing in 2nd year, 1st semester: only IT 204 (2-2) is still ahead.
    const ahead = futureTerms(prog.subjects, 2, 1);
    expect(ahead.map((t) => [t.year, t.semester, t.subjects.map((x) => x.code)])).toEqual([[2, 2, ["IT 204"]]]);
  });

  it("puts summer between the 2nd semester and the next year", () => {
    const subs = [
      { id: 1, year_level: 3, semester: 3, state: "not_taken" },
      { id: 2, year_level: 4, semester: 1, state: "not_taken" },
      { id: 3, year_level: 3, semester: 2, state: "not_taken" },
    ];
    expect(futureTerms(subs, 3, 1).map((t) => [t.year, t.semester])).toEqual([[3, 2], [3, 3], [4, 1]]);
  });
});

describe("prerequisiteStatus", () => {
  const pos = { year: 2, semester: 1 };
  const pre = (state, year_level, semester) => ({ state, year_level, semester });

  it("is blocked by a failed prerequisite or one that should already have been taken", () => {
    expect(prerequisiteStatus({ missingPrereqs: [pre("back", 1, 2)] }, pos)).toBe("blocked");
    expect(prerequisiteStatus({ missingPrereqs: [pre("not_taken", 1, 1)] }, pos)).toBe("blocked");
  });

  it("is waiting when the prerequisite is being taken now", () => {
    expect(prerequisiteStatus({ missingPrereqs: [pre("in_progress", 2, 1)] }, pos)).toBe("waiting");
  });

  it("is fine when the prerequisite is still ahead in the normal order", () => {
    expect(prerequisiteStatus({ missingPrereqs: [pre("not_taken", 2, 2)] }, pos)).toBeNull();
    expect(prerequisiteStatus({ missingPrereqs: [] }, pos)).toBeNull();
  });
});

describe("prerequisiteText", () => {
  it("lists course numbers like the curriculum, then a year standing", () => {
    const prog = buildProgress({ curriculum, history, prerequisites: [{ subject_id: 4, prerequisite_id: 3 }, { subject_id: 4, prerequisite_id: 2 }] });
    expect(prerequisiteText(bySubject(prog)["IT 204"])).toBe("IT 201, IT 103");
    expect(prerequisiteText(bySubject(prog)["IT 101"])).toBe("");
    expect(prerequisiteText({ prereqs: [{ code: "CAPSTONE 1" }], standing_required: 4 })).toBe("CAPSTONE 1, 4th year standing");
    expect(prerequisiteText({ prereqs: [], standing_required: 4 })).toBe("4th year standing");
  });
});
