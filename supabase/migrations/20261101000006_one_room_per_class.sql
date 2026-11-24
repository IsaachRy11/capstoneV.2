-- Demo data fix: each class (offering) in the current term meets in ONE room on all its days,
-- like a real timetable. Rooms were previously picked per meeting, so a subject could hop
-- between labs. Only rooms change; students, grades and times are untouched.
-- PATHFIT stays in the gym. A room is only used if it's free at every meeting of the class;
-- otherwise the class is left as "Room TBA" rather than double-booked.

do $$
declare
  o record;
  chosen bigint;
  gym bigint := (select id from public.rooms where name = 'Gymnasium');
begin
  perform setseed(0.5);

  -- Start clean for the current term's meetings.
  update public.class_meetings m set room_id = null
  from public.class_offerings co
  join public.sections s on s.id = co.section_id
  join public.school_terms t on t.id = s.school_term_id and t.is_current
  where m.offering_id = co.id;

  for o in
    select co.id, cs.kind
    from public.class_offerings co
    join public.curriculum_subjects cs on cs.id = co.curriculum_subject_id
    join public.sections s on s.id = co.section_id
    join public.school_terms t on t.id = s.school_term_id and t.is_current
    where exists (select 1 from public.class_meetings m where m.offering_id = co.id)
    order by co.id
  loop
    if o.kind = 'pathfit' then
      chosen := gym;
    else
      select rm.id into chosen
      from public.rooms rm
      where rm.kind = case when o.kind in ('major', 'elective') then 'laboratory' else 'lecture' end
        and rm.id is distinct from gym
        and not exists (
          select 1
          from public.class_meetings mine
          join public.class_meetings x
            on x.room_id = rm.id and x.weekday = mine.weekday
           and x.starts_at < mine.ends_at and mine.starts_at < x.ends_at
          where mine.offering_id = o.id)
      order by random()
      limit 1;
    end if;

    update public.class_meetings set room_id = chosen where offering_id = o.id;
  end loop;
end $$;
