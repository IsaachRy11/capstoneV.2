-- Moves the old prototype tables out of the way so the new schema can use the names.
-- Nothing is deleted: each table is renamed to legacy_<name> and keeps all its rows.
-- Run by hand in the SQL Editor, once, before the migrations.
-- Delete the legacy_ tables later, only after you have confirmed the new app works.

alter table if exists public.subjects  rename to legacy_subjects;
alter table if exists public.semesters rename to legacy_semesters;
alter table if exists public.concerns  rename to legacy_concerns;
alter table if exists public.students  rename to legacy_students;
