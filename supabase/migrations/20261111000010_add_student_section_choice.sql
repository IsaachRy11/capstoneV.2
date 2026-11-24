-- CCS Subject Monitoring System · choose the section when adding a student
-- Each program year can now have several block sections (S, T, U, V). add_student() used to put every
-- new student in the first one by name. Now:
--   * the caller may pass p_section_id to pick the section, and
--   * without it, the section with the most free seats is used (ties go to the first by name).
-- Calls that don't pass p_section_id keep working as before.

drop function public.add_student(text, text, text, text, bigint, smallint, public.admission_type);

create function public.add_student(
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

  -- A chosen section must belong to this program and year in the current term.
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

  if v_term is null then return null; end if;

  if v_section is null then
    -- Most free seats first, then name.
    select s.id into v_section
    from public.sections s
    where s.school_term_id = v_term and s.program_id = p_program_id and s.year_level = p_year_level
    order by s.capacity - (select count(*) from public.registrations r where r.section_id = s.id) desc, s.name
    limit 1;
  end if;
  if v_section is null then return null; end if;

  select name into v_section_name from public.sections where id = v_section;

  insert into public.registrations (student_id, school_term_id, section_id, year_level)
  values (trim(p_id), v_term, v_section, p_year_level);

  insert into public.enrollments (student_id, offering_id)
  select trim(p_id), o.id from public.class_offerings o where o.section_id = v_section;

  return v_section_name;
end $$;

revoke all on function public.add_student(text, text, text, text, bigint, smallint, public.admission_type, bigint) from public, anon;
grant execute on function public.add_student(text, text, text, text, bigint, smallint, public.admission_type, bigint) to authenticated;
