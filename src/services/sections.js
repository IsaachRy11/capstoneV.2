import { supabase, unwrap } from "../lib/supabase";

// Current-term sections with enrolled counts (view filters to the current term).
export const listCurrentSections = () =>
  unwrap(supabase.from("v_section_capacity").select("*").order("program_code").order("year_level").order("name"));

export const getSectionOfferings = (sectionId) =>
  unwrap(
    supabase.from("class_offerings")
      .select("id, capacity, curriculum_subjects(id, code, title, units, kind, sort_order), class_meetings(id, weekday, starts_at, ends_at, room_id, rooms(name)), enrollments(count)")
      .eq("section_id", sectionId)
      .not("enrollments.status", "in", "(dropped,withdrawn)")
  ).then((rows) => rows
    .map((o) => ({ ...o, enrolled: o.enrollments?.[0]?.count ?? 0 }))
    .sort((a, b) => a.curriculum_subjects.sort_order - b.curriculum_subjects.sort_order));

export async function getRoster(offeringId) {
  const rows = await unwrap(
    supabase.from("enrollments").select("id, student_id, status, students(first_name, last_name, admission_type, status, year_level)").eq("offering_id", offeringId)
      .not("status", "in", "(dropped,withdrawn)")
  );
  if (!rows.length) return [];
  const standings = await unwrap(
    supabase.from("v_student_overview").select("id, standing").in("id", rows.map((r) => r.student_id))
  );
  const byId = Object.fromEntries(standings.map((s) => [s.id, s.standing]));
  return rows
    .map((r) => ({
      ...r, name: `${r.students.first_name} ${r.students.last_name}`, standing: byId[r.student_id],
      student_status: r.students.status, admission_type: r.students.admission_type, year_level: r.students.year_level,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Name or student-ID search for the enrol box. Characters that break PostgREST filters are stripped.
export function searchStudents(query) {
  const q = query.replace(/[%,()*\\]/g, " ").trim();
  if (q.length < 2) return Promise.resolve([]);
  return unwrap(
    supabase.from("v_student_overview").select("id, full_name, program_code, year_level, section_name")
      .or(`full_name.ilike.%${q}%,id.ilike.%${q}%`).order("last_name").limit(8)
  );
}

// Which students have this class's subject as Credited (the add-students plan reports it the same as passed).
export async function getCreditedStudentIds(offeringId) {
  const offering = await unwrap(supabase.from("class_offerings").select("curriculum_subject_id").eq("id", offeringId).maybeSingle());
  if (!offering) return [];
  const rows = await unwrap(
    supabase.from("student_credits").select("student_id").eq("curriculum_subject_id", offering.curriculum_subject_id).is("removed_at", null)
  );
  return rows.map((r) => r.student_id);
}

// Add students to ONE subject: who to list and whether each can be added (migration 0018).
export const getSubjectPlan = (offeringId, studentIds = null) =>
  unwrap(supabase.rpc("subject_enroll_plan", { p_offering: offeringId, p_students: studentIds }));

// Summer: subjects the secretary can still add to the summer section (with how many students owe each), add one, take back an empty one.
export const getSummerCandidates = (sectionId) => unwrap(supabase.rpc("summer_candidates", { p_section: sectionId }));
export const addSummerSubject = (sectionId, subjectId) => unwrap(supabase.rpc("add_summer_subject", { p_section: sectionId, p_subject: subjectId }));
export const removeSummerSubject = (offeringId) => unwrap(supabase.rpc("remove_summer_subject", { p_offering: offeringId }));

export const enrollInSubject = (offeringId, studentIds) =>
  unwrap(supabase.rpc("enroll_in_subject", { p_offering: offeringId, p_students: studentIds }));


export const enrollStudent = (studentId, offeringId) =>
  unwrap(supabase.from("enrollments").insert({ student_id: studentId, offering_id: offeringId }));

export const removeEnrollment = (enrollmentId) =>
  unwrap(supabase.from("enrollments").delete().eq("id", enrollmentId));

// ─── Class times (schedule editing). The database rejects section, room and student clashes. ──
export const getRooms = () => unwrap(supabase.from("rooms").select("id, name, kind, is_shared").order("name"));

// fields: { weekday (1–7), starts_at "HH:MM", ends_at "HH:MM", room_id | null }
export const addMeeting = (offeringId, fields) =>
  unwrap(supabase.from("class_meetings").insert({ offering_id: offeringId, ...fields }));

export const updateMeeting = (meetingId, fields) =>
  unwrap(supabase.from("class_meetings").update(fields).eq("id", meetingId));

export const deleteMeeting = (meetingId) =>
  unwrap(supabase.from("class_meetings").delete().eq("id", meetingId));

// One subject's own seats; null = follow the section's number. The database refuses less than the students already in it.
export const updateOfferingCapacity = (offeringId, capacity) =>
  unwrap(supabase.from("class_offerings").update({ capacity }).eq("id", offeringId));

