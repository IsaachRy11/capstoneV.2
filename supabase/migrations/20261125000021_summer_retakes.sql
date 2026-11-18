-- CCS Subject Monitoring System · summer also offers the subjects students failed
-- A summer term used to hold only the curriculum's summer subjects (3rd-year BSIT and BSCS: Capstone 1, Thesis 1).
-- Now it also offers every subject (any year, 1st or 2nd semester) that at least one active student failed, left
-- INC or dropped and has not passed since, so those students can retake it in the summer. Enrolling is still per
-- subject on Section allocations > Add students, with the same rules (seats, clashes, prerequisites, unit limit).

-- Does any active student of this curriculum still owe this subject (an attempt that was not a pass)?
create function private.needs_retake(p_curriculum bigint, p_subject bigint) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.students st on st.id = e.student_id
    where o.curriculum_subject_id = p_subject
      and st.curriculum_id = p_curriculum and st.status = 'active'
      and e.status in ('failed', 'incomplete', 'dropped')
      and not private.has_passed(st.id, p_subject));
$$;
revoke all on function private.needs_retake(bigint, bigint) from public, anon;

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

  -- Only sections whose year has subjects this semester. Summer: the curriculum's summer subjects (3rd-year BSIT and
  -- BSCS) plus the subjects students failed, left INC or dropped and have not passed since, in any year (retakes).
  insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
  select v_term.id, s.program_id, s.year_level, s.name, s.capacity, s.home_room_id
  from public.sections s
  where s.school_term_id = v_src.id
    and exists (select 1 from public.curriculum_subjects cs
                join public.curricula c on c.id = cs.curriculum_id and c.is_active
                where c.program_id = s.program_id and cs.year_level = s.year_level
                  and (cs.semester = p_semester or (p_semester = 3 and private.needs_retake(c.id, cs.id))));
  get diagnostics v_sections = row_count;
  if v_sections = 0 then
    raise exception 'No section has subjects in that semester, so there is nothing to prepare.' using errcode = 'P0001';
  end if;

  -- Subjects come from the official curriculum, never from an old term.
  insert into public.class_offerings (section_id, curriculum_subject_id)
  select distinct ns.id, cs.id
  from public.sections ns
  join public.curricula c on c.program_id = ns.program_id and c.is_active
  join public.curriculum_subjects cs on cs.curriculum_id = c.id and cs.year_level = ns.year_level
    and (cs.semester = p_semester or (p_semester = 3 and private.needs_retake(c.id, cs.id)))
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

revoke all on function public.prepare_term(text, smallint, date, date) from public, anon;
grant execute on function public.prepare_term(text, smallint, date, date) to authenticated;
