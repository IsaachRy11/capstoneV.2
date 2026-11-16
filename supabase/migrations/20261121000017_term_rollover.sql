-- Starting a new semester, summer or school year from the app (School year page, secretary only).
--
-- What the app calls (each a database function, so each runs as one transaction):
--   begin_term()           the School year page's Start: creates the term if needed (prepare_term copies the latest
--                          semester's sections, gives each its curriculum subjects, copies old class times), adds its
--                          first and last day to the calendar, then switches the site to it (private.run_term_start).
--   undo_term_start()      puts the previous term back while the new one has no grades yet.
--   section_enroll_plan()  the Enroll students page: who to enroll in a section and what each would get.
--   enroll_in_section()    enrolls the chosen students in the section's subjects.
--   prerequisite_gaps()    the warning in the enroll box ("Needs IT 306 passed first").
--
-- Every step takes the same transaction lock (pg_advisory_xact_lock(20261121)), so two term changes never run at the
-- same time (two tabs, two people, or Undo pressed while a Start is still running): the second waits for the first to
-- finish and then sees its result.
--
-- Rules (user decisions, Nov 2026; demo settings, not confirmed by the CCS office):
--   * Starting a term only creates it (sections, classes, class times) and switches the site to it. Nobody is
--     enrolled and nobody is moved up automatically: the secretary enrolls students afterwards, a section at a time
--     (section_enroll_plan + enroll_in_section, the "Enroll students" page) or one class at a time.
--   * A student's year level follows what they are enrolled in this semester: the highest year among this term's
--     subjects, but never lower than the highest year they have already passed (private.sync_year_level).
--   * Graduation: a student whose every curriculum subject is passed is marked Graduated when any term starts.
--   * A subject whose prerequisite isn't passed can't be enrolled, by anyone (no override). A unit limit per
--     student (on their record) caps the load when enrolling a section.
--   * A new school year starts with its 1st semester. Its calendar starts empty except the first and last day of
--     classes, added when the term starts (and removed by Undo); nothing is copied from an earlier year.

-- ─── Unit limit: each student has their own (shown and edited on their record) ─────────────
-- The default is a demo setting. Enrolling a student in a section leaves out a subject that would take them past
-- their limit, and says so.
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
  added_events    bigint[] not null default '{}',   -- calendar entries the start added (removed by Undo)
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

-- ─── The start itself ────────────────────────────────────────────────────────
create function private.run_term_start(p_term_id bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_t public.school_terms%rowtype;
  v_cur public.school_terms%rowtype;
  v_new_year boolean;
  v_graduated int := 0;
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

  -- Snapshot for Undo (year levels change later as the secretary enrolls students; Undo puts them back).
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

  update public.school_terms set is_current = false where is_current;
  update public.school_terms set is_current = true where id = p_term_id;

  return jsonb_build_object(
    'term_id', p_term_id, 'new_school_year', v_new_year, 'graduated', v_graduated,
    'sections', (select count(*) from public.sections where school_term_id = p_term_id),
    'classes', (select count(*) from public.class_offerings o join public.sections sec on sec.id = o.section_id
                where sec.school_term_id = p_term_id));
end $$;
revoke all on function private.run_term_start(bigint) from public, anon;

-- ─── One step: what the School year page uses ─────────────────────────────────────
-- Prepares the term if it isn't prepared yet (or updates its dates if it is), then starts it, in one transaction.
create function public.begin_term(p_school_year text, p_semester smallint, p_starts date, p_ends date) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_term bigint;
  v_result jsonb;
  v_y1 int;
  v_label text;
  v_events bigint[];
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can start a term.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    raise exception 'Enter the first and last day of classes (the last day after the first).' using errcode = 'P0001';
  end if;
  if p_school_year !~ '^[0-9]{4}-[0-9]{4}$' then
    raise exception 'The school year must look like 2027-2028.' using errcode = 'P0001';
  end if;
  v_y1 := split_part(p_school_year, '-', 1)::int;
  if p_starts < make_date(v_y1, 6, 1) or p_ends > make_date(v_y1 + 1, 6, 30) then
    raise exception 'The dates must fall within school year % (June % to June %).', p_school_year, v_y1, v_y1 + 1
      using errcode = 'P0001';
  end if;
  if exists (select 1 from public.school_terms t where t.school_year = p_school_year and t.semester < p_semester
             and t.ends_on is not null and t.ends_on >= p_starts) then
    raise exception 'This term has to start after the previous semester ends.' using errcode = 'P0001';
  end if;
  select id into v_term from public.school_terms where school_year = p_school_year and semester = p_semester;
  if v_term is null or not exists (select 1 from public.sections where school_term_id = v_term) then
    perform public.prepare_term(p_school_year, p_semester, p_starts, p_ends);
    select id into v_term from public.school_terms where school_year = p_school_year and semester = p_semester;
  else
    update public.school_terms set starts_on = p_starts, ends_on = p_ends where id = v_term;
  end if;
  v_result := private.run_term_start(v_term);

  -- The calendar gets the first and last day of classes (unless that school year already has a "classes" entry on
  -- that day, like the official 2026-2027 calendar). Nothing else is added or copied.
  v_label := case p_semester when 1 then '1st Semester' when 2 then '2nd Semester' else 'Summer' end;
  with added as (
    insert into public.school_calendar_events (school_year, title, starts_on, ends_on, kind)
    select p_school_year, x.title, x.d, x.d, 'classes'
    from (values ('Start of Classes (' || v_label || ')', p_starts), ('End of Classes (' || v_label || ')', p_ends)) as x(title, d)
    where not exists (select 1 from public.school_calendar_events e
                      where e.school_year = p_school_year and e.kind = 'classes' and e.starts_on = x.d)
    on conflict do nothing
    returning id)
  select coalesce(array_agg(id), '{}') into v_events from added;

  update public.term_starts set result = v_result, added_events = v_events
  where id = (select max(id) from public.term_starts where to_term_id = v_term);
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
  delete from public.school_calendar_events where id = any(v_start.added_events);
  update public.term_starts set undone_at = now() where id = v_start.id;
  return jsonb_build_object('restored_students', v_restored, 'term_id', v_start.from_term_id);
end $$;

revoke all on function public.prepare_term(text, smallint, date, date), public.undo_term_start() from public, anon;
grant execute on function public.prepare_term(text, smallint, date, date), public.undo_term_start() to authenticated;

revoke all on function public.prerequisite_gaps(bigint, text[]) from public, anon;
grant execute on function public.prerequisite_gaps(bigint, text[]) to authenticated;

revoke all on function public.begin_term(text, smallint, date, date) from public, anon;
grant execute on function public.begin_term(text, smallint, date, date) to authenticated;

-- ─── Year level follows this semester's subjects ────────────────────────────────────
-- The highest year among the student's subjects this term (Dropped classes don't count), but never lower than the
-- highest year they have already passed. Nothing enrolled this term: the year level stays as it is.
create function private.sync_year_level() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_student text := coalesce(new.student_id, old.student_id);
  v_now smallint;
  v_passed smallint;
begin
  select max(cs.year_level) into v_now
  from public.enrollments e
  join public.class_offerings o on o.id = e.offering_id
  join public.sections sec on sec.id = o.section_id
  join public.school_terms t on t.id = sec.school_term_id and t.is_current
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where e.student_id = v_student and e.status <> 'dropped';
  if v_now is null then
    return null;
  end if;
  select max(cs.year_level) into v_passed
  from public.enrollments e
  join public.class_offerings o on o.id = e.offering_id
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where e.student_id = v_student and e.status = 'passed';
  update public.students set year_level = greatest(v_now, coalesce(v_passed, 0))
  where id = v_student and status = 'active' and year_level <> greatest(v_now, coalesce(v_passed, 0));
  return null;
end $$;
create trigger enrollments_sync_year_level
  after insert or delete or update of status, offering_id on public.enrollments
  for each row execute function private.sync_year_level();
revoke all on function private.sync_year_level() from public, anon;

-- ─── The Enroll students page ─────────────────────────────────────────────────
-- Who to enroll in a section and what each would get. With no list given, the candidates are the students who were
-- in this section's block last term (same program and section letter; one year lower when this section belongs to a
-- new school year) plus anyone already registered here. For each student: every subject of the section and whether
-- it would be added, or why not (already enrolled, passed, prerequisite not passed, unit limit), and the subjects of
-- earlier years they failed, dropped or left INC that run this semester (to retake, class by class).
create function public.section_enroll_plan(p_section bigint, p_students text[] default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_sec record;
  v_prev bigint;
  v_prev_sy text;
  v_from_year int;
  v_letter text;
  s record;
  c record;
  v_rows jsonb := '[]'::jsonb;
  v_subjects jsonb;
  v_retake jsonb;
  v_units numeric;
  v_add int;
  v_missing text;
  v_state text;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can enroll students.' using errcode = '42501';
  end if;
  select sec.id, sec.name, sec.program_id, sec.year_level, sec.school_term_id, t.school_year, t.semester into v_sec
  from public.sections sec join public.school_terms t on t.id = sec.school_term_id where sec.id = p_section;
  if not found then
    raise exception 'That section doesn''t exist.' using errcode = 'P0001';
  end if;
  v_letter := split_part(v_sec.name, '-', 2);
  select t.id, t.school_year into v_prev, v_prev_sy from public.school_terms t
  where (t.school_year, t.semester) < (v_sec.school_year, v_sec.semester)
    and exists (select 1 from public.registrations r where r.school_term_id = t.id)
  order by t.school_year desc, t.semester desc
  limit 1;
  v_from_year := case when v_prev_sy is distinct from v_sec.school_year then v_sec.year_level - 1 else v_sec.year_level end;

  for s in
    select st.id, st.first_name || ' ' || st.last_name as full_name, st.status, st.year_level, st.max_units, st.curriculum_id,
           (select count(*) from public.v_student_deficiencies d where d.student_id = st.id) as failed,
           (select sec2.name from public.registrations r join public.sections sec2 on sec2.id = r.section_id
            where r.student_id = st.id and r.school_term_id = v_prev) as last_section,
           exists (select 1 from public.registrations r where r.student_id = st.id and r.section_id = p_section) as in_section
    from public.students st
    where (p_students is not null and st.id = any(p_students))
       or (p_students is null and st.status = 'active' and (
             exists (select 1 from public.registrations r where r.student_id = st.id and r.section_id = p_section)
             or exists (select 1 from public.registrations r join public.sections sec2 on sec2.id = r.section_id
                        where r.student_id = st.id and r.school_term_id = v_prev and sec2.program_id = v_sec.program_id
                          and sec2.year_level = v_from_year and split_part(sec2.name, '-', 2) = v_letter)))
    order by st.last_name, st.first_name
  loop
    select coalesce(sum(cs.units), 0) into v_units
    from public.enrollments e join public.class_offerings o on o.id = e.offering_id
    join public.sections sec2 on sec2.id = o.section_id join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where e.student_id = s.id and sec2.school_term_id = v_sec.school_term_id and e.status <> 'dropped';
    v_subjects := '[]'::jsonb;
    v_add := 0;
    for c in
      select o.id, cs.id as subject_id, cs.code, cs.units
      from public.class_offerings o join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
      where o.section_id = p_section order by cs.sort_order
    loop
      v_missing := null;
      if exists (select 1 from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
                 join public.sections sec2 on sec2.id = o2.section_id
                 where e.student_id = s.id and o2.curriculum_subject_id = c.subject_id and sec2.school_term_id = v_sec.school_term_id) then
        v_state := 'enrolled';
      elsif private.has_passed(s.id, c.subject_id) then
        v_state := 'passed';
      else
        v_missing := private.missing_prerequisite(s.id, c.subject_id);
        if v_missing is not null then
          v_state := 'needs';
        elsif v_units + c.units > s.max_units then
          v_state := 'over_limit';
        else
          v_state := 'add';
          v_units := v_units + c.units;
          v_add := v_add + 1;
        end if;
      end if;
      v_subjects := v_subjects || jsonb_build_object('code', c.code, 'units', c.units, 'state', v_state, 'needs', v_missing);
    end loop;

    select coalesce(jsonb_agg(cs.code order by cs.year_level, cs.sort_order), '[]'::jsonb) into v_retake
    from public.curriculum_subjects cs
    where cs.curriculum_id = s.curriculum_id and cs.semester = v_sec.semester and cs.year_level < v_sec.year_level
      and not private.has_passed(s.id, cs.id)
      and exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
                  where e.student_id = s.id and o.curriculum_subject_id = cs.id);

    v_rows := v_rows || jsonb_build_object('student_id', s.id, 'full_name', s.full_name, 'status', s.status,
      'year_level', s.year_level, 'failed', s.failed, 'last_section', s.last_section, 'in_section', s.in_section,
      'to_add', v_add, 'subjects', v_subjects, 'retake', v_retake);
  end loop;
  return jsonb_build_object('section', v_sec.name, 'from_year', v_from_year, 'students', v_rows);
end $$;

-- Enroll these students in a section: they are registered there (unless already in a section this term) and get
-- every subject of the section they can take, exactly as the plan said. Returns what each student got and why
-- anything was skipped. The usual rules still apply (seats, timetable clashes, active students only).
create function public.enroll_in_section(p_section bigint, p_students text[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_sec record;
  s record;
  c record;
  v_units numeric;
  v_out jsonb := '[]'::jsonb;
  v_added int;
  v_skipped jsonb;
  v_missing text;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can enroll students.' using errcode = '42501';
  end if;
  select sec.id, sec.school_term_id, sec.year_level into v_sec from public.sections sec where sec.id = p_section;
  if not found then
    raise exception 'That section doesn''t exist.' using errcode = 'P0001';
  end if;
  for s in select st.id, st.max_units, st.status from public.students st where st.id = any(p_students) order by st.id loop
    v_added := 0;
    v_skipped := '[]'::jsonb;
    if s.status <> 'active' then
      v_out := v_out || jsonb_build_object('student_id', s.id, 'added', 0,
        'skipped', jsonb_build_array(jsonb_build_object('code', null, 'why', 'not an active student')));
      continue;
    end if;
    insert into public.registrations (student_id, school_term_id, section_id, year_level)
    values (s.id, v_sec.school_term_id, p_section, v_sec.year_level)
    on conflict (student_id, school_term_id) do nothing;
    select coalesce(sum(cs.units), 0) into v_units
    from public.enrollments e join public.class_offerings o on o.id = e.offering_id
    join public.sections sec2 on sec2.id = o.section_id join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where e.student_id = s.id and sec2.school_term_id = v_sec.school_term_id and e.status <> 'dropped';
    for c in
      select o.id, cs.id as subject_id, cs.code, cs.units
      from public.class_offerings o join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
      where o.section_id = p_section order by cs.sort_order
    loop
      continue when exists (select 1 from public.enrollments e join public.class_offerings o2 on o2.id = e.offering_id
                            join public.sections sec2 on sec2.id = o2.section_id
                            where e.student_id = s.id and o2.curriculum_subject_id = c.subject_id
                              and sec2.school_term_id = v_sec.school_term_id);
      continue when private.has_passed(s.id, c.subject_id);
      v_missing := private.missing_prerequisite(s.id, c.subject_id);
      if v_missing is not null then
        v_skipped := v_skipped || jsonb_build_object('code', c.code, 'why', 'needs ' || v_missing || ' passed first');
        continue;
      end if;
      if v_units + c.units > s.max_units then
        v_skipped := v_skipped || jsonb_build_object('code', c.code, 'why', 'over their unit limit');
        continue;
      end if;
      begin
        insert into public.enrollments (student_id, offering_id) values (s.id, c.id);
        v_units := v_units + c.units;
        v_added := v_added + 1;
      exception when others then
        v_skipped := v_skipped || jsonb_build_object('code', c.code, 'why', sqlerrm);
      end;
    end loop;
    v_out := v_out || jsonb_build_object('student_id', s.id, 'added', v_added, 'skipped', v_skipped);
  end loop;
  return v_out;
end $$;

revoke all on function public.section_enroll_plan(bigint, text[]), public.enroll_in_section(bigint, text[]) from public, anon;
grant execute on function public.section_enroll_plan(bigint, text[]), public.enroll_in_section(bigint, text[]) to authenticated;
