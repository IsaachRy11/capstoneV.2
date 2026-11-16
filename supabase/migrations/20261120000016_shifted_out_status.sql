-- New student status "Shifted out": the student moved to another program. Their old record stays (with its
-- grades and history); the person is added again as a new student in the new program.
alter type public.student_status add value if not exists 'shifted_out';

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
                 when 'dropped' then 'dropped'
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
  ) then
    raise exception 'This student has grades or class history on record, so the record is kept. Mark them as Dropped, Graduated or Shifted out instead.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;
