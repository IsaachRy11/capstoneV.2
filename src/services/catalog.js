import { supabase, unwrap } from "../lib/supabase";

export const getCurrentTerm = () =>
  unwrap(supabase.from("school_terms").select("*").eq("is_current", true).maybeSingle());

export const getTerms = () =>
  unwrap(supabase.from("school_terms").select("*").order("school_year").order("semester"));

export const getPrograms = () =>
  unwrap(supabase.from("programs").select("id, code, name, duration_years").order("code"));

// All subjects of the active curricula (optionally one program), in checklist order.
export const getCurriculum = (programCode) => {
  let q = supabase
    .from("curriculum_subjects")
    .select("id, year_level, semester, sort_order, code, title, units, kind, curricula!inner(id, is_active, programs!inner(id, code, name, duration_years))")
    .eq("curricula.is_active", true)
    .order("year_level")
    .order("semester")
    .order("sort_order");
  if (programCode) q = q.eq("curricula.programs.code", programCode);
  return unwrap(q);
};

// Official prerequisites (empty until SJC's list is added). Rows: { subject_id, prerequisite_id }.
export const getPrerequisites = () =>
  unwrap(supabase.from("subject_prerequisites").select("subject_id, prerequisite_id"));

export async function addCurriculumSubject({ programCode, year_level, semester, code, title, units, kind }) {
  const curriculum = await unwrap(
    supabase.from("curricula").select("id, programs!inner(code)").eq("is_active", true).eq("programs.code", programCode).single()
  );
  const last = await unwrap(
    supabase.from("curriculum_subjects").select("sort_order").eq("curriculum_id", curriculum.id)
      .eq("year_level", year_level).eq("semester", semester).order("sort_order", { ascending: false }).limit(1)
  );
  return unwrap(
    supabase.from("curriculum_subjects").insert({
      curriculum_id: curriculum.id, year_level, semester, code: code.trim(), title: title.trim(),
      units, kind, sort_order: (last[0]?.sort_order ?? 0) + 1,
    })
  );
}

// Number of class offerings in a term (sections × subjects)
export const countOfferings = (termId) =>
  unwrap(
    supabase.from("class_offerings").select("id, sections!inner(school_term_id)", { count: "exact", head: true })
      .eq("sections.school_term_id", termId)
  );
