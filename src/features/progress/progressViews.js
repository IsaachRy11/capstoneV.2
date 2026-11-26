// What each summary card on the Roadmap opens (?view=units|passed):
// the title, which subjects to list, the big sentence on top and the text for an empty list.
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
    text: "Every subject you've passed. Your grades are on the Academic record.",
    empty: "You haven't passed any subjects yet.",
  },
};
