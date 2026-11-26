-- Demo four-year graduates: 2 BSIT and 2 BSCS who entered SY 2022-2023, took every subject of the curriculum
-- (including the summer after 3rd year), passed them all and graduated after SY 2025-2026. ACT graduates are in
-- demo_status_examples.sql. Students, sections and grades are made up; the curriculum is the official one. Safe to
-- re-run. Run the student sign-in script afterwards.
do $$
declare
  spec jsonb := '[
    {"code":"BSIT","first":"Patricia","last":"Villanueva"},
    {"code":"BSIT","first":"Rodel","last":"Fernandez"},
    {"code":"BSCS","first":"Sheena","last":"Dela Cruz"},
    {"code":"BSCS","first":"Timothy","last":"Mercado"}
  ]';
  passing numeric[] := array[1.25,1.50,1.75,2.00,2.25,2.50,2.75];
  s jsonb;
  prog record;
  cur bigint;
  slot record;
  term record;
  sid text;
  n int;
  sec_id bigint;
  off_id bigint;
  subj record;
  room bigint;
  fg numeric;
  sy text;
begin
  if exists (select 1 from public.students where first_name = 'Patricia' and last_name = 'Villanueva') then
    raise notice 'four-year graduates already exist; nothing to do';
    return;
  end if;
  -- SY 2022-2023 did not exist yet: same dates as SY 2023-2024, one year earlier.
  insert into public.school_terms (school_year, semester, starts_on, ends_on)
  select '2022-2023', t.semester, (t.starts_on - interval '1 year')::date, (t.ends_on - interval '1 year')::date
  from public.school_terms t where t.school_year = '2023-2024' and t.semester in (1, 2)
  on conflict (school_year, semester) do nothing;
  select id into room from public.rooms where kind = 'lecture' and name like 'Room%' order by name limit 1;

  for s in select * from jsonb_array_elements(spec) loop
    select * into prog from public.programs where code = s->>'code';
    select id into cur from public.curricula where program_id = prog.id and is_active;
    select coalesce(max(right(id, 4)::int), 0) + 1 into n from public.students where left(id, 4) = '2022';
    sid := '2022-' || lpad(n::text, 4, '0');
    insert into public.students (id, first_name, last_name, program_id, curriculum_id, year_level, admission_type)
    values (sid, s->>'first', s->>'last', prog.id, cur, 1, 'new');

    -- Every semester of the curriculum in order; year N falls in school year (2021 + N).
    for slot in
      select distinct year_level, semester from public.curriculum_subjects where curriculum_id = cur
      order by year_level, semester
    loop
      sy := (2021 + slot.year_level) || '-' || (2022 + slot.year_level);
      select * into term from public.school_terms where school_year = sy and semester = slot.semester;
      if not found then
        raise exception 'No school term for % semester %', sy, slot.semester;
      end if;
      select id into sec_id from public.sections
      where school_term_id = term.id and name_key = public.norm_key(prog.code || ' ' || case when slot.semester = 3 then 'Summer' else slot.year_level || '-S' end);
      if not found then
        insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
        values (term.id, prog.id, slot.year_level, prog.code || ' ' || case when slot.semester = 3 then 'Summer' else slot.year_level || '-S' end, 40, room)
        returning id into sec_id;
      end if;
      insert into public.registrations (student_id, school_term_id, section_id, year_level)
      values (sid, term.id, sec_id, slot.year_level);
      update public.students set year_level = slot.year_level where id = sid;

      for subj in
        select * from public.curriculum_subjects
        where curriculum_id = cur and year_level = slot.year_level and semester = slot.semester order by sort_order
      loop
        select id into off_id from public.class_offerings where section_id = sec_id and curriculum_subject_id = subj.id;
        if not found then
          insert into public.class_offerings (section_id, curriculum_subject_id) values (sec_id, subj.id) returning id into off_id;
        end if;
        fg := passing[1 + floor(random() * array_length(passing, 1))::int];
        insert into public.enrollments (student_id, offering_id, midterm_grade, final_grade, status)
        values (sid, off_id, fg, fg, 'enrolled');
      end loop;
    end loop;

    update public.students set status = 'graduated', year_level = 4 where id = sid;
  end loop;
end $$;
