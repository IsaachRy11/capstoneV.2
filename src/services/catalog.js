import { supabase, unwrap } from "../lib/supabase";
import { cached, forget } from "../lib/cache";

// Programs, curriculum, terms and prerequisites rarely change, so they are fetched once and reused
// between pages for a few minutes (lib/cache.js). Curriculum edits clear the curriculum entries.

export const getCurrentTerm = () => cached("term:current", () =>
  unwrap(supabase.from("school_terms").select("*").eq("is_current", true).maybeSingle()));

// Official academic calendar entries (exam weeks, holidays, breaks, school activities), oldest first.
export const getCalendarEvents = () => cached("calendar:events", () =>
  unwrap(supabase.from("school_calendar_events").select("id, school_year, title, starts_on, ends_on, kind").order("starts_on").order("id")));

// The school year follows the start date: June to December belongs to the year that starts then,
// January to May to the one that began the year before.
export const schoolYearOf = (isoDate) => {
  const [y, m] = isoDate.split("-").map(Number);
  return m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

// Calendar entries are written by the secretary (RLS enforces it).
export async function saveCalendarEvent({ id, title, kind, starts_on, ends_on }) {
  const row = { title: title.trim(), kind, starts_on, ends_on, school_year: schoolYearOf(starts_on) };
  await unwrap(id
    ? supabase.from("school_calendar_events").update(row).eq("id", id)
    : supabase.from("school_calendar_events").insert(row));
  forget("calendar:events");
}

// Several dates at once (copying last year's calendar into a new school year), in one request: all or none.
// A date already on the calendar (same school year, title and day) is skipped, not doubled.
export async function addCalendarEvents(rows) {
  const clean = rows.map(({ title, kind, starts_on, ends_on }) => ({ title: title.trim(), kind, starts_on, ends_on, school_year: schoolYearOf(starts_on) }));
  await unwrap(supabase.from("school_calendar_events").upsert(clean, { onConflict: "school_year,title,starts_on", ignoreDuplicates: true }));
  forget("calendar:events");
}

export async function deleteCalendarEvent(id) {
  await unwrap(supabase.from("school_calendar_events").delete().eq("id", id));
  forget("calendar:events");
}

export const getTerms = () => cached("term:all", () =>
  unwrap(supabase.from("school_terms").select("*").order("school_year").order("semester")));

// Degree programs first (longest duration), then by code descending: BSIT, BSCS, ACT.
export const getPrograms = () => cached("programs", () =>
  unwrap(supabase.from("programs").select("id, code, name, duration_years"))
    .then((rows) => rows.sort((a, b) => b.duration_years - a.duration_years || b.code.localeCompare(a.code))));

// All subjects of the active curricula (optionally one program), in checklist order.
export const getCurriculum = (programCode) => cached(`curriculum:${programCode || "all"}`, () => {
  let q = supabase
    .from("curriculum_subjects")
    .select("id, year_level, semester, sort_order, code, title, units, kind, standing_required, curricula!inner(id, is_active, effective_school_year, programs!inner(id, code, name, duration_years))")
    .eq("curricula.is_active", true)
    .order("year_level")
    .order("semester")
    .order("sort_order");
  if (programCode) q = q.eq("curricula.programs.code", programCode);
  return unwrap(q);
});

// Official prerequisites from the AY 2024-2025 checklists (migration 0012). Rows: { subject_id, prerequisite_id }.
export const getPrerequisites = () => cached("curriculum:prerequisites", () =>
  unwrap(supabase.from("subject_prerequisites").select("subject_id, prerequisite_id")));

export async function addCurriculumSubject({ programCode, year_level, semester, code, title, units, kind }) {
  const curriculum = await unwrap(
    supabase.from("curricula").select("id, programs!inner(code)").eq("is_active", true).eq("programs.code", programCode).single()
  );
  const last = await unwrap(
    supabase.from("curriculum_subjects").select("sort_order").eq("curriculum_id", curriculum.id)
      .eq("year_level", year_level).eq("semester", semester).order("sort_order", { ascending: false }).limit(1)
  );
  forget("curriculum");
  return unwrap(
    supabase.from("curriculum_subjects").insert({
      curriculum_id: curriculum.id, year_level, semester, code: code.trim(), title: title.trim(),
      units, kind, sort_order: (last[0]?.sort_order ?? 0) + 1,
    })
  );
}

export const updateCurriculumSubject = (id, { year_level, semester, code, title, units, kind }) =>
  (forget("curriculum"), unwrap)(
    supabase.from("curriculum_subjects")
      .update({ year_level, semester, code: code.trim(), title: title.trim(), units, kind })
      .eq("id", id)
  );

// Fails with code 23503 if the subject is scheduled or has grades (protects student records).
// The sections that have a class for this subject in one term (what the system lists, not an official offer list).
export const getSubjectClasses = (subjectId, termId) =>
  unwrap(
    supabase.from("class_offerings").select("id, sections!inner(name, school_term_id)")
      .eq("curriculum_subject_id", subjectId).eq("sections.school_term_id", termId)
  ).then((rows) => rows.map((r) => r.sections.name).sort());

export const deleteCurriculumSubject = (id) =>
  (forget("curriculum"), unwrap)(supabase.from("curriculum_subjects").delete().eq("id", id));

// Number of class offerings in a term (sections × subjects)
export const countOfferings = (termId) =>
  unwrap(
    supabase.from("class_offerings").select("id, sections!inner(school_term_id)", { count: "exact", head: true })
      .eq("sections.school_term_id", termId)
  );
