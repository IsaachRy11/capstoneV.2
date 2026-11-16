-- "Add students" to a subject: the only enrolling page (user decision, Nov 2026: one subject at a time, students can be
-- in different sections for different subjects, first come first served by seats). Two functions, both secretary only:
--   subject_enroll_plan(offering)        who to list and whether each can be added (and why not)
--   enroll_in_subject(offering, ids)     adds them to that class; returns what happened to each
-- Listed by default: this section's block (registered here this term, or in the matching block last term: same program
-- and letter, one year lower in a new school year; marked in_block and pre-ticked on the page) plus anyone who failed,
-- dropped or left it INC in an EARLIER term and hasn't passed it since (marked retake, not pre-ticked). Seats left shown. Anyone else can be searched.
-- The usual rules apply: prerequisite passed (no override), seats, timetable clashes, the student's unit limit.

create or replace function public.subject_enroll_plan(p_offering bigint, p_students text[] default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_o record;
  v_prev bigint;
  v_prev_sy text;
  v_from_year int;
  v_letter text;
  s record;
  v_rows jsonb := '[]'::jsonb;
  v_state text;
  v_missing text;
  v_units numeric;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can enroll students.' using errcode = '42501';
  end if;
  select o.id, o.curriculum_subject_id as subject_id, cs.code, cs.title, cs.units, sec.id as section_id, sec.name as section_name,
         sec.program_id, sec.year_level, sec.school_term_id, t.school_year, t.semester,
         coalesce(o.capacity, sec.capacity)
           - (select count(*) from public.enrollments e where e.offering_id = o.id and e.status <> 'dropped') as seats_left
  into v_o
  from public.class_offerings o
  join public.sections sec on sec.id = o.section_id
  join public.school_terms t on t.id = sec.school_term_id
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where o.id = p_offering;
  if not found then
    raise exception 'That class doesn''t exist.' using errcode = 'P0001';
  end if;

  -- This section's block last term: same program and letter, one year lower when this is a new school year.
  v_letter := split_part(v_o.section_name, '-', 2);
  select t.id, t.school_year into v_prev, v_prev_sy from public.school_terms t
  where (t.school_year, t.semester) < (v_o.school_year, v_o.semester)
    and exists (select 1 from public.registrations r where r.school_term_id = t.id)
  order by t.school_year desc, t.semester desc
  limit 1;
  v_from_year := case when v_prev_sy is distinct from v_o.school_year then v_o.year_level - 1 else v_o.year_level end;

  for s in
    select st.id, st.first_name || ' ' || st.last_name as full_name, st.year_level, st.max_units,
           (select count(*) from public.v_student_deficiencies d where d.student_id = st.id) as failed,
           (select sec2.name from public.registrations r join public.sections sec2 on sec2.id = r.section_id
            where r.student_id = st.id and r.school_term_id = v_o.school_term_id) as this_term_section,
           (exists (select 1 from public.registrations r where r.student_id = st.id and r.section_id = v_o.section_id)
            or exists (select 1 from public.registrations r join public.sections sec2 on sec2.id = r.section_id
                       where r.student_id = st.id and r.school_term_id = v_prev and sec2.program_id = v_o.program_id
                         and sec2.year_level = v_from_year and split_part(sec2.name, '-', 2) = v_letter)) as in_block,
           exists (select 1 from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
                   join public.sections sx on sx.id = o2.section_id
                   where e.student_id = st.id and o2.curriculum_subject_id = v_o.subject_id and sx.school_term_id <> v_o.school_term_id
                     and e.status in ('failed', 'incomplete', 'dropped')) as tried_before
    from public.students st
    where (p_students is not null and st.id = any(p_students))
       or (p_students is null and st.status = 'active' and not private.has_passed(st.id, v_o.subject_id) and (
             exists (select 1 from public.registrations r where r.student_id = st.id and r.section_id = v_o.section_id)
             or exists (select 1 from public.registrations r join public.sections sec2 on sec2.id = r.section_id
                        where r.student_id = st.id and r.school_term_id = v_prev and sec2.program_id = v_o.program_id
                          and sec2.year_level = v_from_year and split_part(sec2.name, '-', 2) = v_letter)
             or exists (select 1 from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
                        join public.sections sx on sx.id = o2.section_id
                        where e.student_id = st.id and o2.curriculum_subject_id = v_o.subject_id and sx.school_term_id <> v_o.school_term_id
                          and e.status in ('failed', 'incomplete', 'dropped'))))
    order by st.last_name, st.first_name
  loop
    v_missing := null;
    if exists (select 1 from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
               join public.sections sec2 on sec2.id = o2.section_id
               where e.student_id = s.id and o2.curriculum_subject_id = v_o.subject_id and sec2.school_term_id = v_o.school_term_id) then
      v_state := 'enrolled';
    elsif private.has_passed(s.id, v_o.subject_id) then
      v_state := 'passed';
    else
      v_missing := private.missing_prerequisite(s.id, v_o.subject_id);
      if v_missing is not null then
        v_state := 'needs';
      else
        select coalesce(sum(cs.units), 0) into v_units
        from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
        join public.sections sec2 on sec2.id = o2.section_id join public.curriculum_subjects cs on cs.id = o2.curriculum_subject_id
        where e.student_id = s.id and sec2.school_term_id = v_o.school_term_id and e.status <> 'dropped';
        v_state := case when v_units + v_o.units > s.max_units then 'over_limit' else 'add' end;
      end if;
    end if;
    v_rows := v_rows || jsonb_build_object('student_id', s.id, 'full_name', s.full_name, 'year_level', s.year_level,
      'failed', s.failed, 'section', s.this_term_section, 'in_block', s.in_block, 'retake', s.tried_before,
      'state', v_state, 'needs', v_missing);
  end loop;
  return jsonb_build_object('code', v_o.code, 'title', v_o.title, 'units', v_o.units, 'section', v_o.section_name,
    'section_id', v_o.section_id, 'seats_left', v_o.seats_left, 'students', v_rows);
end $$;

create or replace function public.enroll_in_subject(p_offering bigint, p_students text[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_o record;
  s record;
  v_out jsonb := '[]'::jsonb;
  v_missing text;
  v_units numeric;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can enroll students.' using errcode = '42501';
  end if;
  select o.id, o.curriculum_subject_id as subject_id, cs.units, sec.id as section_id, sec.year_level, sec.school_term_id into v_o
  from public.class_offerings o
  join public.sections sec on sec.id = o.section_id
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where o.id = p_offering;
  if not found then
    raise exception 'That class doesn''t exist.' using errcode = 'P0001';
  end if;
  for s in select st.id, st.max_units, st.status from public.students st where st.id = any(p_students) order by st.id loop
    if s.status <> 'active' then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', false, 'why', 'not an active student');
      continue;
    end if;
    if private.has_passed(s.id, v_o.subject_id) then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', false, 'why', 'already passed it');
      continue;
    end if;
    v_missing := private.missing_prerequisite(s.id, v_o.subject_id);
    if v_missing is not null then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', false, 'why', 'needs ' || v_missing || ' passed first');
      continue;
    end if;
    select coalesce(sum(cs.units), 0) into v_units
    from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
    join public.sections sec2 on sec2.id = o2.section_id join public.curriculum_subjects cs on cs.id = o2.curriculum_subject_id
    where e.student_id = s.id and sec2.school_term_id = v_o.school_term_id and e.status <> 'dropped';
    if v_units + v_o.units > s.max_units then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', false, 'why', 'over their unit limit');
      continue;
    end if;
    begin
      insert into public.enrollments (student_id, offering_id) values (s.id, p_offering);
      -- A student with no section yet this term is registered in this class's section.
      insert into public.registrations (student_id, school_term_id, section_id, year_level)
      values (s.id, v_o.school_term_id, v_o.section_id, v_o.year_level)
      on conflict (student_id, school_term_id) do nothing;
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', true);
    exception when unique_violation then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', false, 'why', 'already in this class');
    when others then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'ok', false, 'why', sqlerrm);
    end;
  end loop;
  return v_out;
end $$;

revoke all on function public.subject_enroll_plan(bigint, text[]), public.enroll_in_subject(bigint, text[]) from public, anon;
grant execute on function public.subject_enroll_plan(bigint, text[]), public.enroll_in_subject(bigint, text[]) to authenticated;
