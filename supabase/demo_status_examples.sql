-- Demo examples for the Graduated, Dropped and Shifted out lists (5 each). Safe to re-run: it does nothing once
-- the examples exist (it looks for students whose first name is in the list below with that status).
-- Run after seed.sql. Students, sections and grades are made up; the curriculum is the official one.
--   Graduated:   ACT (two-year program) students who entered SY 2024-2025 and passed every 1st and 2nd year subject.
--   Dropped:     BSIT/BSCS students who entered SY 2025-2026, took one or two semesters, then stopped.
--   Shifted out: students who took one or two semesters in one program and moved to another program
--                (their old record stays with its grades; in real use they are added again as a new student).
do $$
declare
  spec jsonb := '[
    {"status":"graduated","code":"ACT","entry":2024,"terms":4,"first":"Andrea","last":"Montero"},
    {"status":"graduated","code":"ACT","entry":2024,"terms":4,"first":"Benedict","last":"Salazar"},
    {"status":"graduated","code":"ACT","entry":2024,"terms":4,"first":"Camille","last":"Ortega"},
    {"status":"graduated","code":"ACT","entry":2024,"terms":4,"first":"Darwin","last":"Paredes"},
    {"status":"graduated","code":"ACT","entry":2024,"terms":4,"first":"Elaine","last":"Ramos"},
    {"status":"dropped","code":"BSIT","entry":2025,"terms":1,"first":"Fritz","last":"Navarro","fail":true},
    {"status":"dropped","code":"BSIT","entry":2025,"terms":2,"first":"Grace","last":"Lim"},
    {"status":"dropped","code":"BSCS","entry":2025,"terms":1,"first":"Hector","last":"Bautista"},
    {"status":"dropped","code":"BSCS","entry":2025,"terms":2,"first":"Isabel","last":"Torres","fail":true},
    {"status":"dropped","code":"BSIT","entry":2025,"terms":2,"first":"Jomar","last":"Cortes"},
    {"status":"shifted_out","code":"BSCS","entry":2025,"terms":2,"first":"Karla","last":"Mendoza"},
    {"status":"shifted_out","code":"BSIT","entry":2025,"terms":1,"first":"Leonard","last":"Garcia"},
    {"status":"shifted_out","code":"ACT","entry":2025,"terms":2,"first":"Monica","last":"Aquino","fail":true},
    {"status":"shifted_out","code":"BSCS","entry":2024,"terms":2,"first":"Noel","last":"Santos"},
    {"status":"shifted_out","code":"BSIT","entry":2024,"terms":1,"first":"Ofelia","last":"Reyes"}
  ]';
  passing numeric[] := array[1.25,1.50,1.75,2.00,2.25,2.50,2.75];
  s jsonb;
  prog record;
  cur bigint;
  term record;
  sid text;
  n int;
  taken int;
  level int;
  sec_id bigint;
  off_id bigint;
  subj record;
  room bigint;
  fg numeric;
  last_term boolean;
  failed boolean;
begin
  if exists (select 1 from public.students where status in ('graduated', 'dropped', 'shifted_out')
             and first_name in ('Andrea', 'Fritz', 'Karla')) then
    raise notice 'status examples already exist; nothing to do';
    return;
  end if;
  select id into room from public.rooms where kind = 'lecture' and name like 'Room%' order by name limit 1;

  for s in select * from jsonb_array_elements(spec) loop
    select * into prog from public.programs where code = s->>'code';
    select id into cur from public.curricula where program_id = prog.id and is_active;
    select coalesce(max(right(id, 4)::int), 0) + 1 into n from public.students where left(id, 4) = s->>'entry';
    sid := (s->>'entry') || '-' || lpad(n::text, 4, '0');

    insert into public.students (id, first_name, last_name, program_id, curriculum_id, year_level, admission_type)
    values (sid, s->>'first', s->>'last', prog.id, cur, 1, 'new');

    taken := 0;
    failed := false;
    for term in
      select * from public.school_terms
      where semester in (1, 2) and not is_current
        and school_year >= (s->>'entry') || '-' || ((s->>'entry')::int + 1)
      order by school_year, semester
    loop
      exit when taken >= (s->>'terms')::int;
      level := taken / 2 + 1;
      taken := taken + 1;
      last_term := taken = (s->>'terms')::int;

      -- The block section "<PROGRAM> <year>-S" of that term (created like the seed does when missing).
      select id into sec_id from public.sections
      where school_term_id = term.id and name_key = public.norm_key(prog.code || ' ' || level || '-S');
      if not found then
        insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
        values (term.id, prog.id, level, prog.code || ' ' || level || '-S', 40, room) returning id into sec_id;
      end if;
      insert into public.registrations (student_id, school_term_id, section_id, year_level)
      values (sid, term.id, sec_id, level);

      for subj in
        select * from public.curriculum_subjects
        where curriculum_id = cur and year_level = level and semester = term.semester order by sort_order
      loop
        select id into off_id from public.class_offerings where section_id = sec_id and curriculum_subject_id = subj.id;
        if not found then
          insert into public.class_offerings (section_id, curriculum_subject_id) values (sec_id, subj.id) returning id into off_id;
        end if;
        -- Everyone passes, except one failed subject in the last term for the students marked "fail".
        fg := passing[1 + floor(random() * array_length(passing, 1))::int];
        if (s->>'fail')::boolean and last_term and not failed then
          fg := 5.00; failed := true;
        end if;
        insert into public.enrollments (student_id, offering_id, midterm_grade, final_grade, status)
        values (sid, off_id, case when fg = 5.00 then 5.00 else fg end, fg, 'enrolled');
      end loop;
    end loop;

    update public.students set status = (s->>'status')::public.student_status, year_level = greatest(level, 1) where id = sid;
  end loop;
end $$;
