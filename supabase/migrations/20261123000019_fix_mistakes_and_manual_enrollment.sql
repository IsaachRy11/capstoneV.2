-- CCS Subject Monitoring System · fixing mistakes, and adding students without enrolling them
--
-- 1. A class that already has grades can now be removed (the secretary must be able to fix a wrong enrollment at
--    any time). The removal is written to the grade log with the grades it had, and the log keeps its own copy of
--    the student and the subject, so it survives the class. Log entries still can't be edited or deleted.
-- 2. add_student() no longer places a new student in a section or enrolls them. Enrollment is per subject
--    (Section allocations > Add students). Passing a section still works for scripts and tests.

-- ─── 1. The grade log keeps its own copy of who and what ──────────────────
alter table public.grade_changes
  add column student_id     text,
  add column subject_code   text,
  add column subject_title  text,
  add column class_removed  boolean not null default false;

update public.grade_changes g
set student_id = e.student_id, subject_code = cs.code, subject_title = cs.title
from public.enrollments e
join public.class_offerings o      on o.id = e.offering_id
join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
where e.id = g.enrollment_id;

alter table public.grade_changes alter column enrollment_id drop not null;
alter table public.grade_changes drop constraint if exists grade_changes_enrollment_id_fkey;
alter table public.grade_changes
  add constraint grade_changes_enrollment_id_fkey foreign key (enrollment_id) references public.enrollments (id) on delete set null;
create index grade_changes_student_idx on public.grade_changes (student_id);

create or replace function private.log_grade_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text;
  v_title text;
begin
  if (old.midterm_grade, old.final_grade, old.status) is distinct from (new.midterm_grade, new.final_grade, new.status) then
    select cs.code, cs.title into v_code, v_title
    from public.class_offerings o join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where o.id = new.offering_id;
    insert into public.grade_changes (enrollment_id, student_id, subject_code, subject_title, changed_by, old_midterm, new_midterm, old_final, new_final, old_status, new_status)
    values (new.id, new.student_id, v_code, v_title, (select auth.uid()), old.midterm_grade, new.midterm_grade, old.final_grade, new.final_grade, old.status, new.status);
  end if;
  return new;
end $$;

-- ─── 2. Removing a graded class is allowed, and logged ────────────────────
drop trigger enrollments_protect_graded on public.enrollments;
drop function private.protect_graded_enrollment();

create function private.log_removed_enrollment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text;
  v_title text;
begin
  if old.midterm_grade is not null or old.final_grade is not null or old.status in ('passed', 'failed', 'incomplete', 'dropped')
     or exists (select 1 from public.grade_changes g where g.enrollment_id = old.id) then
    select cs.code, cs.title into v_code, v_title
    from public.class_offerings o join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where o.id = old.offering_id;
    insert into public.grade_changes (enrollment_id, student_id, subject_code, subject_title, changed_by, old_midterm, new_midterm, old_final, new_final, old_status, new_status, class_removed)
    values (old.id, old.student_id, v_code, v_title, (select auth.uid()), old.midterm_grade, null, old.final_grade, null, old.status, null, true);
  end if;
  return old;
end $$;

create trigger enrollments_log_removal
  before delete on public.enrollments
  for each row execute function private.log_removed_enrollment();

-- The student-delete guard now also looks at the log's own student column (a removed class has no enrollment left).
create or replace function private.protect_student_with_grades() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.enrollments e
    where e.student_id = old.id
      and (e.midterm_grade is not null or e.final_grade is not null
           or e.status in ('passed', 'failed', 'incomplete', 'dropped')
           or exists (select 1 from public.grade_changes g where g.enrollment_id = e.id))
  ) or exists (select 1 from public.grade_changes g where g.student_id = old.id) then
    raise exception 'This student has grades or class history on record, so the record is kept. Mark them as Dropped, Graduated or Shifted out instead.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;

drop view public.v_grade_changes;
create view public.v_grade_changes with (security_invoker = true) as
select
  g.id,
  g.student_id,
  g.subject_code  as code,
  g.subject_title as title,
  g.changed_at,
  g.old_midterm, g.new_midterm,
  g.old_final,   g.new_final,
  g.old_status,  g.new_status,
  g.class_removed,
  coalesce(sec.full_name, 'Unknown user') as changed_by_name
from public.grade_changes g
left join public.secretaries sec on sec.auth_user_id = g.changed_by;

grant select on public.v_grade_changes to authenticated;
revoke all on public.v_grade_changes from anon;

-- ─── 3. add_student() only creates the student ────────────────────────────
create or replace function public.add_student(
  p_id text, p_first_name text, p_last_name text, p_email text,
  p_program_id bigint, p_year_level smallint, p_admission_type public.admission_type default 'new',
  p_section_id bigint default null
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

  select id into v_term from public.school_terms where is_current;

  if p_section_id is not null then
    select s.id into v_section from public.sections s
    where s.id = p_section_id and s.school_term_id = v_term
      and s.program_id = p_program_id and s.year_level = p_year_level;
    if v_section is null then
      raise exception 'That section isn''t open for this program and year this semester.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.students (id, first_name, last_name, email, program_id, curriculum_id, year_level, admission_type)
  values (trim(p_id), trim(p_first_name), trim(p_last_name), lower(trim(p_email)), p_program_id, v_curriculum, p_year_level, p_admission_type);

  -- No section chosen: the student exists but is not enrolled anywhere yet. Subjects are added one by one.
  if v_term is null or v_section is null then return null; end if;

  select name into v_section_name from public.sections where id = v_section;

  insert into public.registrations (student_id, school_term_id, section_id, year_level)
  values (trim(p_id), v_term, v_section, p_year_level);

  insert into public.enrollments (student_id, offering_id)
  select trim(p_id), o.id from public.class_offerings o where o.section_id = v_section;

  return v_section_name;
end $$;
