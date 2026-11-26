-- Demo records for shiftees and transferees (students and grades are made up). Safe to re-run: a student who already
-- has anything listed under "Subjects from earlier studies" is skipped.
-- The seed first showed every shiftee and transferee as if they had started here from their first semester, with
-- nothing from before. For each of them this moves the FIRST semester on record into their earlier studies, so their
-- classes here start at the next semester (the year in their student ID still fits):
--   passed                    -> Credited, same midterm and final grade
--   failed, NC or Dropped     -> Not credited (5.00), still a subject to resolve
--   Withdrawn                 -> left out (never taken)
--   taken again here later    -> left out; the later class here is the record
do $$
declare
  sec_uid uuid;
  s record;
  first_term record;
  moved jsonb;
  codes text[];
begin
  select auth_user_id into sec_uid from public.secretaries order by id limit 1;
  perform set_config('request.jwt.claim.sub', coalesce(sec_uid::text, ''), true);
  perform set_config('request.jwt.claims', json_build_object('sub', sec_uid, 'role', 'authenticated')::text, true);

  for s in
    select st.id from public.students st
    where st.status = 'active' and st.admission_type in ('transferee', 'shiftee')
      and not exists (select 1 from public.student_credits c where c.student_id = st.id and c.removed_at is null)
    order by st.id
  loop
    select t.id, t.is_current into first_term
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.sections sec on sec.id = o.section_id
    join public.school_terms t on t.id = sec.school_term_id
    where e.student_id = s.id
    order by t.school_year, t.semester
    limit 1;
    -- Nothing in the past to move (no classes yet, or only this semester's).
    continue when not found or first_term.is_current;

    select jsonb_agg(jsonb_build_object(
             'enrollment', e.id, 'subject', cs.id, 'code', cs.code, 'status', e.status,
             'mid', e.midterm_grade, 'final', coalesce(e.final_grade, 5.00),
             'later', exists (select 1 from public.enrollments x join public.class_offerings ox on ox.id = x.offering_id
                              where x.student_id = s.id and ox.curriculum_subject_id = cs.id and x.id <> e.id and x.status <> 'withdrawn'))
           order by cs.sort_order)
      into moved
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.sections sec on sec.id = o.section_id and sec.school_term_id = first_term.id
    join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where e.student_id = s.id;

    select array_agg(m->>'code') into codes from jsonb_array_elements(moved) m where not (m->>'later')::boolean;

    delete from public.enrollments where id in (select (m->>'enrollment')::bigint from jsonb_array_elements(moved) m);
    delete from public.registrations where student_id = s.id and school_term_id = first_term.id;
    -- These classes never happened here, so their made-up grade history goes with them.
    delete from public.grade_changes where student_id = s.id and subject_code = any(codes);

    insert into public.student_credits (student_id, curriculum_subject_id, midterm_grade, final_grade)
    select s.id, (m->>'subject')::bigint, (m->>'mid')::numeric, (m->>'final')::numeric
    from jsonb_array_elements(moved) m
    where m->>'status' <> 'withdrawn' and not (m->>'later')::boolean;
  end loop;
end $$;
