import { describe, expect, it } from "vitest";
import { pageList } from "./pagination";

describe("pageList", () => {
  it("lists every page when there are few", () => {
    expect(pageList(0, 1)).toEqual([0]);
    expect(pageList(2, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(pageList(0, 0)).toEqual([]);
  });
  it("keeps the first and last page and the pages around the current one", () => {
    expect(pageList(0, 12)).toEqual([0, 1, "gap-end", 11]);
    expect(pageList(5, 12)).toEqual([0, "gap-start", 4, 5, 6, "gap-end", 11]);
    expect(pageList(11, 12)).toEqual([0, "gap-start", 10, 11]);
    expect(pageList(2, 12)).toEqual([0, 1, 2, 3, "gap-end", 11]);
  });
  it("shows only the current page between the ends on phones", () => {
    expect(pageList(5, 12, 0)).toEqual([0, "gap-start", 5, "gap-end", 11]);
    expect(pageList(0, 12, 0)).toEqual([0, "gap-end", 11]);
  });
  it("clamps a page past the end", () => {
    expect(pageList(40, 12)).toEqual([0, "gap-start", 10, 11]);
  });
});
