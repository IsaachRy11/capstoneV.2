// Curriculum progress for one student: joins the official checklist with their enrollment history.
// Standing (regular/irregular) still comes from the database view; this only describes each subject.

// passed      — passed at least once
// in_progress — enrolled this term and not yet passed (shown as "Enrolled")
// back        — failed / INC / dropped and not passed since (same rule as v_student_deficiencies); shown as "Failed subjects"
// not_taken   — never enrolled (shown as "Not yet enrolled")
export const SUBJECT_STATE = {
  passed: { label: "Passed", tone: "ok" },
  in_progress: { label: "Enrolled", tone: "info" },
  back: { label: "Failed", tone: "bad" },
  not_taken: { label: "Not yet enrolled", tone: "neutral" },
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
// hasSummer(year): whether the curriculum has summer subjects after that year (BSIT/BSCS: after 3rd year).
export function nextTermFor(term, yearLevel, durationYears, hasSummer = () => false) {
  if (!term) return null;
  const next =
    term.semester === 1 ? { year: yearLevel, semester: 2 }
    : term.semester === 2 && hasSummer(yearLevel) ? { year: yearLevel, semester: 3 }
    : { year: yearLevel + 1, semester: 1 };
  return next.year > durationYears ? null : next;
}

// What a subject still needs before it can be taken: unpassed prerequisites and/or a year standing.
// e.g. "Needs IT 201, IT 202 first" · "Needs 4th year standing"
export function requirementText(subject, yearLevel) {
  const parts = [];
  if (subject.missingPrereqs?.length) parts.push(`${subject.missingPrereqs.map((p) => p.code).join(", ")} first`);
  if (subject.standing_required && yearLevel < subject.standing_required) parts.push(`${ordinal(subject.standing_required)} year standing`);
  return parts.length ? `Needs ${parts.join(" and ")}` : "";
}
const ordinal = (n) => ({ 1: "1st", 2: "2nd", 3: "3rd" })[n] || `${n}th`;

