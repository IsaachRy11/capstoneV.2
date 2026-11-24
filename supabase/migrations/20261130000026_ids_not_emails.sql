-- Students and secretaries are identified by their IDs, not by email (user decision, Nov 24 2026).
-- A student is already identified by students.id (the student ID, e.g. 2025-0001). The secretary gets a staff ID
-- column (e.g. CCS-001). The email columns on both tables only held a copy of the sign-in address the system makes
-- from those IDs, so they are removed.
--
-- Supabase Auth itself still needs an email-shaped sign-in name; that lives only in auth.users and is made from the
-- ID: 2025-0001@students.ccs-monitor.test, ccs-001@staff.ccs-monitor.test (see src/lib/login.js). Nobody types it.

-- 1. The secretary's staff ID, taken from their current staff sign-in address.
alter table public.secretaries add column staff_id text;
update public.secretaries set staff_id = upper(split_part(email, '@', 1))
where lower(split_part(email, '@', 2)) = 'staff.ccs-monitor.test';
alter table public.secretaries add constraint secretaries_staff_id_key unique (staff_id);
comment on column public.secretaries.staff_id is 'Staff ID used to sign in, e.g. CCS-001.';

-- 2. A new sign-in account is matched to its person by ID instead of by email.
create or replace function public.link_auth_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := lower(split_part(new.email, '@', 1));
  v_domain text := lower(split_part(new.email, '@', 2));
begin
  if v_domain = 'staff.ccs-monitor.test' then
    update public.secretaries set auth_user_id = new.id where lower(staff_id) = v_name and auth_user_id is null;
  elsif v_domain = 'students.ccs-monitor.test' then
    update public.students set auth_user_id = new.id where lower(id) = v_name and auth_user_id is null;
  end if;
  return new;
end $$;

-- 3. The student overview without the email column (same columns otherwise).
drop view public.v_student_overview;
create view public.v_student_overview with (security_invoker = true) as
select
  s.id,
  s.first_name,
  s.middle_name,
  s.last_name,
  s.first_name || ' ' || s.last_name as full_name,
  s.year_level,
  s.admission_type,
  s.status,
  p.code  as program_code,
  p.name  as program_name,
  sec.id  as section_id,
  sec.name as section_name,
  (select count(*) from public.v_student_deficiencies d where d.student_id = s.id)      as deficiency_count,
  (select count(*) from public.v_prerequisite_violations v where v.student_id = s.id)   as prerequisite_flag_count,
  case
    when exists (select 1 from public.v_student_deficiencies d where d.student_id = s.id)
      or exists (select 1 from public.v_prerequisite_violations v where v.student_id = s.id)
    then 'irregular' else 'regular'
  end as standing
from public.students s
join public.programs p on p.id = s.program_id
left join public.school_terms ct on ct.is_current
left join public.registrations r on r.student_id = s.id and r.school_term_id = ct.id
left join public.sections sec on sec.id = r.section_id;
grant select on public.v_student_overview to authenticated;
revoke all on public.v_student_overview from anon;

-- 4. add_student() without an email: the student ID is all that is needed.
drop function public.add_student(text, text, text, text, bigint, smallint, public.admission_type, bigint);
create function public.add_student(
  p_id text, p_first_name text, p_last_name text,
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

  insert into public.students (id, first_name, last_name, program_id, curriculum_id, year_level, admission_type)
  values (trim(p_id), trim(p_first_name), trim(p_last_name), p_program_id, v_curriculum, p_year_level, p_admission_type);

  -- No section chosen: the student exists but is not enrolled anywhere yet. Subjects are added one by one.
  if v_term is null or v_section is null then return null; end if;

  select name into v_section_name from public.sections where id = v_section;

  insert into public.registrations (student_id, school_term_id, section_id, year_level)
  values (trim(p_id), v_term, v_section, p_year_level);

  insert into public.enrollments (student_id, offering_id)
  select trim(p_id), o.id from public.class_offerings o where o.section_id = v_section;

  return v_section_name;
end $$;
revoke all on function public.add_student(text, text, text, bigint, smallint, public.admission_type, bigint) from public, anon;
grant execute on function public.add_student(text, text, text, bigint, smallint, public.admission_type, bigint) to authenticated;

-- 5. The email copies go.
alter table public.secretaries drop column email;
alter table public.students drop column email;
