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

// midterm/final: number or null. status: "auto" lets the database derive it from the final grade.
export const updateGrade = (enrollmentId, { midterm, final, status }) =>
  unwrap(
    supabase.from("enrollments").update({
      midterm_grade: midterm,
      final_grade: status === "incomplete" || status === "dropped" ? null : final,
      status: status === "auto" ? "enrolled" : status,
    }).eq("id", enrollmentId)
  );

// Creates the student, registers them in their block section for the current term,
// and enrolls them in that section's classes.
export async function createStudent({ id, first_name, last_name, email, programId, year_level, admission_type }, term) {
  const curriculum = await unwrap(
    supabase.from("curricula").select("id").eq("program_id", programId).eq("is_active", true).single()
  );
  await unwrap(
    supabase.from("students").insert({
      id: id.trim(), first_name: first_name.trim(), last_name: last_name.trim(), email: email.trim().toLowerCase(),
      program_id: programId, curriculum_id: curriculum.id, year_level, admission_type,
    })
  );
  if (!term) return { sectionName: null };

  const section = await unwrap(
    supabase.from("sections").select("id, name").eq("school_term_id", term.id)
      .eq("program_id", programId).eq("year_level", year_level).order("name").limit(1).maybeSingle()
  );
  if (!section) return { sectionName: null };

  await unwrap(supabase.from("registrations").insert({ student_id: id.trim(), school_term_id: term.id, section_id: section.id, year_level }));
  const offerings = await unwrap(supabase.from("class_offerings").select("id").eq("section_id", section.id));
  if (offerings.length) {
    await unwrap(supabase.from("enrollments").insert(offerings.map((o) => ({ student_id: id.trim(), offering_id: o.id }))));
  }
  return { sectionName: section.name };
}
