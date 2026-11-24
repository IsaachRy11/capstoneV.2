-- CCS Subject Monitoring System · state machine rules
-- Closes gaps found by mapping the implicit state machines (enrollment status, seats, student status):
--   1. Bringing a dropped student back into a class now re-checks seats and schedule clashes.
--   2. A class that has grades or a grade history can't be deleted (it erased the audit log).
--      Mark it Dropped instead; the history stays.
--   3. A class marked INC or Dropped can't carry a final grade.
--   4. Only students with status "active" can be enrolled (graduated / dropped / inactive can't).
--   5. A section's capacity can't be lowered below the students already enrolled.
-- Existing rows are not touched; the rules apply to new writes only.

-- ─── 1 + 4. Enrollment rules also run when a dropped student comes back; student must be active ──
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
                 when 'dropped' then 'having left the college'
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

drop trigger if exists enrollments_check_rules on public.enrollments;
create trigger enrollments_check_rules
  before insert or update of offering_id, status on public.enrollments
  for each row execute function private.check_enrollment_rules();

-- ─── 3. INC and Dropped classes carry no final grade ─────────────────────
create or replace function public.sync_enrollment_status() returns trigger
language plpgsql
as $$
begin
  if new.status in ('incomplete', 'dropped') then
    if new.final_grade is not null then
      raise exception 'A class marked % can''t have a final grade. Clear the status first.',
        case new.status when 'incomplete' then 'INC' else 'Dropped' end
        using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.final_grade is null then
    new.status := 'enrolled';
  elsif new.final_grade <= 3.00 then
    new.status := 'passed';
  else
    new.status := 'failed';
  end if;
  return new;
end $$;

-- ─── 2. Classes with grades or history can't be deleted ──────────────────
-- grade_changes cascades from enrollments, so deleting a graded class used to erase its audit log.
create function private.protect_graded_enrollment() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.midterm_grade is not null
     or old.final_grade is not null
     or old.status in ('passed', 'failed', 'incomplete')
     or exists (select 1 from public.grade_changes g where g.enrollment_id = old.id) then
    raise exception 'This student already has a grade or status in this class. Mark the class as Dropped on their record instead, so the history is kept.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger enrollments_protect_graded
  before delete on public.enrollments
  for each row execute function private.protect_graded_enrollment();

-- ─── 5. Capacity can't drop below the students already enrolled ──────────
-- Only classes that use the section's capacity count (a class with its own capacity ignores it).
create function private.check_section_capacity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_most int;
begin
  select coalesce(max(c.n), 0) into v_most
  from (
    select count(*) as n
    from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    where o.section_id = new.id and o.capacity is null and e.status <> 'dropped'
    group by e.offering_id
  ) c;

  if new.capacity < v_most then
    raise exception 'Capacity can''t be lower than the % students already enrolled in this section.', v_most
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger sections_check_capacity
  before update of capacity on public.sections
  for each row execute function private.check_section_capacity();
