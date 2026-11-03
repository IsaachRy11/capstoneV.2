-- CCS Subject Monitoring System · hardening (Supabase Postgres best practices review)
-- 1. Index every foreign key that lacked one.
-- 2. Security helpers move to a private schema (not callable through the public API) and are
--    wrapped in (select …) inside policies so they run once per query, not once per row.
-- 3. Enrollment rules enforced by the database: seat capacity and schedule clashes.
-- 4. Grade change log: who changed which grade, when, from what to what.
-- 5. All-or-nothing writes: add_student() and save_grades() run in one transaction.

-- ─── 1. Foreign-key indexes ───────────────────────────────────────────────
create index if not exists subject_prerequisites_prereq_idx on public.subject_prerequisites (prerequisite_id);
create index if not exists students_curriculum_idx         on public.students (curriculum_id);
create index if not exists sections_program_year_idx       on public.sections (program_id, year_level);
create index if not exists sections_home_room_idx          on public.sections (home_room_id);
create index if not exists registrations_term_idx          on public.registrations (school_term_id);
create index if not exists registrations_section_idx       on public.registrations (section_id);
create index if not exists class_offerings_subject_idx     on public.class_offerings (curriculum_subject_id);
create index if not exists class_meetings_room_day_idx     on public.class_meetings (room_id, weekday);

-- ─── 2. Private security helpers ──────────────────────────────────────────
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_secretary() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.secretaries where auth_user_id = (select auth.uid())) $$;

create function private.current_student_id() returns text
language sql stable security definer set search_path = ''
as $$ select id from public.students where auth_user_id = (select auth.uid()) $$;

revoke all on function private.is_secretary(), private.current_student_id() from public, anon;
grant execute on function private.is_secretary(), private.current_student_id() to authenticated;

-- Recreate every policy that used the old public helpers.
do $$
declare t text;
begin
  foreach t in array array[
    'programs', 'curricula', 'curriculum_subjects', 'subject_prerequisites',
    'school_terms', 'rooms', 'sections', 'class_offerings', 'class_meetings'
  ] loop
    execute format('drop policy if exists "secretary writes %1$s" on public.%1$I', t);
    execute format('create policy "secretary writes %1$s" on public.%1$I for all to authenticated using ((select private.is_secretary())) with check ((select private.is_secretary()))', t);
  end loop;
end $$;

drop policy if exists "secretary manages secretaries" on public.secretaries;
drop policy if exists "secretary reads self" on public.secretaries;
create policy "secretary manages secretaries" on public.secretaries
  for all to authenticated using ((select private.is_secretary())) with check ((select private.is_secretary()));
create policy "secretary reads self" on public.secretaries
  for select to authenticated using (auth_user_id = (select auth.uid()));

drop policy if exists "secretary manages students" on public.students;
drop policy if exists "student reads self" on public.students;
create policy "secretary manages students" on public.students
  for all to authenticated using ((select private.is_secretary())) with check ((select private.is_secretary()));
create policy "student reads self" on public.students
  for select to authenticated using (id = (select private.current_student_id()));

drop policy if exists "secretary manages registrations" on public.registrations;
drop policy if exists "student reads own registrations" on public.registrations;
create policy "secretary manages registrations" on public.registrations
  for all to authenticated using ((select private.is_secretary())) with check ((select private.is_secretary()));
create policy "student reads own registrations" on public.registrations
  for select to authenticated using (student_id = (select private.current_student_id()));

drop policy if exists "secretary manages enrollments" on public.enrollments;
drop policy if exists "student reads own enrollments" on public.enrollments;
create policy "secretary manages enrollments" on public.enrollments
  for all to authenticated using ((select private.is_secretary())) with check ((select private.is_secretary()));
create policy "student reads own enrollments" on public.enrollments
  for select to authenticated using (student_id = (select private.current_student_id()));

drop function public.is_secretary();
drop function public.current_student_id();

-- ─── 3. Enrollment rules: capacity and schedule clashes ───────────────────
create function private.check_enrollment_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cap int;
  v_term bigint;
  v_taken int;
  v_clash record;
begin
  -- Lock the class row so two simultaneous enrolments can't both take the last seat.
  select coalesce(o.capacity, s.capacity), s.school_term_id into v_cap, v_term
  from public.class_offerings o
  join public.sections s on s.id = o.section_id
  where o.id = new.offering_id
  for update of o;

  select count(*) into v_taken
  from public.enrollments
  where offering_id = new.offering_id and status <> 'dropped' and id is distinct from new.id;

  if v_taken >= v_cap then
    raise exception 'This class is full (% of % seats taken).', v_taken, v_cap using errcode = 'P0001';
  end if;

  select cs.code, m2.weekday, m2.starts_at, m2.ends_at into v_clash
  from public.class_meetings m1
  join public.class_meetings m2
    on m2.weekday = m1.weekday and m2.starts_at < m1.ends_at and m1.starts_at < m2.ends_at
   and m2.offering_id <> new.offering_id
  join public.enrollments e
    on e.offering_id = m2.offering_id and e.student_id = new.student_id
   and e.status <> 'dropped' and e.id is distinct from new.id
  join public.class_offerings o2 on o2.id = m2.offering_id
  join public.sections s2 on s2.id = o2.section_id and s2.school_term_id = v_term
  join public.curriculum_subjects cs on cs.id = o2.curriculum_subject_id
  where m1.offering_id = new.offering_id
  limit 1;

  if found then
    raise exception 'Schedule clash with % on % (% – %).',
      v_clash.code,
      (array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[v_clash.weekday],
      to_char(v_clash.starts_at, 'FMHH12:MI AM'), to_char(v_clash.ends_at, 'FMHH12:MI AM')
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger enrollments_check_rules
  before insert or update of offering_id on public.enrollments
  for each row execute function private.check_enrollment_rules();

-- ─── 4. Grade change log ──────────────────────────────────────────────────
create table public.grade_changes (
  id            bigint generated always as identity primary key,
  enrollment_id bigint not null references public.enrollments (id) on delete cascade,
  changed_by    uuid references auth.users (id) on delete set null,
  changed_at    timestamptz not null default now(),
  old_midterm   numeric(3, 2),
  new_midterm   numeric(3, 2),
  old_final     numeric(3, 2),
  new_final     numeric(3, 2),
  old_status    public.enrollment_status,
  new_status    public.enrollment_status
);
create index grade_changes_enrollment_idx on public.grade_changes (enrollment_id, changed_at desc);
create index grade_changes_changed_by_idx on public.grade_changes (changed_by);
alter table public.grade_changes enable row level security;
create policy "secretary reads grade changes" on public.grade_changes
  for select to authenticated using ((select private.is_secretary()));
-- No insert/update/delete policies: rows are written only by the trigger below and never edited.

create function private.log_grade_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (old.midterm_grade, old.final_grade, old.status) is distinct from (new.midterm_grade, new.final_grade, new.status) then
    insert into public.grade_changes (enrollment_id, changed_by, old_midterm, new_midterm, old_final, new_final, old_status, new_status)
    values (new.id, (select auth.uid()), old.midterm_grade, new.midterm_grade, old.final_grade, new.final_grade, old.status, new.status);
  end if;
  return new;
end $$;

create trigger enrollments_log_grades
  after update on public.enrollments
  for each row execute function private.log_grade_change();

create view public.v_grade_changes with (security_invoker = true) as
select
  g.id,
  e.student_id,
  cs.code,
  cs.title,
  g.changed_at,
  g.old_midterm, g.new_midterm,
  g.old_final,   g.new_final,
  g.old_status,  g.new_status,
  coalesce(sec.full_name, 'Unknown user') as changed_by_name
from public.grade_changes g
join public.enrollments e          on e.id = g.enrollment_id
join public.class_offerings o      on o.id = e.offering_id
join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
left join public.secretaries sec   on sec.auth_user_id = g.changed_by;

grant select on public.v_grade_changes to authenticated;
revoke all on public.v_grade_changes from anon;

-- ─── 5. All-or-nothing writes (called from the app with supabase.rpc) ─────
-- Runs as the caller, so the secretary-only policies above still apply.
create function public.add_student(
  p_id text, p_first_name text, p_last_name text, p_email text,
  p_program_id bigint, p_year_level smallint, p_admission_type public.admission_type default 'new'
) returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  v_curriculum bigint;
  v_term bigint;
  v_section bigint;
  v_section_name text;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can add students.' using errcode = '42501';
  end if;

  select id into v_curriculum from public.curricula where program_id = p_program_id and is_active;
  if v_curriculum is null then
    raise exception 'This program has no active curriculum.' using errcode = 'P0001';
  end if;

  insert into public.students (id, first_name, last_name, email, program_id, curriculum_id, year_level, admission_type)
  values (trim(p_id), trim(p_first_name), trim(p_last_name), lower(trim(p_email)), p_program_id, v_curriculum, p_year_level, p_admission_type);

  select id into v_term from public.school_terms where is_current;
  if v_term is null then return null; end if;

  select id, name into v_section, v_section_name from public.sections
  where school_term_id = v_term and program_id = p_program_id and year_level = p_year_level
  order by name limit 1;
  if v_section is null then return null; end if;

  insert into public.registrations (student_id, school_term_id, section_id, year_level)
  values (trim(p_id), v_term, v_section, p_year_level);

  insert into public.enrollments (student_id, offering_id)
  select trim(p_id), o.id from public.class_offerings o where o.section_id = v_section;

  return v_section_name;
end $$;

-- p_changes: [{ "enrollment_id": 1, "midterm": 2.25, "final": null, "status": "auto" | "incomplete" | "dropped" }]
create function public.save_grades(p_changes jsonb) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  c jsonb;
  v_status text;
  v_count int := 0;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can encode grades.' using errcode = '42501';
  end if;

  for c in select * from jsonb_array_elements(p_changes) loop
    v_status := coalesce(c->>'status', 'auto');
    update public.enrollments set
      midterm_grade = (c->>'midterm')::numeric,
      final_grade   = case when v_status in ('incomplete', 'dropped') then null else (c->>'final')::numeric end,
      status        = (case when v_status = 'auto' then 'enrolled' else v_status end)::public.enrollment_status
    where id = (c->>'enrollment_id')::bigint;
    if not found then
      raise exception 'Enrollment % not found.', c->>'enrollment_id' using errcode = 'P0002';
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.add_student(text, text, text, text, bigint, smallint, public.admission_type) from public, anon;
revoke all on function public.save_grades(jsonb) from public, anon;
grant execute on function public.add_student(text, text, text, text, bigint, smallint, public.admission_type) to authenticated;
grant execute on function public.save_grades(jsonb) to authenticated;
