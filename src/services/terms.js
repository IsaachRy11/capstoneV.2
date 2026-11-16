import { supabase, unwrap } from "../lib/supabase";
import { clearCaches } from "../lib/cache";

// Starting a new semester, summer or school year (School year page). Each step is one database function (one
// transaction); the rules live in migration 0017.

// All terms with how many sections each has (a term with sections is "prepared").
export const getTermsOverview = () =>
  unwrap(supabase.from("school_terms").select("id, school_year, semester, starts_on, ends_on, is_current, sections(count)")
    .order("school_year").order("semester"))
    .then((rows) => rows.map((t) => ({ ...t, sections: t.sections?.[0]?.count ?? 0 })));

// The most recent start that hasn't been undone: its summary and Undo. Null when there is none (or the table is missing).
export const getLastStart = () =>
  unwrap(supabase.from("term_starts").select("id, from_term_id, to_term_id, started_at, undone_at, result")
    .is("undone_at", null).order("id", { ascending: false }).limit(1).maybeSingle()).catch(() => null);

// The School year page's one step: prepares the term if needed and starts it (all or nothing).
export async function beginTerm(schoolYear, semester, starts, ends) {
  const result = await unwrap(supabase.rpc("begin_term", { p_school_year: schoolYear, p_semester: semester, p_starts: starts, p_ends: ends }));
  clearCaches();
  return result;
}

export async function undoTermStart() {
  const result = await unwrap(supabase.rpc("undo_term_start"));
  clearCaches();
  return result;
}
