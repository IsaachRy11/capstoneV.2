-- Demo samples for "Subjects from earlier studies" (students and grades are made up). Safe to re-run: a student who
-- already has entries is skipped.
-- Six shiftees and transferees from the 2025 intake were first seeded as if they had taken 1st Year, 1st Semester
-- here. This moves that semester into their earlier studies, with the same grades: passed subjects are Credited, a
-- 5.00 is Not credited (a subject to resolve). Their classes here then start at the 2nd semester of SY 2025-2026, so
-- the year in their student ID still fits.
do $$
declare
  sids text[] := array['2025-0002', '2025-0011', '2025-0051', '2025-0052', '2025-0061', '2025-0062'];
  sid text;
  term_id bigint;
  moved jsonb;
  codes text[];
begin
  perform set_config('request.jwt.claim.sub', (select auth_user_id::text from public.secretaries order by id limit 1), true);
  perform set_config('request.jwt.claims', json_build_object('sub', (select auth_user_id from public.secretaries order by id limit 1), 'role', 'authenticated')::text, true);
  select id into term_id from public.school_terms where school_year = '2025-2026' and semester = 1;

  foreach sid in array sids loop
    continue when not exists (select 1 from public.students where id = sid and status = 'active' and admission_type in ('transferee', 'shiftee'));
    continue when exists (select 1 from public.student_credits where student_id = sid);

    select jsonb_agg(jsonb_build_object('enrollment', e.id, 'subject', cs.id, 'code', cs.code, 'mid', e.midterm_grade, 'final', e.final_grade)
                     order by cs.sort_order)
      into moved
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.sections s on s.id = o.section_id and s.school_term_id = term_id
    join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where e.student_id = sid;
    -- Only when every class of that semester has a final grade (nothing is lost on the way).
    continue when moved is null or exists (select 1 from jsonb_array_elements(moved) m where m->>'final' is null);
    select array_agg(m->>'code') into codes from jsonb_array_elements(moved) m;

    delete from public.enrollments where id in (select (m->>'enrollment')::bigint from jsonb_array_elements(moved) m);
    delete from public.registrations where student_id = sid and school_term_id = term_id;
    -- These classes never happened here, so their made-up grade history goes with them.
    delete from public.grade_changes where student_id = sid and subject_code = any(codes);

    insert into public.student_credits (student_id, curriculum_subject_id, midterm_grade, final_grade)
    select sid, (m->>'subject')::bigint, (m->>'mid')::numeric, (m->>'final')::numeric from jsonb_array_elements(moved) m;
  end loop;
end $$;
