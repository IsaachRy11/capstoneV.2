-- Schedule editing rules: the secretary can add, change and remove class times, and the database
-- refuses any change that would create an impossible timetable.
-- 1. A block section can't have two classes at the same time.
-- 2. A room can't be double-booked (rooms marked shared, like the gym, are exempt).
-- 3. A student in the class can't end up with two classes at the same time.

alter table public.rooms add column if not exists is_shared boolean not null default false;
update public.rooms set is_shared = true where name = 'Gymnasium';

create function private.check_meeting_rules() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_section bigint;
  v_section_name text;
  v_hit record;
  v_days text[] := array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
begin
  select o.section_id, s.name into v_section, v_section_name
  from public.class_offerings o join public.sections s on s.id = o.section_id
  where o.id = new.offering_id;

  -- 1. Same section, overlapping time
  select cs.code, m.starts_at, m.ends_at into v_hit
  from public.class_meetings m
  join public.class_offerings o on o.id = m.offering_id and o.section_id = v_section
  join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
  where m.id is distinct from new.id and m.offering_id <> new.offering_id
    and m.weekday = new.weekday and m.starts_at < new.ends_at and new.starts_at < m.ends_at
  limit 1;
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

create trigger class_meetings_check_rules
  before insert or update on public.class_meetings
  for each row execute function private.check_meeting_rules();
