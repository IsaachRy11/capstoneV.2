import { supabase, unwrap } from "../lib/supabase";

// Current-term sections with enrolled counts (view filters to the current term).
export const listCurrentSections = () =>
  unwrap(supabase.from("v_section_capacity").select("*").order("program_code").order("year_level").order("name"));

export const getSectionOfferings = (sectionId) =>
  unwrap(
    supabase.from("class_offerings")
      .select("id, capacity, curriculum_subjects(id, code, title, units, kind, sort_order), class_meetings(id, weekday, starts_at, ends_at, room_id, rooms(name)), enrollments(count)")
      .eq("section_id", sectionId)
  ).then((rows) => rows
    .map((o) => ({ ...o, enrolled: o.enrollments?.[0]?.count ?? 0 }))
    .sort((a, b) => a.curriculum_subjects.sort_order - b.curriculum_subjects.sort_order));

export async function getRoster(offeringId) {
  const rows = await unwrap(
    supabase.from("enrollments").select("id, student_id, status, students(first_name, last_name)").eq("offering_id", offeringId)
  );
  if (!rows.length) return [];
  const standings = await unwrap(
    supabase.from("v_student_overview").select("id, standing").in("id", rows.map((r) => r.student_id))
  );
  const byId = Object.fromEntries(standings.map((s) => [s.id, s.standing]));
  return rows
    .map((r) => ({ ...r, name: `${r.students.first_name} ${r.students.last_name}`, standing: byId[r.student_id] }))
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

export const updateSectionCapacity = (sectionId, capacity) =>
  unwrap(supabase.from("sections").update({ capacity }).eq("id", sectionId));
