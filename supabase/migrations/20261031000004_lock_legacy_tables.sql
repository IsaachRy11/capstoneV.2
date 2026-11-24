-- Lock the renamed prototype tables (see supabase/legacy/rename_legacy_tables.sql).
-- RLS on with no policies = no access through the public API key; data is kept.
-- `if exists` so this is a no-op on a fresh database that never had them.
alter table if exists public.legacy_students  enable row level security;
alter table if exists public.legacy_semesters enable row level security;
alter table if exists public.legacy_subjects  enable row level security;
alter table if exists public.legacy_concerns  enable row level security;
