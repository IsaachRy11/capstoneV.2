-- Demo data: finishes the 1st semester of SY 2026-2027 and moves the site into the 2nd semester, with the CCS
-- room list and class times between 7:30 AM and 8:30 PM. Not a migration. Grades, schedules and students are
-- demonstration data; only the curriculum is official. Runs as one block (all or nothing) and does nothing if the
-- current term is already the 2nd semester. Run after migration 0027.
--
-- Rooms: major subjects (IT, CS, ACT codes) use the computer labs first, then ROOM 422/421, then general rooms.
--        Other (minor) subjects use ROOM 413-415 first, then general rooms, then ROOM 421/422.
--        PATHFIT meets in PE SHED 1, which several sections can use at the same time.
do $$
declare
  labs text[] := array['LAB 407','LAB 408','LAB 409','ILLC'];
  mixed text[] := array['ROOM 422','ROOM 421'];
  minor_rooms text[] := array['ROOM 413','ROOM 414','ROOM 415'];
  general text[];
  demo constant text := '2025-0001';
  sec_uid uuid;
  old_term public.school_terms%rowtype;
  new_term bigint;
  names text[];
  n text;
  o record;
  s record;
  rooms_pref text[];
  hours numeric;
  patterns int[][];
  days int[];
  len interval;
  t0 time;
  t1 time;
  pick bigint;
  placed boolean;
  step int;
  offset_n int;
  k int;
  pass int;
  new_sec bigint;
  added int := 0;
  skipped int := 0;
  untimed int := 0;
  passing numeric[] := array[1.00,1.25,1.50,1.75,2.00,2.25,2.50,2.75,3.00];
begin
  select * into old_term from public.school_terms where is_current;
  if old_term.semester <> 1 or old_term.school_year <> '2026-2027' then
    raise notice 'current term is not SY 2026-2027 1st semester; nothing to do';
    return;
  end if;

  -- 1. Finish the 1st semester: every class still without a final grade gets one (a few fail or stay NC).
  update public.enrollments e set
    midterm_grade = coalesce(e.midterm_grade, passing[1 + abs(hashtext(e.id::text)) % 9]),
    final_grade = case when abs(hashtext(e.id::text || 'x')) % 100 < 3 then 5.00
                       when abs(hashtext(e.id::text || 'x')) % 100 < 5 then null
                       else passing[1 + abs(hashtext(e.id::text || 'f')) % 9] end,
    status = case when abs(hashtext(e.id::text || 'x')) % 100 between 3 and 4 then 'incomplete'::public.enrollment_status else e.status end
  from public.class_offerings co join public.sections sc on sc.id = co.section_id
  where co.id = e.offering_id and sc.school_term_id = old_term.id and e.status = 'enrolled' and e.final_grade is null;

  -- The demo student shows both kinds of "subjects to resolve": one failed and one NC (neither blocks the whole term).
  with mine as (
    select e.id, row_number() over (
             order by (exists (select 1 from public.subject_prerequisites p where p.prerequisite_id = co.curriculum_subject_id)), cs.sort_order desc) rn
    from public.enrollments e
    join public.class_offerings co on co.id = e.offering_id
    join public.sections sc on sc.id = co.section_id
    join public.curriculum_subjects cs on cs.id = co.curriculum_subject_id
    where e.student_id = demo and sc.school_term_id = old_term.id and e.status <> 'dropped')
  update public.enrollments e set
    final_grade = case m.rn when 1 then 5.00 when 2 then null else least(e.final_grade, 3.00) end,
    status = case m.rn when 2 then 'incomplete'::public.enrollment_status else 'enrolled' end
  from mine m where m.id = e.id;

  -- 2. The room list. Old schedules and rooms are replaced.
  select array_agg('ROOM ' || g order by g) into general
  from (select generate_series(301, 322) g union all select unnest(array[216,217,218,219,220,207,208,209])) x;
  names := labs || mixed || general || minor_rooms;
  foreach n in array names loop
    insert into public.rooms (name, kind, capacity)
    values (n, case when n = any (labs) then 'laboratory' else 'lecture' end, case when n = any (labs) then 40 else 45 end)
    on conflict (name) do nothing;
  end loop;
  insert into public.rooms (name, kind, capacity, is_shared) values ('PE SHED 1', 'lecture', 120, true) on conflict (name) do nothing;
  delete from public.class_meetings;
  update public.sections set home_room_id = null;
  delete from public.rooms where name <> all (names || array['PE SHED 1']);

  -- 3. Start the 2nd semester exactly as the secretary would (sections and subjects come from the curriculum).
  select auth_user_id into sec_uid from public.secretaries where auth_user_id is not null limit 1;
  perform set_config('request.jwt.claim.sub', sec_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', sec_uid, 'role', 'authenticated')::text, true);
  perform public.begin_term('2026-2027', 2::smallint, date '2026-11-23', date '2027-04-23');
  select id into new_term from public.school_terms where is_current;
  -- The school calendar already has this semester's start and end, so drop any copy the term start added.
  delete from public.school_calendar_events e
  using (select unnest(added_events) id from public.term_starts where to_term_id = new_term) a
  where e.id = a.id and exists (select 1 from public.school_calendar_events x
                                where x.id <> e.id and x.school_year = e.school_year and x.kind = 'classes' and x.starts_on = e.starts_on);

  -- 4. Class times, 7:30 AM to 8:30 PM, no section or room clash. Lunch (12:00-1:00) is kept free when possible.
  for o in
    select co.id, co.section_id, cs.code, cs.kind, cs.units, cs.sort_order,
           dense_rank() over (order by co.section_id) sec_no
    from public.class_offerings co
    join public.sections sc on sc.id = co.section_id and sc.school_term_id = new_term
    join public.curriculum_subjects cs on cs.id = co.curriculum_subject_id
    where cs.kind <> 'internship'
    -- majors first, because the computer labs are the scarce rooms
    order by (cs.code ~ '^(IT|CS|ACT)') desc, co.section_id, cs.sort_order
  loop
    if o.code ~ '^PATHFIT' then
      rooms_pref := array['PE SHED 1'];
    elsif o.code ~ '^(IT|CS|ACT)' then
      rooms_pref := labs || mixed || general;
    else
      rooms_pref := minor_rooms || general || mixed;
    end if;
    -- 3-unit subjects meet 3 hours a week (MWF 1 h, or TTh 1.5 h); 2-unit subjects TTh 1 h.
    hours := case when o.units >= 3 then 3 else 2 end;
    placed := false;
    offset_n := ((o.sec_no * 3 + o.sort_order * 2) % 20)::int;
    for pass in 1..2 loop
      exit when placed;
      for k in 0..25 loop
        exit when placed;
        for step in 1..2 loop
          exit when placed;
          if (step + o.sort_order) % 2 = 0 then
            days := array[1,3,5]; len := make_interval(mins => (hours * 60 / 3)::int);
            if hours = 2 then continue; end if;
          else
            days := array[2,4]; len := make_interval(mins => (hours * 60 / 2)::int);
          end if;
          t0 := time '07:30' + (((offset_n + k) % 26) * interval '30 minutes');
          t1 := t0 + len;
          if t1 > time '20:30' or t1 <= t0 then continue; end if;
          if pass = 1 and t0 < time '13:00' and t1 > time '12:00' then continue; end if;
          if exists (select 1 from public.class_meetings m join public.class_offerings x on x.id = m.offering_id
                     where x.section_id = o.section_id and m.weekday = any (days) and m.starts_at < t1 and t0 < m.ends_at) then
            continue;
          end if;
          select r.id into pick
          from unnest(rooms_pref) with ordinality p(name, ord)
          join public.rooms r on r.name = p.name
          where r.is_shared or not exists (select 1 from public.class_meetings m
                    where m.room_id = r.id and m.weekday = any (days) and m.starts_at < t1 and t0 < m.ends_at)
          order by p.ord limit 1;
          if pick is null then continue; end if;
          insert into public.class_meetings (offering_id, weekday, starts_at, ends_at, room_id)
          select o.id, d, t0, t1, pick from unnest(days) d;
          placed := true;
        end loop;
      end loop;
    end loop;
    if not placed then untimed := untimed + 1; end if;
  end loop;

  -- 5. Put every active student in the 2nd-semester subjects of their block (same program, year and section letter).
  --    A subject is skipped when a rule refuses it (prerequisite not passed, unit limit, seats, time clash).
  for s in
    select st.id, st.year_level, sc.program_id, sc.name_key, sc.name
    from public.students st
    join public.registrations r on r.student_id = st.id and r.school_term_id = old_term.id
    join public.sections sc on sc.id = r.section_id
    where st.status = 'active'
    order by st.id
  loop
    select id into new_sec from public.sections
    where school_term_id = new_term and program_id = s.program_id and name_key = s.name_key;
    if new_sec is null then continue; end if;
    insert into public.registrations (student_id, school_term_id, section_id, year_level)
    values (s.id, new_term, new_sec, s.year_level) on conflict do nothing;
    for o in select co.id from public.class_offerings co where co.section_id = new_sec order by co.id loop
      begin
        insert into public.enrollments (student_id, offering_id) values (s.id, o.id);
        added := added + 1;
      exception when others then
        skipped := skipped + 1;
      end;
    end loop;
  end loop;

  raise notice 'subjects added: %, skipped by a rule: %, subjects left without a time: %', added, skipped, untimed;
end $$;
