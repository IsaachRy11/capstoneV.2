import { sumUnits } from "../../lib/format";

// What each summary card on the subject tracker opens (?view=units|passed|enrolled|failed):
// the title, which subjects to list, the big sentence on top and the text for an empty list.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const VIEWS = {
  units: {
    title: "Units earned",
    pick: (p) => p.subjects.filter((s) => s.state === "passed"),
    headline: (rows, p) => `${p.unitsEarned} of ${p.totalUnits} units`,
    text: "These are the units from every subject you've passed.",
    empty: "You haven't passed any subjects yet.",
  },
  passed: {
    title: "Subjects passed",
    pick: (p) => p.subjects.filter((s) => s.state === "passed"),
    headline: (rows, p) => `${p.passedCount} of ${p.total} subjects`,
    text: "Every subject you've passed, with your grades.",
    empty: "You haven't passed any subjects yet.",
  },
  enrolled: {
    title: "This semester",
    pick: (p) => p.inProgress,
    headline: (rows) => `${plural(rows.length, "subject", "subjects")} · ${sumUnits(rows)} units`,
    text: "The subjects you're enrolled in now. Final grades come at the end of the term.",
    empty: "You're not enrolled in any subjects this semester.",
  },
  failed: {
    title: "Failed subjects",
    pick: (p) => p.back,
    headline: (rows) => plural(rows.length, "subject", "subjects"),
    text: "Failed, INC or dropped, and not passed since. Retake them when they're offered again.",
    empty: "No failed subjects. Keep it up.",
  },
};
