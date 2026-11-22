-- CCS Subject Monitoring System · summer is its own section, and the secretary chooses the extra subjects
-- Replaces the automatic retake offerings of migration 0021 (it opened a subject for every failed subject, hundreds
-- of them in a real school year). A summer term now has:
--   * ONE section per program, named "BSIT Summer", "BSCS Summer", "ACT Summer";
--   * the curriculum's summer subjects (3rd-year BSIT and BSCS: Capstone 1, Thesis 1 ...) as its subjects;
--   * subjects the secretary adds for students who have to retake them (summer_candidates lists what students owe,
--     add_summer_subject adds one, remove_summer_subject takes back an empty one).
-- Enrolling is still per subject (Add students), with the same rules.

create or replace function public.prepare_term(p_school_year text, p_semester smallint, p_starts date, p_ends date)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_term public.school_terms%rowtype;
  v_src public.school_terms%rowtype;
  v_sections int;
  v_classes int;
  v_timed int := 0;
  o record;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can prepare a term.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time (see the top of this file)
  if p_school_year !~ '^\d{4}-\d{4}$'
     or split_part(p_school_year, '-', 2)::int <> split_part(p_school_year, '-', 1)::int + 1 then
    raise exception 'The school year must look like 2027-2028.' using errcode = 'P0001';
  end if;
  if p_semester not in (1, 2, 3) then
    raise exception 'Pick the 1st semester, 2nd semester or summer.' using errcode = 'P0001';
  end if;
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    raise exception 'Enter the first and last day of the term (the last day after the first).' using errcode = 'P0001';
  end if;

  select * into v_term from public.school_terms where school_year = p_school_year and semester = p_semester;
  if found and v_term.is_current then
    raise exception 'This term has already started.' using errcode = 'P0001';
  end if;
  if found and exists (select 1 from public.sections where school_term_id = v_term.id) then
    raise exception 'This term is already prepared. Discard it first to prepare it again.' using errcode = 'P0001';
  end if;

  insert into public.school_terms (school_year, semester, starts_on, ends_on)
  values (p_school_year, p_semester, p_starts, p_ends)
  on conflict (school_year, semester) do update set starts_on = excluded.starts_on, ends_on = excluded.ends_on
  returning * into v_term;

  -- The structure (programs, years, section letters, seats, rooms) comes from the latest regular semester.
  select t.* into v_src from public.school_terms t
  where t.id <> v_term.id and t.semester in (1, 2)
    and exists (select 1 from public.sections s where s.school_term_id = t.id)
  order by t.school_year desc, t.semester desc
  limit 1;
  if not found then
    raise exception 'There is no earlier term to copy the sections from.' using errcode = 'P0001';
  end if;

  if p_semester = 3 then
    -- Summer: ONE "Summer" section per program, holding the curriculum's summer subjects (3rd-year BSIT and BSCS).
    -- The secretary adds other subjects to it for students who have to retake them (summer_candidates, add_summer_subject).
    insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
    select v_term.id, p.id,
           coalesce((select max(cs.year_level) from public.curriculum_subjects cs
                     join public.curricula c on c.id = cs.curriculum_id and c.is_active
                     where c.program_id = p.id and cs.semester = 3), 1),
           p.code || ' Summer',
           coalesce((select max(s.capacity) from public.sections s where s.school_term_id = v_src.id and s.program_id = p.id), 40),
           null
    from public.programs p
    where exists (select 1 from public.curricula c where c.program_id = p.id and c.is_active);
  else
    -- Only sections whose year has subjects this semester.
    insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
    select v_term.id, s.program_id, s.year_level, s.name, s.capacity, s.home_room_id
    from public.sections s
    where s.school_term_id = v_src.id
      and exists (select 1 from public.curriculum_subjects cs
                  join public.curricula c on c.id = cs.curriculum_id and c.is_active
                  where c.program_id = s.program_id and cs.year_level = s.year_level and cs.semester = p_semester);
  end if;
  get diagnostics v_sections = row_count;
  if v_sections = 0 then
    raise exception 'No section has subjects in that semester, so there is nothing to prepare.' using errcode = 'P0001';
  end if;

  -- Subjects come from the official curriculum, never from an old term.
  insert into public.class_offerings (section_id, curriculum_subject_id)
  select distinct ns.id, cs.id
  from public.sections ns
  join public.curricula c on c.program_id = ns.program_id and c.is_active
  join public.curriculum_subjects cs on cs.curriculum_id = c.id and cs.semester = p_semester
    and (p_semester = 3 or cs.year_level = ns.year_level)
  where ns.school_term_id = v_term.id;
  get diagnostics v_classes = row_count;

  -- Class times: the same section and subject the last time this semester ran. A class whose old time now clashes
  -- (a shared room, say) is left without times for the secretary to set.
  for o in
    select no.id as new_id, src.id as old_id
    from public.class_offerings no
    join public.sections ns on ns.id = no.section_id and ns.school_term_id = v_term.id
    join lateral (
      select so.id from public.class_offerings so
      join public.sections ss on ss.id = so.section_id
      join public.school_terms st on st.id = ss.school_term_id
      where ss.name_key = ns.name_key and so.curriculum_subject_id = no.curriculum_subject_id
        and st.semester = p_semester and st.id <> v_term.id
        and exists (select 1 from public.class_meetings m where m.offering_id = so.id)
      order by st.school_year desc
      limit 1
    ) src on true
  loop
    begin
      insert into public.class_meetings (offering_id, weekday, starts_at, ends_at, room_id)
      select o.new_id, m.weekday, m.starts_at, m.ends_at, m.room_id from public.class_meetings m where m.offering_id = o.old_id;
      v_timed := v_timed + 1;
    exception when others then
      null;  -- the whole class stays without times
    end;
  end loop;

  return jsonb_build_object(
    'term_id', v_term.id, 'sections', v_sections, 'classes', v_classes, 'classes_with_times', v_timed,
    'copied_from', v_src.school_year || ' semester ' || v_src.semester);
end $$;

-- ─── What can be added to a summer section ───────────────────────────────────────
create or replace function public.summer_candidates(p_section bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_sec record;
  v_out jsonb;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can do this.' using errcode = '42501';
  end if;
  select s.id, s.program_id, t.semester into v_sec
  from public.sections s join public.school_terms t on t.id = s.school_term_id where s.id = p_section;
  if not found or v_sec.semester <> 3 then
    raise exception 'Subjects can only be added to a summer section.' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(q.x order by (q.x ->> 'owing')::int desc, (q.x ->> 'year_level')::int, q.x ->> 'code'), '[]'::jsonb) into v_out
  from (
    select jsonb_build_object(
      'subject_id', cs.id, 'code', cs.code, 'title', cs.title, 'units', cs.units, 'year_level', cs.year_level, 'semester', cs.semester,
      'owing', (select count(distinct e.student_id)
                from public.enrollments e
                join public.class_offerings o on o.id = e.offering_id
                join public.students st on st.id = e.student_id
                where o.curriculum_subject_id = cs.id and st.curriculum_id = c.id and st.status = 'active'
                  and e.status in ('failed', 'incomplete', 'dropped') and not private.has_passed(st.id, cs.id))) as x
    from public.curricula c
    join public.curriculum_subjects cs on cs.curriculum_id = c.id
    where c.program_id = v_sec.program_id and c.is_active
      and not exists (select 1 from public.class_offerings o where o.section_id = p_section and o.curriculum_subject_id = cs.id)
  ) q;
  return v_out;
end $$;

create or replace function public.add_summer_subject(p_section bigint, p_subject bigint) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_ok boolean;
  v_id bigint;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can do this.' using errcode = '42501';
  end if;
  select (t.semester = 3 and exists (select 1 from public.curricula c join public.curriculum_subjects cs on cs.curriculum_id = c.id
                                     where c.program_id = s.program_id and c.is_active and cs.id = p_subject)) into v_ok
  from public.sections s join public.school_terms t on t.id = s.school_term_id where s.id = p_section;
  if v_ok is distinct from true then
    raise exception 'That subject can''t be added to this section.' using errcode = 'P0001';
  end if;
  insert into public.class_offerings (section_id, curriculum_subject_id) values (p_section, p_subject)
  on conflict (section_id, curriculum_subject_id) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'That subject is already offered this summer.' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

create or replace function public.remove_summer_subject(p_offering bigint) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can do this.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.class_offerings o join public.sections s on s.id = o.section_id
                 join public.school_terms t on t.id = s.school_term_id where o.id = p_offering and t.semester = 3) then
    raise exception 'Only a summer subject can be removed here.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.enrollments e where e.offering_id = p_offering) then
    raise exception 'Students are already enrolled in this subject. Remove them first.' using errcode = 'P0001';
  end if;
  delete from public.class_offerings where id = p_offering;
end $$;

revoke all on function public.prepare_term(text, smallint, date, date), public.summer_candidates(bigint),
  public.add_summer_subject(bigint, bigint), public.remove_summer_subject(bigint) from public, anon;
grant execute on function public.prepare_term(text, smallint, date, date), public.summer_candidates(bigint),
  public.add_summer_subject(bigint, bigint), public.remove_summer_subject(bigint) to authenticated;
