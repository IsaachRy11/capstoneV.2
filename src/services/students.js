import { supabase, unwrap } from "../lib/supabase";

// v_student_overview computes standing, section and deficiency counts in the database.
export const listStudents = () =>
  unwrap(supabase.from("v_student_overview").select("*").order("last_name").order("first_name"));

export const getStudent = (id) =>
  unwrap(supabase.from("v_student_overview").select("*").eq("id", id).maybeSingle());

export const getHistory = (id) =>
  unwrap(
    supabase.from("v_enrollment_details").select("*").eq("student_id", id)
      .order("school_year").order("semester").order("code")
  );

export const getSectionInfo = (sectionId) =>
  sectionId
    ? unwrap(supabase.from("sections").select("id, name, capacity, rooms(name)").eq("id", sectionId).maybeSingle())
    : Promise.resolve(null);

// A student's classes in one term, with schedule.
export const getTermClasses = (studentId, termId) =>
  unwrap(
    supabase.from("enrollments")
      .select("id, midterm_grade, final_grade, status, class_offerings!inner(id, curriculum_subjects(code, title, units, sort_order), class_meetings(weekday, starts_at, ends_at, rooms(name)), sections!inner(name, school_term_id))")
      .eq("student_id", studentId)
      .eq("class_offerings.sections.school_term_id", termId)
  ).then((rows) => rows.sort((a, b) =>
    a.class_offerings.curriculum_subjects.sort_order - b.class_offerings.curriculum_subjects.sort_order));

// Failed / INC / dropped subjects not cleared by a later pass (computed by the database view).
export const getDeficiencies = (id) =>
  unwrap(
    supabase.from("v_student_deficiencies")
      .select("enrollment_id, code, title, status, final_grade, school_year, semester, curriculum_year")
      .eq("student_id", id)
  );

// Who changed which grade, newest first (secretary only; RLS returns nothing to students).
export const getGradeChanges = (id) =>
  unwrap(supabase.from("v_grade_changes").select("*").eq("student_id", id).order("changed_at", { ascending: false }).limit(50));

// Saves several grades in ONE database transaction: all succeed or none do.
// changes: [{ enrollmentId, midterm, final, status: "auto" | "incomplete" | "dropped" }]
export const saveGrades = (changes) =>
  unwrap(
    supabase.rpc("save_grades", {
      p_changes: changes.map((c) => ({ enrollment_id: c.enrollmentId, midterm: c.midterm, final: c.final, status: c.status })),
    })
  );

// Creates the student, registers them in their block section for the current term and enrolls
// them in that section's classes, all in one database transaction (public.add_student).
export async function createStudent({ id, first_name, last_name, email, programId, year_level, admission_type }) {
  const sectionName = await unwrap(
    supabase.rpc("add_student", {
      p_id: id, p_first_name: first_name, p_last_name: last_name, p_email: email,
      p_program_id: programId, p_year_level: year_level, p_admission_type: admission_type,
    })
  );
  return { sectionName };
}
