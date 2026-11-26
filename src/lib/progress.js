// Curriculum progress for one student: joins the official checklist with their enrollment history.
// Standing (regular/irregular) still comes from the database view; this only describes each subject.

// passed      — passed at least once
// in_progress — enrolled this term and not yet passed (shown as "Enrolled")
// back        — failed / INC / dropped and not passed since (same rule as v_student_deficiencies); shown as "Subjects to resolve"
// not_taken   — never enrolled (shown as "Not yet enrolled")
export const SUBJECT_STATE = {
  passed: { label: "Passed", tone: "ok" },
  in_progress: { label: "Enrolled", tone: "info" },
  back: { label: "Failed", tone: "bad" },
  not_taken: { label: "Not yet enrolled", tone: "neutral" },
};

const BACK_LABEL = { failed: "Failed", incomplete: "NC", dropped: "Dropped" };

// credits: subjects accepted from before (shiftees and transferees). A credit counts as passed, shown as "Credited".
export function buildProgress({ curriculum, history, prerequisites = [], credits = [] }) {
  const credited = new Set(credits.map((c) => c.curriculum_subject_id));
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
    if (passed || credited.has(c.id)) state = "passed";
    else if (current) state = "in_progress";
    else if (last && ["failed", "incomplete", "dropped"].includes(last.status)) state = "back";
    // The attempt whose grades are shown: the pass, else this term's, else the latest.
    const shown = passed || current || last;
    return {
      ...c,
      state,
      credited: !passed && credited.has(c.id),
      midterm: credited.has(c.id) && !passed ? null : shown?.midterm_grade ?? null,
      final: credited.has(c.id) && !passed ? null : shown?.final_grade ?? null,
      backReason: state === "back" ? BACK_LABEL[last.status] : null,
      attempts: rows.length,
    };
  });

  const byId = new Map(subjects.map((s) => [s.id, s]));
  // What passing a subject opens up: the subjects that list it as a prerequisite.
  for (const s of subjects) { s.unlocks = []; s.prereqs = []; }
  for (const p of prerequisites) {
    const pre = byId.get(p.prerequisite_id);
    const opens = byId.get(p.subject_id);
    if (pre && opens) { pre.unlocks.push(opens); opens.prereqs.push(pre); }
  }
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


// The semesters still ahead of a student standing at (year, semester): every curriculum term after it that still
// has subjects to take (not passed, not being taken now), in order. Summer (3) falls after the 2nd semester.
// Returns [{ year, semester, subjects }].
export function futureTerms(subjects, year, semester) {
  const groups = new Map();
  for (const s of subjects) {
    if (s.year_level < year || (s.year_level === year && s.semester <= semester)) continue;
    if (s.state === "passed" || s.state === "in_progress") continue;
    const key = `${s.year_level}-${s.semester}`;
    if (!groups.has(key)) groups.set(key, { year: s.year_level, semester: s.semester, subjects: [] });
    groups.get(key).subjects.push(s);
  }
  return [...groups.values()].sort((a, b) => a.year - b.year || a.semester - b.semester);
}

// Where a subject stands against its prerequisites, for a student at pos = { year, semester }:
//   "blocked" — a prerequisite was failed (INC / dropped too), or it should already have been taken and wasn't
//   "waiting" — the only missing prerequisites are subjects being taken right now
//   null      — nothing in the way (prerequisites still ahead in the curriculum are normal, not a problem)
export function prerequisiteStatus(subject, pos) {
  let waiting = false;
  for (const pre of subject.missingPrereqs || []) {
    if (pre.state === "back") return "blocked";
    if (pre.state === "in_progress") { waiting = true; continue; }
    const behind = pre.year_level < pos.year || (pre.year_level === pos.year && pre.semester <= pos.semester);
    if (pre.state === "not_taken" && behind) return "blocked";
  }
  return waiting ? "waiting" : null;
}

// A subject's prerequisites written like the curriculum's Prerequisite column: course numbers, then a year standing.
// e.g. "IT 201, IT 202" · "4th year standing" · "" when it has none.
export function prerequisiteText(subject) {
  const parts = (subject.prereqs || []).map((p) => p.code);
  if (subject.standing_required) parts.push(`${ordinal(subject.standing_required)} year standing`);
  return parts.join(", ");
}

// Ready to graduate = every subject of the student's curriculum is passed. Returns what is still missing.
export function graduationCheck(progress) {
  const missing = progress.subjects.filter((s) => s.state !== "passed");
  return { total: progress.subjects.length, missing, eligible: progress.subjects.length > 0 && missing.length === 0 };
}

// The word for a subject's state on screen.
export const stateLabel = (s) => (s.credited ? "Credited" : s.state === "back" ? s.backReason : SUBJECT_STATE[s.state].label);

// What can still be credited: not passed or credited yet, and not being taken now.
export const creditable = (subjects) => subjects.filter((s) => s.state !== "passed" && s.state !== "in_progress");

// The year a term card is titled with: the highest year among that term's subjects, never below a year already
// passed in an earlier term or credited (the same rule as the student's year level). One late subject from a lower
// year therefore can't rename the whole term.
export function termYear(history, term, credits = []) {
  const mine = history.filter((r) => r.school_term_id === term.school_term_id);
  const counted = mine.some((r) => r.status !== "dropped") ? mine.filter((r) => r.status !== "dropped") : mine;
  const before = history.filter((r) => r.status === "passed" && (r.school_year + r.semester) < (term.school_year + term.semester));
  return Math.max(...[...counted, ...before].map((r) => Number(r.curriculum_year)),
    ...credits.map((c) => Number(c.curriculum_subjects?.year_level || 0)));
}

// The prerequisites that are actually in the way (failed, or should already have been taken).
export const blockingPrereqs = (subject, pos) => (subject.missingPrereqs || []).filter((pre) =>
  pre.state === "back" || (pre.state === "not_taken" && (pre.year_level < pos.year || (pre.year_level === pos.year && pre.semester <= pos.semester))));

// "4 semesters and 1 summer": summers are counted apart from the semesters. ahead comes from futureTerms().
export function termsLeft(ahead) {
  const summers = ahead.filter((t) => t.semester === 3).length;
  const semesters = ahead.length - summers;
  const words = `${semesters === 1 ? "semester" : "semesters"}${summers ? ` and ${summers} ${summers === 1 ? "summer" : "summers"}` : ""}`;
  return { semesters, summers, words };
}
