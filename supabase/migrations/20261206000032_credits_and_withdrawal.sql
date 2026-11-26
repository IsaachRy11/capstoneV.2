-- CCS Subject Monitoring System · credited subjects and withdrawal (user decisions, Nov 26 2026)
--
-- 1. Credited subjects: a shiftee or transferee who already passed a subject elsewhere gets it as "Credited". It has no
--    class here, so it lives in its own table instead of among the enrollments. A credit counts like a pass:
--    prerequisites, Regular/Irregular, subjects to resolve, year level, summer lists, tracker and graduation.
--    Only the secretary adds one. Removing a mistake keeps the row, with who removed it and when (the log).
-- 2. Withdrawn (the student status stored as 'dropped'; only the word changed): withdrawing leaves the current term.
--    This term's subjects without a result become Dropped, which frees their seats. Earlier terms don't change.

-- ─── 1. The table ───────────────────────────────────────────────────────────
create table public.student_credits (
  id                    bigint generated always as identity primary key,
  student_id            text   not null references public.students (id) on delete restrict,
  curriculum_subject_id bigint not null references public.curriculum_subjects (id) on delete restrict,
  created_at            timestamptz not null default now(),
  created_by            uuid references auth.users (id) on delete set null,
  removed_at            timestamptz,
  removed_by            uuid references auth.users (id) on delete set null
);
create unique index student_credits_one_active on public.student_credits (student_id, curriculum_subject_id) where removed_at is null;
create index student_credits_student_idx on public.student_credits (student_id);
create index student_credits_subject_idx on public.student_credits (curriculum_subject_id);
create index student_credits_created_by_idx on public.student_credits (created_by);
create index student_credits_removed_by_idx on public.student_credits (removed_by);

alter table public.student_credits enable row level security;
create policy student_credits_read on public.student_credits for select to authenticated
  using ((select private.is_secretary()) or student_id = (select private.current_student_id()));
create policy student_credits_add on public.student_credits for insert to authenticated
  with check ((select private.is_secretary()));
create policy student_credits_remove on public.student_credits for update to authenticated
  using ((select private.is_secretary())) with check ((select private.is_secretary()));
-- No delete policy: a mistake is marked removed, never erased.
revoke all on public.student_credits from anon;
grant select, insert, update on public.student_credits to authenticated;

-- What may be credited, and what may change afterwards.
create function private.check_credit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  v_code text;
begin
  if tg_op = 'UPDATE' then
    if old.removed_at is not null or new.removed_at is null
       or new.student_id <> old.student_id or new.curriculum_subject_id <> old.curriculum_subject_id
       or new.created_at <> old.created_at then
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
revoke all on function private.check_credit() from public, anon;
create trigger student_credits_check before insert or update on public.student_credits
  for each row execute function private.check_credit();

-- A credited subject can't also be added as a class.
create function private.block_credited_enrollment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_code text;
begin
  select cs.code into v_code
  from public.class_offerings o
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  join public.student_credits c on c.curriculum_subject_id = cs.id and c.student_id = new.student_id and c.removed_at is null
  where o.id = new.offering_id;
  if found then
    raise exception '% is already credited to this student.', v_code using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.block_credited_enrollment() from public, anon;
create trigger enrollments_not_credited before insert or update of offering_id, student_id on public.enrollments
  for each row execute function private.block_credited_enrollment();

-- ─── A credit counts as passed everywhere ───────────────────────────────────
create or replace function private.has_passed(p_student text, p_subject bigint) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    where e.student_id = p_student and o.curriculum_subject_id = p_subject and e.status = 'passed')
  or exists (
    select 1 from public.student_credits c
    where c.student_id = p_student and c.curriculum_subject_id = p_subject and c.removed_at is null)
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
    where c.student_id = d.student_id and c.removed_at is null and cs.code_key = d.code_key
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
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = d.student_id
      and p.code_key = pre.code_key
      and p.status = 'passed'
  )
  and not exists (
    select 1 from public.student_credits c
    join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
    where c.student_id = d.student_id and c.removed_at is null and cs.code_key = pre.code_key
  );

-- Year level: the highest year among this term's subjects, never below the highest year passed or credited.
-- With nothing this term, a passed or credited subject can only move the year up.
create function private.refresh_year_level(p_student text) returns void
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
  where e.student_id = p_student and e.status <> 'dropped';

  select max(x.year_level) into v_done from (
    select cs.year_level
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where e.student_id = p_student and e.status = 'passed'
    union all
    select cs.year_level
    from public.student_credits c join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
    where c.student_id = p_student and c.removed_at is null
  ) x;

  update public.students s
  set year_level = case when v_now is null then greatest(s.year_level, v_done) else greatest(v_now, coalesce(v_done, 0)) end
  where s.id = p_student and s.status = 'active' and coalesce(v_now, v_done) is not null
    and s.year_level <> case when v_now is null then greatest(s.year_level, v_done) else greatest(v_now, coalesce(v_done, 0)) end;
end $$;
revoke all on function private.refresh_year_level(text) from public, anon;

create or replace function private.sync_year_level() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.refresh_year_level(coalesce(new.student_id, old.student_id));
  return null;
end $$;

create trigger student_credits_sync_year_level after insert or update on public.student_credits
  for each row execute function private.sync_year_level();

-- A student with credits keeps their record, like one with grades.
create or replace function private.protect_student_with_grades() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.enrollments e
    where e.student_id = old.id
      and (e.midterm_grade is not null or e.final_grade is not null
           or e.status in ('passed', 'failed', 'incomplete', 'dropped')
           or exists (select 1 from public.grade_changes g where g.enrollment_id = e.id))
  ) or exists (select 1 from public.grade_changes g where g.student_id = old.id)
    or exists (select 1 from public.student_credits c where c.student_id = old.id) then
    raise exception 'This student has grades or class history on record, so the record is kept. Mark them as Withdrawn, Graduated or Shifted out instead.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;

-- ─── 2. Withdrawal leaves the current term ──────────────────────────────────
create function private.leave_current_term() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Only subjects still without a result. Passed, failed and NC are results already given and stay as they are.
  update public.enrollments e set status = 'dropped'
  from public.class_offerings o, public.sections sec, public.school_terms t
  where e.student_id = new.id and e.status = 'enrolled' and e.final_grade is null
    and o.id = e.offering_id and sec.id = o.section_id and t.id = sec.school_term_id and t.is_current;
  return null;
end $$;
revoke all on function private.leave_current_term() from public, anon;
create trigger students_withdraw after update of status on public.students
  for each row when (new.status = 'dropped' and old.status is distinct from 'dropped')
  execute function private.leave_current_term();

-- The same rules as 0016; only the word for the 'dropped' student status changed.
create or replace function private.check_enrollment_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cap int;
  v_term bigint;
  v_taken int;
  v_clash record;
  v_student_status text;
  v_label text;
begin
  -- Updates only need checking when the class changes or a dropped student is reinstated.
  -- Everything else (grade encoding, INC, passing) must keep working even in a full class.
  if tg_op = 'UPDATE'
     and new.offering_id = old.offering_id
     and not (old.status = 'dropped' and new.status <> 'dropped') then
    return new;
  end if;

  select s.status::text into v_student_status from public.students s where s.id = new.student_id;
  if v_student_status is distinct from 'active' then
    v_label := case coalesce(v_student_status, 'unknown')
                 when 'dropped' then 'withdrawn'
                 when 'shifted_out' then 'shifted out'
                 else v_student_status end;
    raise exception 'This student is marked as %, so they can''t be enrolled in classes.', v_label
      using errcode = 'P0001';
  end if;

  -- Lock the class row so two simultaneous enrollments can't both take the last seat.
  select coalesce(o.capacity, s.capacity), s.school_term_id into v_cap, v_term
  from public.class_offerings o
  join public.sections s on s.id = o.section_id
  where o.id = new.offering_id
  for update of o;

  select count(*) into v_taken
  from public.enrollments
  where offering_id = new.offering_id and status <> 'dropped' and id is distinct from new.id;

  if v_taken >= v_cap then
    raise exception 'This class is full (% of % seats taken).', v_taken, v_cap using errcode = 'P0001';
  end if;

  select cs.code, m2.weekday, m2.starts_at, m2.ends_at into v_clash
  from public.class_meetings m1
  join public.class_meetings m2
    on m2.weekday = m1.weekday and m2.starts_at < m1.ends_at and m1.starts_at < m2.ends_at
   and m2.offering_id <> new.offering_id
  join public.enrollments e
    on e.offering_id = m2.offering_id and e.student_id = new.student_id
   and e.status <> 'dropped' and e.id is distinct from new.id
  join public.class_offerings o2 on o2.id = m2.offering_id
  join public.sections s2 on s2.id = o2.section_id and s2.school_term_id = v_term
  join public.curriculum_subjects cs on cs.id = o2.curriculum_subject_id
  where m1.offering_id = new.offering_id
  limit 1;

  if found then
    raise exception 'Schedule clash with % on % (% – %).',
      v_clash.code,
      (array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[v_clash.weekday],
      to_char(v_clash.starts_at, 'FMHH12:MI AM'), to_char(v_clash.ends_at, 'FMHH12:MI AM')
      using errcode = 'P0001';
  end if;
  return new;
end $$;
