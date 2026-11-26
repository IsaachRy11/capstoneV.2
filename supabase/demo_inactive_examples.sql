-- Demo examples for the Inactive list (5). Safe to re-run: it does nothing once they exist.
-- Each finished every semester up to the 1st semester of SY 2026-2027, then did not continue in the 2nd semester, so
-- they have no subject in any later term. Two have one failed subject in their last semester.
-- Students and grades are made up; the curriculum is the official one. Create their sign-ins afterwards.
do $$
declare
  spec jsonb := '[
    {"status":"inactive","code":"BSIT","entry":2026,"terms":1,"first":"Paolo","last":"Villarin"},
    {"status":"inactive","code":"BSCS","entry":2026,"terms":1,"first":"Rhea","last":"Dumalagan","fail":true},
    {"status":"inactive","code":"BSIT","entry":2025,"terms":3,"first":"Kevin","last":"Abellana"},
    {"status":"inactive","code":"BSCS","entry":2025,"terms":3,"first":"Shiela","last":"Montecillo","fail":true},
    {"status":"inactive","code":"ACT","entry":2025,"terms":3,"first":"Arvin","last":"Cabahug"}
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
  if exists (select 1 from public.students where (first_name, last_name) in
             (('Paolo', 'Villarin'), ('Rhea', 'Dumalagan'), ('Kevin', 'Abellana'), ('Shiela', 'Montecillo'), ('Arvin', 'Cabahug'))) then
    raise notice 'inactive examples already exist; nothing to do';
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
        and (school_year, semester) <= ('2026-2027', 1)
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
        values (sid, off_id, case when fg = 5.00 then 5.00 else passing[1 + floor(random() * array_length(passing, 1))::int] end, fg, 'enrolled');
      end loop;
    end loop;
    if taken <> (s->>'terms')::int then
      raise exception '% % needs % semesters but only % were found', s->>'first', s->>'last', s->>'terms', taken;
    end if;

    update public.students set status = (s->>'status')::public.student_status, year_level = greatest(level, 1) where id = sid;
  end loop;
end $$;
