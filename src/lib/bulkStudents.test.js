import { describe, expect, it } from "vitest";
import { parseStudentRows, splitLine } from "./bulkStudents";

const programs = [
  { id: 1, code: "BSIT", name: "Bachelor of Science in Information Technology", duration_years: 4 },
  { id: 3, code: "ACT", name: "Associate in Computer Technology", duration_years: 2 },
];

describe("splitLine", () => {
  it("splits commas, tabs and semicolons, and keeps quoted commas together", () => {
    expect(splitLine("a,b,c")).toEqual(["a", "b", "c"]);
    expect(splitLine("a\tb\tc")).toEqual(["a", "b", "c"]);
    expect(splitLine("a;b;c")).toEqual(["a", "b", "c"]);
    expect(splitLine('2026-0001,"Reyes, Jr.",Ana')).toEqual(["2026-0001", "Reyes, Jr.", "Ana"]);
  });
});

describe("parseStudentRows", () => {
  it("reads valid rows, skips a header, and defaults the student type from the year", () => {
    const rows = parseStudentRows("Student ID,Last name,First name,Program,Year level,Student type\n2027-0001,Reyes,Ana,BSIT,1\n2027-0002,Cruz,Ben,bsit,2", programs);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "2027-0001", last_name: "Reyes", first_name: "Ana", programId: 1, year_level: 1, studentType: "freshman", errors: [] });
    expect(rows[1]).toMatchObject({ programId: 1, year_level: 2, studentType: "continuing", errors: [] });
  });

  it("accepts a pasted Excel selection (tabs) and a type by name", () => {
    const [r] = parseStudentRows("2027-0003\tLim\tCy\tACT\t2\tTransferee", programs);
    expect(r).toMatchObject({ programId: 3, year_level: 2, studentType: "transferee", errors: [] });
  });

  it("explains what is wrong with a row", () => {
    const rows = parseStudentRows(["27-1,Reyes,Ana,BSIT,1", "2027-0004,,Ben,BSIT,1", "2027-0005,Cruz,Di,XYZ,1", "2027-0006,Uy,Ed,ACT,3", "2027-0007,Go,Flo,BSIT,2,Freshman", "2027-0008,Ho,Gil,BSIT,1,Alien"].join("\n"), programs);
    expect(rows[0].errors[0]).toMatch(/Student ID must look like/);
    expect(rows[1].errors).toContain("Last name is missing");
    expect(rows[2].errors[0]).toMatch(/Program must be one of BSIT, ACT/);
    expect(rows[3].errors[0]).toMatch(/Year level must be 1 to 2/);
    expect(rows[4].errors).toContain("A Freshman must be in 1st year");
    expect(rows[5].errors[0]).toMatch(/Student type must be/);
  });

  it("flags an ID that is repeated in the file or already exists", () => {
    const rows = parseStudentRows("2027-0001,A,B,BSIT,1\n2027-0001,C,D,BSIT,1\n2025-0001,E,F,BSIT,1", programs, new Set(["2025-0001"]));
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors).toContain("This ID appears twice in the file");
    expect(rows[2].errors).toContain("A student with this ID already exists");
  });

  it("ignores empty lines", () => {
    expect(parseStudentRows("\n\n2027-0001,A,B,BSIT,1\n\n", programs)).toHaveLength(1);
  });
});
