import { supabase, unwrap } from "../lib/supabase";

// v_student_overview computes standing, section and deficiency counts in the database.
const PAGE = 1000; // the most rows the database returns in one request
export async function listStudents() {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await unwrap(supabase.from("v_student_overview").select("*").order("last_name").order("first_name").order("id").range(from, from + PAGE - 1));
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

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

// Secretary only (row-level security). Only "active" students can be enrolled in classes.
export const updateStudentStatus = (id, status) =>
  unwrap(supabase.from("students").update({ status }).eq("id", id));

// The student's own unit limit (migration 0017). Null while that column doesn't exist yet, so the page still loads.
export const getUnitLimit = (id) =>
  unwrap(supabase.from("students").select("max_units").eq("id", id).maybeSingle()).then((r) => r?.max_units ?? null).catch(() => null);

export const updateUnitLimit = (id, units) =>
  unwrap(supabase.from("students").update({ max_units: units }).eq("id", id));

// Secretary only. Sets a new one-time password (done on the server, which holds the secret key) and
// returns it once. The student must choose their own password at the next sign-in.
export async function resetStudentPassword(id) {
  const { data, error } = await supabase.functions.invoke("reset-student-password", { body: { studentId: id } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error || "The password could not be reset. Try again.");
  }
  return data.tempPassword;
}

// Secretary only. The database refuses when the student has grades or class history.
// The sign-in account is removed afterwards on the server (it needs a secret key); a failure there is not fatal.
export async function deleteStudent(id) {
  await unwrap(supabase.from("students").delete().eq("id", id));
  await supabase.functions.invoke("delete-student-login", { body: { studentId: id } });
}

// Saves several grades in ONE database transaction: all succeed or none do.
// changes: [{ enrollmentId, midterm, final, status: "auto" | "incomplete" | "dropped" }]
export const saveGrades = (changes) =>
  unwrap(
    supabase.rpc("save_grades", {
      p_changes: changes.map((c) => ({ enrollment_id: c.enrollmentId, midterm: c.midterm, final: c.final, status: c.status })),
    })
  );

// Creates the student only (public.add_student). Enrolling happens per subject on Section allocations > Add students.
export async function createStudent({ id, first_name, last_name, programId, year_level, admission_type }) {
  const params = {
    p_id: id, p_first_name: first_name, p_last_name: last_name,
    p_program_id: programId, p_year_level: year_level, p_admission_type: admission_type,
  };
  await unwrap(supabase.rpc("add_student", params));
  // The sign-in account is made on the server (it needs a secret key). If that fails the student still exists.
  // It returns a one-time password, shown once to the secretary to hand to the student.
  const { data, error } = await supabase.functions.invoke("create-student-login", { body: { studentId: id } });
  const loginCreated = !error && data?.ok === true;
  return { loginCreated, tempPassword: data?.tempPassword ?? null };
}
