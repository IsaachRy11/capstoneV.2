-- Class time rules, tightened (Nov 26 2026):
-- 1. A section can't have two class times that overlap, INCLUDING two times of the same subject (before this, the
--    same subject could be booked twice at the same time, for example in two different rooms).
-- 2. Class times stay between 7:30 AM and 8:30 PM.
-- The room and student rules are unchanged (see 20261101000008).
create or replace function private.check_meeting_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_section bigint;
  v_section_name text;
  v_hit record;
  v_days text[] := array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
begin
  if new.ends_at <= new.starts_at then
    raise exception 'The end time must be after the start time.' using errcode = 'P0001';
  end if;
  if new.starts_at < time '07:30' or new.ends_at > time '20:30' then
    raise exception 'Class times must be between 7:30 AM and 8:30 PM.' using errcode = 'P0001';
  end if;

  select o.section_id, s.name into v_section, v_section_name
  from public.class_offerings o join public.sections s on s.id = o.section_id
  where o.id = new.offering_id;

  -- 1. Same section, overlapping time
  select cs.code, m.offering_id, m.starts_at, m.ends_at into v_hit
  from public.class_meetings m
  join public.class_offerings o on o.id = m.offering_id and o.section_id = v_section
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where m.id is distinct from new.id
    and m.weekday = new.weekday and m.starts_at < new.ends_at and new.starts_at < m.ends_at
  limit 1;
  if found and v_hit.offering_id = new.offering_id then
    raise exception 'This subject already has a class on % from % to %. A subject can''t be scheduled twice at the same time.',
      v_days[new.weekday], to_char(v_hit.starts_at, 'FMHH12:MI AM'), to_char(v_hit.ends_at, 'FMHH12:MI AM') using errcode = 'P0001';
  end if;
  if found then
    raise exception '% already has % on % (% – %).', v_section_name, v_hit.code, v_days[new.weekday],
      to_char(v_hit.starts_at, 'FMHH12:MI AM'), to_char(v_hit.ends_at, 'FMHH12:MI AM') using errcode = 'P0001';
  end if;

  -- 2. Same room, overlapping time (unless the room is shared)
  if new.room_id is not null and not (select r.is_shared from public.rooms r where r.id = new.room_id) then
    select r.name, cs.code, s.name as section_name into v_hit
    from public.class_meetings m
    join public.rooms r on r.id = m.room_id
    join public.class_offerings o on o.id = m.offering_id
    join public.sections s on s.id = o.section_id
    join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where m.id is distinct from new.id and m.room_id = new.room_id
      and s.school_term_id = (select school_term_id from public.sections where id = v_section)
      and m.weekday = new.weekday and m.starts_at < new.ends_at and new.starts_at < m.ends_at
    limit 1;
    if found then
      raise exception '% is already taken then by % (%).', v_hit.name, v_hit.code, v_hit.section_name using errcode = 'P0001';
    end if;
  end if;

  -- 3. A student in this class has another class at that time
  select e2.student_id, cs.code into v_hit
  from public.enrollments e1
  join public.enrollments e2 on e2.student_id = e1.student_id and e2.offering_id <> new.offering_id and e2.status <> 'dropped'
  join public.class_meetings m on m.offering_id = e2.offering_id
  join public.class_offerings o on o.id = e2.offering_id
  join public.sections s on s.id = o.section_id and s.school_term_id = (select school_term_id from public.sections where id = v_section)
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where e1.offering_id = new.offering_id and e1.status <> 'dropped'
    and m.id is distinct from new.id
    and m.weekday = new.weekday and m.starts_at < new.ends_at and new.starts_at < m.ends_at
  limit 1;
  if found then
    raise exception 'Student % in this class has % at that time.', v_hit.student_id, v_hit.code using errcode = 'P0001';
  end if;

  return new;
end $$;
