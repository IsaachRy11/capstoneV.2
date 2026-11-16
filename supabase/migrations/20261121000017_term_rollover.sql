-- Starting a new semester, summer or school year from the app (School year page, secretary only).
--
-- Steps, each a database function so it runs as one transaction:
--   prepare_term()        creates the term and copies the section structure of the latest term; each section gets the
--                         curriculum subjects of its year for that semester, and class times are copied from the same
--                         section and subject the last time that semester ran (rooms and times are a starting point).
--   discard_term()        removes a prepared term that hasn't started yet.
--   preview_term_start()  runs start_term's exact work and rolls it back, returning what would happen.
--   start_term()          the switch, all or nothing (see private.run_term_start for the rules).
--   undo_term_start()     puts the previous term back while the new one has no grades yet.
--
-- Every step takes the same transaction lock (pg_advisory_xact_lock(20261121)), so two term changes never run at the
-- same time (two tabs, two people, or Undo pressed while a Start is still running): the second waits for the first to
-- finish and then sees its result.
--
-- Rules (user decisions, Nov 2026; the CCS office still has to confirm them, so they live here in one place):
--   * Graduation: a student whose every curriculum subject is passed is marked Graduated when any term starts
--     (so summer subjects count).
--   * A new school year moves every active student up one year level, failures or not, except in their program's
--     last year (4th, or 2nd for ACT): they stay there until everything is passed.
--   * Only students who were registered in some term of the current school year move on (others are on leave and
--     are placed by the secretary).
--   * A student is placed in the section with the same letter in their year (BSIT 1-S -> BSIT 2-S); if that letter
--     doesn't exist, the section of their program and year with the most free seats.
--   * They get the section's subjects they haven't passed, then their carried subjects (earlier years, same
--     semester, not passed) in whichever section has a free seat and fits their timetable.
--   * A subject whose prerequisite isn't passed, or whose year standing isn't reached, is not added: the student
--     takes the prerequisite first. A unit limit per student (passed in by the page) caps the load.
--   * Whatever couldn't be done is listed for the secretary, who can still change everything afterwards.

-- ─── Unit limit: each student has their own (shown and edited on their record) ─────────────
-- The default is a placeholder until the CCS office confirms the number. The start leaves out a subject that would
-- take a student past their limit, and lists it.
alter table public.students add column max_units smallint not null default 30 check (max_units between 1 and 60);

-- ─── Helpers ───────────────────────────────────────────────────────────────
create function private.has_passed(p_student text, p_subject bigint) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    where e.student_id = p_student and o.curriculum_subject_id = p_subject and e.status = 'passed')
$$;

-- The first prerequisite of a subject that the student hasn't passed (null when all are passed).
create function private.missing_prerequisite(p_student text, p_subject bigint) returns text
language sql stable security definer set search_path = ''
as $$
  select pre.code
  from public.subject_prerequisites sp
  join public.curriculum_subjects pre on pre.id = sp.prerequisite_id
  where sp.subject_id = p_subject and not private.has_passed(p_student, sp.prerequisite_id)
  order by pre.year_level, pre.semester, pre.sort_order
  limit 1
$$;

revoke all on function private.has_passed(text, bigint), private.missing_prerequisite(text, bigint) from public, anon;

-- ─── Record of each start, so it can be undone ───────────────────────────────
create table public.term_starts (
  id              bigint generated always as identity primary key,
  from_term_id    bigint references public.school_terms (id) on delete set null,
  to_term_id      bigint not null references public.school_terms (id) on delete cascade,
  started_by      uuid,
  started_at      timestamptz not null default now(),
  students_before jsonb not null default '[]'::jsonb,   -- [{id, year_level, status}] of every active student
  result          jsonb,
  undone_at       timestamptz
);
create index term_starts_from_idx on public.term_starts (from_term_id);
create index term_starts_to_idx on public.term_starts (to_term_id);
alter table public.term_starts enable row level security;
create policy "secretary reads term_starts" on public.term_starts
  for select to authenticated using ((select private.is_secretary()));
grant select on public.term_starts to authenticated;

-- ─── Prerequisites on enrollment (the secretary, in the app) ───────────────
-- Runs after the seat, status and clash rules (trigger names run alphabetically), so their messages come first.
-- No override: a subject can't be added until its prerequisite is passed. Writes with no signed-in secretary
-- (the seed, migrations, tests of other rules) are not checked, so existing demo records still load.
create function private.check_prerequisite() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_subject bigint;
  v_missing text;
begin
  if not (select private.is_secretary()) then return new; end if;
  if tg_op = 'UPDATE' and new.offering_id = old.offering_id then return new; end if;
  select o.curriculum_subject_id into v_subject from public.class_offerings o where o.id = new.offering_id;
  v_missing := private.missing_prerequisite(new.student_id, v_subject);
  if v_missing is not null then
    raise exception 'This subject needs % passed first. Enroll the student in % before this one.', v_missing, v_missing
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger enrollments_prerequisite_check
  before insert or update of offering_id on public.enrollments
  for each row execute function private.check_prerequisite();

-- The warning shown before adding: which of these students would be refused for this class, and why.
-- Returns {"2025-0001": "IT 306", ...} for the students whose prerequisite isn't passed (empty when none).
create function public.prerequisite_gaps(p_offering bigint, p_students text[]) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_object_agg(x.s, x.m), '{}'::jsonb)
  from (
    select s, private.missing_prerequisite(s, (select o.curriculum_subject_id from public.class_offerings o where o.id = p_offering)) as m
    from unnest(p_students) as s
  ) x
  where x.m is not null and (select private.is_secretary())
$$;

-- ─── Prepare ───────────────────────────────────────────────────────────────
create function public.prepare_term(p_school_year text, p_semester smallint, p_starts date, p_ends date)
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

  -- Only sections whose year has subjects this semester (summer: 3rd-year BSIT and BSCS).
  insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
  select v_term.id, s.program_id, s.year_level, s.name, s.capacity, s.home_room_id
  from public.sections s
  where s.school_term_id = v_src.id
    and exists (select 1 from public.curriculum_subjects cs
                join public.curricula c on c.id = cs.curriculum_id and c.is_active
                where c.program_id = s.program_id and cs.year_level = s.year_level and cs.semester = p_semester);
  get diagnostics v_sections = row_count;
  if v_sections = 0 then
    raise exception 'No section has subjects in that semester, so there is nothing to prepare.' using errcode = 'P0001';
  end if;

  -- Subjects come from the official curriculum, never from an old term.
  insert into public.class_offerings (section_id, curriculum_subject_id)
  select distinct ns.id, cs.id
  from public.sections ns
  join public.curricula c on c.program_id = ns.program_id and c.is_active
  join public.curriculum_subjects cs on cs.curriculum_id = c.id and cs.year_level = ns.year_level and cs.semester = p_semester
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

-- ─── Discard a prepared term ───────────────────────────────────────────────────
create function public.discard_term(p_term_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can discard a term.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time (see the top of this file)
  if exists (select 1 from public.school_terms where id = p_term_id and is_current) then
    raise exception 'This term has already started. Use Undo instead.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.registrations where school_term_id = p_term_id)
     or exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
                join public.sections s on s.id = o.section_id where s.school_term_id = p_term_id) then
    raise exception 'Students are already in this term, so it can''t be discarded.' using errcode = 'P0001';
  end if;
  delete from public.sections where school_term_id = p_term_id;  -- classes and class times go with them
end $$;

-- ─── The start itself ────────────────────────────────────────────────────────
create function private.run_term_start(p_term_id bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_t public.school_terms%rowtype;
  v_cur public.school_terms%rowtype;
  v_new_year boolean;
  v_graduated int := 0;
  v_moved int := 0;
  v_stayed int := 0;
  v_registered int := 0;
  v_classes int := 0;
  v_carried int := 0;
  v_waiting jsonb := '[]'::jsonb;    -- subjects waiting for a prerequisite or year standing
  v_unplaced jsonb := '[]'::jsonb;   -- carried subjects with no class that fits
  v_over jsonb := '[]'::jsonb;       -- subjects left out by the unit limit
  v_nosection jsonb := '[]'::jsonb;  -- students with no section of their year
  v_to_place jsonb := '[]'::jsonb;   -- carried subjects the secretary still has to place
  s record;
  c record;
  v_section bigint;
  v_letter text;
  v_units numeric;
  v_missing text;
  v_placed bigint;
  v_reason text;
begin
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time (see the top of this file)
  select * into v_t from public.school_terms where id = p_term_id;
  if not found then
    raise exception 'That term doesn''t exist.' using errcode = 'P0001';
  end if;
  if v_t.is_current then
    raise exception 'This term has already started.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.sections where school_term_id = p_term_id) then
    raise exception 'Prepare this term first.' using errcode = 'P0001';
  end if;
  select * into v_cur from public.school_terms where is_current;
  if found and (v_t.school_year, v_t.semester) <= (v_cur.school_year, v_cur.semester) then
    raise exception 'Only a term that comes after the current one can be started.' using errcode = 'P0001';
  end if;
  v_new_year := v_cur.id is null or v_t.school_year <> v_cur.school_year;

  insert into public.term_starts (from_term_id, to_term_id, started_by, students_before)
  select v_cur.id, p_term_id, (select auth.uid()),
         coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'year_level', st.year_level, 'status', st.status)), '[]'::jsonb)
  from public.students st where st.status = 'active';

  -- Graduation: every subject of their curriculum passed.
  update public.students st set status = 'graduated'
  where st.status = 'active'
    and exists (select 1 from public.curriculum_subjects cs where cs.curriculum_id = st.curriculum_id)
    and not exists (select 1 from public.curriculum_subjects cs
                    where cs.curriculum_id = st.curriculum_id and not private.has_passed(st.id, cs.id));
  get diagnostics v_graduated = row_count;

  -- Who carries on: active students registered in some term of the current school year.
  create temporary table if not exists pg_temp.rollover_students (id text primary key) on commit drop;
  truncate pg_temp.rollover_students;
  insert into pg_temp.rollover_students (id)
  select st.id from public.students st
  where st.status = 'active'
    and (v_cur.id is null or exists (
      select 1 from public.registrations r join public.school_terms t on t.id = r.school_term_id
      where r.student_id = st.id and t.school_year = v_cur.school_year));

  if v_new_year then
    select count(*) into v_stayed from public.students st join public.programs p on p.id = st.program_id
    where st.id in (select id from pg_temp.rollover_students) and st.year_level >= p.duration_years;
    update public.students st set year_level = st.year_level + 1
    from public.programs p
    where p.id = st.program_id and st.year_level < p.duration_years
      and st.id in (select id from pg_temp.rollover_students);
    get diagnostics v_moved = row_count;
  end if;

  for s in
    select st.id, st.year_level, st.program_id, st.curriculum_id, st.max_units, p.code as program_code,
           (select sec.name from public.registrations r
            join public.sections sec on sec.id = r.section_id
            join public.school_terms t on t.id = r.school_term_id
            where r.student_id = st.id order by t.school_year desc, t.semester desc limit 1) as last_section
    from public.students st
    join public.programs p on p.id = st.program_id
    where st.id in (select id from pg_temp.rollover_students)
    order by st.id
  loop
    v_units := 0;
    v_letter := nullif(split_part(coalesce(s.last_section, ''), '-', 2), '');
    v_section := null;
    select sec.id into v_section from public.sections sec
    where sec.school_term_id = p_term_id
      and sec.name_key = public.norm_key(s.program_code || ' ' || s.year_level || '-' || coalesce(v_letter, ''));
    if v_section is null then
      select sec.id into v_section from public.sections sec
      where sec.school_term_id = p_term_id and sec.program_id = s.program_id and sec.year_level = s.year_level
      order by sec.capacity - (select count(*) from public.registrations r where r.section_id = sec.id) desc, sec.name
      limit 1;
    end if;

    if v_section is not null then
      insert into public.registrations (student_id, school_term_id, section_id, year_level)
      values (s.id, p_term_id, v_section, s.year_level);
      v_registered := v_registered + 1;

      -- Their section's subjects.
      for c in
        select o.id as offering_id, cs.id as subject_id, cs.code, cs.units, cs.standing_required
        from public.class_offerings o join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
        where o.section_id = v_section order by cs.sort_order
      loop
        continue when private.has_passed(s.id, c.subject_id);
        v_missing := private.missing_prerequisite(s.id, c.subject_id);
        if v_missing is not null or coalesce(c.standing_required, 0) > s.year_level then
          v_waiting := v_waiting || jsonb_build_object('student_id', s.id, 'code', c.code,
            'needs', coalesce(v_missing, c.standing_required || case c.standing_required when 2 then 'nd' when 3 then 'rd' else 'th' end || '-year standing'));
          continue;
        end if;
        if v_units + c.units > s.max_units then
          v_over := v_over || jsonb_build_object('student_id', s.id, 'code', c.code);
          continue;
        end if;
        begin
          insert into public.enrollments (student_id, offering_id) values (s.id, c.offering_id);
          v_units := v_units + c.units;
          v_classes := v_classes + 1;
        exception when others then
          v_unplaced := v_unplaced || jsonb_build_object('student_id', s.id, 'code', c.code, 'reason', sqlerrm);
        end;
      end loop;
    end if;

    -- Carried subjects (earlier years, this semester, not passed) are NOT enrolled here. Each one is a decision
    -- for the secretary (Section allocations or bulk enroll), so they are listed with the student. Prerequisites
    -- still come first: a subject that waits for one is listed as waiting.
    for c in
      select cs.id as subject_id, cs.code, cs.units
      from public.curriculum_subjects cs
      where cs.curriculum_id = s.curriculum_id and cs.semester = v_t.semester and cs.year_level < s.year_level
        and not private.has_passed(s.id, cs.id)
        and not exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
                        join public.sections sec on sec.id = o.section_id
                        where e.student_id = s.id and o.curriculum_subject_id = cs.id and sec.school_term_id = p_term_id)
      order by cs.year_level, cs.sort_order
    loop
      v_missing := private.missing_prerequisite(s.id, c.subject_id);
      if v_missing is not null then
        v_waiting := v_waiting || jsonb_build_object('student_id', s.id, 'code', c.code, 'needs', v_missing);
      else
        v_to_place := v_to_place || jsonb_build_object('student_id', s.id, 'code', c.code, 'units', c.units);
      end if;
    end loop;

    if v_t.semester in (1, 2)
       and not exists (select 1 from public.registrations r where r.student_id = s.id and r.school_term_id = p_term_id) then
      v_nosection := v_nosection || jsonb_build_object('student_id', s.id, 'year_level', s.year_level, 'program', s.program_code);
    end if;
  end loop;

  update public.school_terms set is_current = false where is_current;
  update public.school_terms set is_current = true where id = p_term_id;

  return jsonb_build_object(
    'term_id', p_term_id, 'new_school_year', v_new_year,
    'graduated', v_graduated, 'moved_up', v_moved, 'stayed_in_last_year', v_stayed,
    'registered', v_registered, 'classes_added', v_classes, 'to_place', v_to_place,
    'waiting', v_waiting, 'unplaced', v_unplaced, 'over_limit', v_over, 'no_section', v_nosection);
end $$;
revoke all on function private.run_term_start(bigint) from public, anon;

-- Same work, rolled back: the preview can never drift from the real thing.
create function public.preview_term_start(p_term_id bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can start a term.' using errcode = '42501';
  end if;
  begin
    v_result := private.run_term_start(p_term_id);
    raise exception 'preview only' using errcode = 'PV001';
  exception
    when sqlstate 'PV001' then null;  -- undo everything, keep the summary
    when others then v_result := jsonb_build_object('error', sqlerrm);
  end;
  return v_result;
end $$;

create function public.start_term(p_term_id bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can start a term.' using errcode = '42501';
  end if;
  v_result := private.run_term_start(p_term_id);
  update public.term_starts set result = v_result
  where id = (select max(id) from public.term_starts where to_term_id = p_term_id);
  return v_result;
end $$;

-- ─── Undo ──────────────────────────────────────────────────────────────────
create function public.undo_term_start() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_start public.term_starts%rowtype;
  v_restored int;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can undo a term start.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time (see the top of this file)
  select * into v_start from public.term_starts where undone_at is null order by id desc limit 1;
  if not found then
    raise exception 'There is no term start to undo.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.school_terms where id = v_start.to_term_id and is_current) then
    raise exception 'That term is no longer the current one, so it can''t be undone.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.sections sec on sec.id = o.section_id
    where sec.school_term_id = v_start.to_term_id
      and (e.midterm_grade is not null or e.final_grade is not null or e.status <> 'enrolled'
           or exists (select 1 from public.grade_changes g where g.enrollment_id = e.id))) then
    raise exception 'Grades or statuses were already entered in the new term, so it can''t be undone.' using errcode = 'P0001';
  end if;

  delete from public.enrollments e using public.class_offerings o, public.sections sec
  where o.id = e.offering_id and sec.id = o.section_id and sec.school_term_id = v_start.to_term_id;
  delete from public.registrations where school_term_id = v_start.to_term_id;

  update public.students st
  set year_level = (b ->> 'year_level')::smallint, status = (b ->> 'status')::public.student_status
  from jsonb_array_elements(v_start.students_before) b
  where st.id = b ->> 'id';
  get diagnostics v_restored = row_count;

  update public.school_terms set is_current = false where is_current;
  if v_start.from_term_id is not null then
    update public.school_terms set is_current = true where id = v_start.from_term_id;
  end if;
  update public.term_starts set undone_at = now() where id = v_start.id;
  return jsonb_build_object('restored_students', v_restored, 'term_id', v_start.from_term_id);
end $$;

revoke all on function public.prepare_term(text, smallint, date, date), public.discard_term(bigint),
  public.preview_term_start(bigint), public.start_term(bigint), public.undo_term_start() from public, anon;
grant execute on function public.prepare_term(text, smallint, date, date), public.discard_term(bigint),
  public.preview_term_start(bigint), public.start_term(bigint), public.undo_term_start() to authenticated;

revoke all on function public.prerequisite_gaps(bigint, text[]) from public, anon;
grant execute on function public.prerequisite_gaps(bigint, text[]) to authenticated;
