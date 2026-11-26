-- The current 2nd semester (SY 2026-2027) was set up by the demo data script, so it should not be undone from the
-- New term page: one click would remove everyone's subjects. Dropping its saved "term start" record hides the
-- Undo button and makes the system refuse an undo. A term started from the page saves a new record, so Undo is
-- back for that start (for testing).
delete from public.term_starts t
using public.school_terms s
where t.to_term_id = s.id and s.school_year = '2026-2027' and s.semester = 2 and s.is_current and t.undone_at is null;
