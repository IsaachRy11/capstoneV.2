import { supabase, unwrap } from "../lib/supabase";
import { clearCaches } from "../lib/cache";

// Starting a new semester, summer or school year (School year page). Every step is a database function, so each
// one runs as a single transaction and the rules live in one place (migration 0017).

// All terms with how many sections each has (a term with sections is "prepared").
export const getTermsOverview = () =>
  unwrap(supabase.from("school_terms").select("id, school_year, semester, starts_on, ends_on, is_current, sections(count)")
    .order("school_year").order("semester"))
    .then((rows) => rows.map((t) => ({ ...t, sections: t.sections?.[0]?.count ?? 0 })));

// The most recent start, for its summary and for Undo. Optional: null when there is none (or the table is missing).
export const getLastStart = () =>
  unwrap(supabase.from("term_starts").select("id, from_term_id, to_term_id, started_at, undone_at, result")
    .order("id", { ascending: false }).limit(1).maybeSingle()).catch(() => null);

export const prepareTerm = (schoolYear, semester, starts, ends) =>
  unwrap(supabase.rpc("prepare_term", { p_school_year: schoolYear, p_semester: semester, p_starts: starts, p_ends: ends }));

export const discardTerm = (termId) => unwrap(supabase.rpc("discard_term", { p_term_id: termId }));

// Does the whole start and rolls it back: what would happen, without changing anything.
// Each student's own unit limit (on their record) is used.
export const previewTermStart = (termId) => unwrap(supabase.rpc("preview_term_start", { p_term_id: termId }));

// The switch changes the current term for every page, so every cached result is dropped.
export async function startTerm(termId) {
  const result = await unwrap(supabase.rpc("start_term", { p_term_id: termId }));
  clearCaches();
  return result;
}

export async function undoTermStart() {
  const result = await unwrap(supabase.rpc("undo_term_start"));
  clearCaches();
  return result;
}
