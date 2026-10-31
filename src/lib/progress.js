// Curriculum progress for one student: joins the official checklist with their enrollment history.
// Standing (regular/irregular) still comes from the database view; this only describes each subject.

// passed      — passed at least once
// in_progress — enrolled this term and not yet passed
// back        — failed / INC / dropped and not passed since (same rule as v_student_deficiencies)
// not_taken   — never enrolled
export const SUBJECT_STATE = {
  passed: { label: "Passed", tone: "ok" },
  in_progress: { label: "Taking now", tone: "info" },
  back: { label: "Back subject", tone: "bad" },
  not_taken: { label: "Not yet taken", tone: "neutral" },
};

const BACK_LABEL = { failed: "Failed", incomplete: "INC", dropped: "Dropped" };

export function buildProgress({ curriculum, history, prerequisites = [] }) {
  const attempts = new Map(); // subject id → enrollment rows, oldest first
  for (const h of history) {
    if (!attempts.has(h.subject_id)) attempts.set(h.subject_id, []);
    attempts.get(h.subject_id).push(h);
  }

  const subjects = curriculum.map((c) => {
    const rows = attempts.get(c.id) || [];
    const passed = rows.find((r) => r.status === "passed");
    const current = rows.find((r) => r.is_current && r.status === "enrolled");
    const last = rows[rows.length - 1];
    let state = "not_taken";
    if (passed) state = "passed";
    else if (current) state = "in_progress";
    else if (last && ["failed", "incomplete", "dropped"].includes(last.status)) state = "back";
    // The attempt whose grades are shown: the pass, else this term's, else the latest.
    const shown = passed || current || last;
    return {
      ...c,
      state,
      midterm: shown?.midterm_grade ?? null,
      final: shown?.final_grade ?? null,
      backReason: state === "back" ? BACK_LABEL[last.status] : null,
      attempts: rows.length,
    };
  });

  const byId = new Map(subjects.map((s) => [s.id, s]));
  for (const s of subjects) {
    s.missingPrereqs = prerequisites
      .filter((p) => p.subject_id === s.id)
      .map((p) => byId.get(p.prerequisite_id))
      .filter((pre) => pre && pre.state !== "passed");
  }

  const total = subjects.length;
  const totalUnits = subjects.reduce((t, s) => t + Number(s.units), 0);
  const passedList = subjects.filter((s) => s.state === "passed");
  return {
    subjects,
    total,
    totalUnits,
    passedCount: passedList.length,
    unitsEarned: passedList.reduce((t, s) => t + Number(s.units), 0),
    inProgress: subjects.filter((s) => s.state === "in_progress"),
    back: subjects.filter((s) => s.state === "back"),
  };
}

// The semester after `term` for a student in `yearLevel`, or null if they finish this term.
export function nextTermFor(term, yearLevel, durationYears) {
  if (!term) return null;
  const next = term.semester === 1 ? { year: yearLevel, semester: 2 } : { year: yearLevel + 1, semester: 1 };
  return next.year > durationYears ? null : next;
}

// Midterm early warning. At SJC 1.00–3.00 passes and anything past 3.00 (5.00) fails.
// 2.75–3.00 still passes but is flagged so the student can act before finals.
export function midtermWarning(grade) {
  if (grade === null || grade === undefined) return null;
  const g = Number(grade);
  if (g > 3) return { level: "bad", text: "Failing at midterm" };
  if (g >= 2.75) return { level: "warn", text: "Close to the passing line" };
  return null;
}
