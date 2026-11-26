-- CCS Subject Monitoring System · grades from earlier studies, second round (user decisions, Nov 26 2026)
--   * Not credited (5.00 from earlier studies) is a subject to resolve, like a failed subject, until it is passed here.
--   * The grades can be corrected (Encode grades). The old values stay as a removed row, which is the log.
--   * A subject the student already has a class record for here can't be added as an earlier subject.

-- ─── What may be saved ──────────────────────────────────────────────────────
create or replace function private.check_credit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  v_code text;
  v_edit boolean := coalesce(current_setting('app.editing_credit', true), '') = 'on';
begin
  if tg_op = 'UPDATE' then
    if old.removed_at is not null or new.removed_at is null
       or new.student_id <> old.student_id or new.curriculum_subject_id <> old.curriculum_subject_id
       or new.created_at <> old.created_at
       or new.midterm_grade is distinct from old.midterm_grade or new.final_grade is distinct from old.final_grade then
      raise exception 'A credited subject can only be removed.' using errcode = 'P0001';
    end if;
    new.removed_at := now();
    new.removed_by := (select auth.uid());
    return new;
  end if;

  new.created_at := now();
  new.created_by := (select auth.uid());
  new.removed_at := null;
  new.removed_by := null;

  if new.final_grade is null then
    raise exception 'Enter the final grade. It decides whether the subject is credited.' using errcode = 'P0001';
  end if;
  select st.status::text as status, st.admission_type::text as admission_type, st.curriculum_id into s
  from public.students st where st.id = new.student_id;
  if s.admission_type not in ('transferee', 'shiftee') then
    raise exception 'Credited subjects are only for shiftees and transferees.' using errcode = 'P0001';
  end if;
  if s.status <> 'active' then
    raise exception 'Subjects can only be credited while the student is Active.' using errcode = 'P0001';
  end if;
  select cs.code into v_code from public.curriculum_subjects cs
  where cs.id = new.curriculum_subject_id and cs.curriculum_id = s.curriculum_id;
  if v_code is null then
    raise exception 'Only subjects of the student''s own curriculum can be credited.' using errcode = 'P0001';
  end if;
  -- Earlier studies are subjects never taken here. A class here (even Failed, NC or Dropped) is settled here.
  if not v_edit and exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
             where e.student_id = new.student_id and o.curriculum_subject_id = new.curriculum_subject_id
               and e.status not in ('withdrawn', 'passed', 'enrolled')) then
    raise exception '% already has a class record here, so it can''t be added as an earlier subject.', v_code using errcode = 'P0001';
  end if;
  -- A correction that stays Not credited changes nothing that counts, so these two don't apply to it.
  if v_edit and new.final_grade > 3.00 then
    return new;
  end if;
  if exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
             where e.student_id = new.student_id and o.curriculum_subject_id = new.curriculum_subject_id and e.status = 'passed') then
    raise exception '% is already passed.', v_code using errcode = 'P0001';
  end if;
  if exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
             where e.student_id = new.student_id and o.curriculum_subject_id = new.curriculum_subject_id and e.status = 'enrolled') then
    raise exception '% is being taken now. Remove the student from that subject first.', v_code using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ─── Encode grades for earlier subjects (one transaction) ───────────────────
-- p_changes: [{ "id": 1, "midterm": 2.0, "final": 1.75 }]. Each entry is replaced by a new one; the old row stays,
-- marked with who replaced it and when. Row-level security still applies (secretary only).
create function public.save_credit_grades(p_changes jsonb) returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  c record;
  old_row record;
  n int := 0;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can encode grades.' using errcode = '42501';
  end if;
  perform set_config('app.editing_credit', 'on', true);
  for c in select * from jsonb_to_recordset(p_changes) as x(id bigint, midterm numeric, final numeric) loop
    update public.student_credits set removed_at = now() where id = c.id and removed_at is null
    returning student_id, curriculum_subject_id into old_row;
    if not found then
      raise exception 'One of these entries was already changed. Reload the page and try again.' using errcode = 'P0001';
    end if;
    insert into public.student_credits (student_id, curriculum_subject_id, midterm_grade, final_grade)
    values (old_row.student_id, old_row.curriculum_subject_id, c.midterm, c.final);
    n := n + 1;
  end loop;
  perform set_config('app.editing_credit', '', true);
  return n;
end $$;
revoke all on function public.save_credit_grades(jsonb) from public, anon;
grant execute on function public.save_credit_grades(jsonb) to authenticated;

-- ─── Subjects to resolve now include Not credited ───────────────────────────
-- Same columns as before, plus not_credited at the end. A Not credited row has no class here, so its class and term
-- columns are empty. It leaves the list once the subject is passed here (or the grade is corrected). If the subject
-- also has an unresolved class record here, only that record is listed.
create or replace view public.v_student_deficiencies with (security_invoker = true) as
select d.*, false as not_credited
from public.v_enrollment_details d
where d.status in ('failed', 'incomplete', 'dropped')
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = d.student_id
      and p.code_key = d.code_key
      and p.status = 'passed'
  )
  and not exists (
    select 1 from public.student_credits c
    join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
    where c.student_id = d.student_id and c.removed_at is null and c.is_credited and cs.code_key = d.code_key
  )
union all
select
  null::bigint, c.student_id, null::bigint, null::text, null::smallint, false, null::bigint, null::text,
  cs.id, cs.code, cs.code_key, cs.title, cs.units, cs.year_level, cs.semester,
  c.midterm_grade, c.final_grade, 'failed'::public.enrollment_status, null::text, true
from public.student_credits c
join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
where c.removed_at is null and not c.is_credited
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = c.student_id and p.code_key = cs.code_key
      and p.status in ('passed', 'failed', 'incomplete', 'dropped')
  );

-- Summer: how many active students still owe each subject, from the same list.
create or replace function public.summer_candidates(p_section bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_sec record;
  v_out jsonb;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can do this.' using errcode = '42501';
  end if;
  select s.id, s.program_id, t.semester into v_sec
  from public.sections s join public.school_terms t on t.id = s.school_term_id where s.id = p_section;
  if not found or v_sec.semester <> 3 then
    raise exception 'Subjects can only be added to a summer section.' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(q.x order by (q.x ->> 'owing')::int desc, (q.x ->> 'year_level')::int, q.x ->> 'code'), '[]'::jsonb) into v_out
  from (
    select jsonb_build_object(
      'subject_id', cs.id, 'code', cs.code, 'title', cs.title, 'units', cs.units, 'year_level', cs.year_level, 'semester', cs.semester,
      'owing', (select count(distinct d.student_id)
                from public.v_student_deficiencies d
                join public.students st on st.id = d.student_id
                where d.subject_id = cs.id and st.curriculum_id = c.id and st.status = 'active')) as x
    from public.curricula c
    join public.curriculum_subjects cs on cs.curriculum_id = c.id
    where c.program_id = v_sec.program_id and c.is_active
      and not exists (select 1 from public.class_offerings o where o.section_id = p_section and o.curriculum_subject_id = cs.id)
  ) q;
  return v_out;
end $$;
