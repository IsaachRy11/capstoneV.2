-- CCS Subject Monitoring System · grades on subjects from earlier studies (user decision, Nov 26 2026)
-- The secretary enters the midterm and final grade of a subject a shiftee or transferee took before.
--   * Final 1.00 to 3.00: the subject is CREDITED and counts like a pass.
--   * Final 5.00 (failed): the entry is kept so the reason can be seen, but it is NOT credited. It counts for
--     nothing, and the student takes the subject here.

alter table public.student_credits
  add column midterm_grade numeric(3, 2),
  add column final_grade   numeric(3, 2),
  add constraint student_credits_midterm_scale check (midterm_grade is null or midterm_grade in (1.00,1.25,1.50,1.75,2.00,2.25,2.50,2.75,3.00,5.00)),
  add constraint student_credits_final_scale   check (final_grade   is null or final_grade   in (1.00,1.25,1.50,1.75,2.00,2.25,2.50,2.75,3.00,5.00));

-- One place that says what counts as a credit. Entries made before this change have no grade and stay credited.
alter table public.student_credits
  add column is_credited boolean generated always as (final_grade is null or final_grade <= 3.00) stored;

-- ─── What may be saved ──────────────────────────────────────────────────────
create or replace function private.check_credit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  v_code text;
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

-- ─── Only a credited entry counts ───────────────────────────────────────────
create or replace function private.block_credited_enrollment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_code text;
begin
  select cs.code into v_code
  from public.class_offerings o
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  join public.student_credits c on c.curriculum_subject_id = cs.id and c.student_id = new.student_id
    and c.removed_at is null and c.is_credited
  where o.id = new.offering_id;
  if found then
    raise exception '% is already credited to this student.', v_code using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function private.has_passed(p_student text, p_subject bigint) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    where e.student_id = p_student and o.curriculum_subject_id = p_subject and e.status = 'passed')
  or exists (
    select 1 from public.student_credits c
    where c.student_id = p_student and c.curriculum_subject_id = p_subject and c.removed_at is null and c.is_credited)
$$;

create or replace view public.v_student_deficiencies with (security_invoker = true) as
select d.*
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
  );

create or replace view public.v_prerequisite_violations with (security_invoker = true) as
select
  d.enrollment_id,
  d.student_id,
  d.code,
  d.title,
  pre.code  as missing_code,
  pre.title as missing_title
from public.v_enrollment_details d
join public.subject_prerequisites sp on sp.subject_id = d.subject_id
join public.curriculum_subjects pre  on pre.id = sp.prerequisite_id
where d.is_current
  and d.status <> 'withdrawn'
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = d.student_id
      and p.code_key = pre.code_key
      and p.status = 'passed'
  )
  and not exists (
    select 1 from public.student_credits c
    join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
    where c.student_id = d.student_id and c.removed_at is null and c.is_credited and cs.code_key = pre.code_key
  );

create or replace function private.refresh_year_level(p_student text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_now smallint;
  v_done smallint;
begin
  select max(cs.year_level) into v_now
  from public.enrollments e
  join public.class_offerings o on o.id = e.offering_id
  join public.sections sec on sec.id = o.section_id
  join public.school_terms t on t.id = sec.school_term_id and t.is_current
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where e.student_id = p_student and e.status not in ('dropped', 'withdrawn');

  select max(x.year_level) into v_done from (
    select cs.year_level
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where e.student_id = p_student and e.status = 'passed'
    union all
    select cs.year_level
    from public.student_credits c join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
    where c.student_id = p_student and c.removed_at is null and c.is_credited
  ) x;

  update public.students s
  set year_level = case when v_now is null then greatest(s.year_level, v_done) else greatest(v_now, coalesce(v_done, 0)) end
  where s.id = p_student and s.status = 'active' and coalesce(v_now, v_done) is not null
    and s.year_level <> case when v_now is null then greatest(s.year_level, v_done) else greatest(v_now, coalesce(v_done, 0)) end;
end $$;
