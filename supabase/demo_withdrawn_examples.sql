-- Demo data only. The five "Withdrawn" example students withdrew early: in their LAST term every subject is
-- Withdrawn with no grades. Earlier terms keep their results. Run after demo_status_examples.sql; safe to run again.
do $$
declare
  sec_uid uuid;
  ids bigint[];
begin
  select auth_user_id into sec_uid from public.secretaries where auth_user_id is not null limit 1;
  perform set_config('request.jwt.claim.sub', sec_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', sec_uid, 'role', 'authenticated')::text, true);

  with mine as (
    select e.id, e.status, t.school_year || '-' || t.semester as term,
           max(t.school_year || '-' || t.semester) over (partition by e.student_id) as last_term
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.sections sc on sc.id = o.section_id
    join public.school_terms t on t.id = sc.school_term_id
    join public.students s on s.id = e.student_id
    where s.status = 'dropped' and s.id between '2025-0091' and '2025-0095'
  )
  select array_agg(id) into ids from mine where term = last_term and status <> 'withdrawn';

  if ids is null then
    raise notice 'already done; nothing to do';
    return;
  end if;
  -- Two steps: a subject that still has a final grade can't be withdrawn.
  update public.enrollments set midterm_grade = null, final_grade = null, status = 'enrolled' where id = any(ids);
  update public.enrollments set status = 'withdrawn' where id = any(ids);
  raise notice '% subjects marked Withdrawn', array_length(ids, 1);
end $$;
