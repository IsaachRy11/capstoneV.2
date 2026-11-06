import { describe, expect, it } from "vitest";
import { daysLeft, monthCells, parseDate, sameDay, termOn, termRanges } from "./calendar";

describe("calendar helpers", () => {
  it("parses a date string as a local date", () => {
    const d = parseDate("2026-08-10");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 7, 10]);
  });

  it("builds Sunday-first month grids of 5 or 6 weeks", () => {
    const feb2026 = monthCells(new Date(2026, 1, 1)); // Feb 1 2026 is a Sunday, 28 days
    expect(feb2026).toHaveLength(35);
    expect(sameDay(feb2026[0], new Date(2026, 1, 1))).toBe(true);
    const aug2026 = monthCells(new Date(2026, 7, 1)); // Aug 1 2026 is a Saturday, 31 days
    expect(aug2026).toHaveLength(42);
    expect(aug2026[0].getDay()).toBe(0);
  });

  it("finds the term a day belongs to, and skips terms without dates", () => {
    const ranges = termRanges([
      { id: 1, semester: 1, starts_on: "2026-08-10", ends_on: "2026-12-18" },
      { id: 2, semester: 2, starts_on: null, ends_on: null },
    ]);
    expect(ranges).toHaveLength(1);
    expect(termOn(ranges, new Date(2026, 9, 1))?.id).toBe(1);
    expect(termOn(ranges, new Date(2026, 11, 19))).toBeUndefined();
  });

  it("counts the days left in a term, never below zero", () => {
    const [r] = termRanges([{ starts_on: "2026-08-10", ends_on: "2026-12-18" }]);
    expect(daysLeft(r, new Date(2026, 11, 8, 15, 30))).toBe(10);
    expect(daysLeft(r, new Date(2026, 11, 18))).toBe(0);
    expect(daysLeft(r, new Date(2027, 0, 5))).toBe(0);
  });
});
