-- Demo class times for the CURRENT term, for presentations and tests. Not part of the seed and not a migration.
-- Gives every class that has no class time yet a weekly schedule: odd-numbered subjects meet Mon/Wed/Fri (1 h),
-- even-numbered subjects Tue/Thu (1.5 h), shifted by 0-2 slots per section so sections don't all start at 7:30.
-- Rooms: PATHFIT in the gymnasium, major and elective subjects in a laboratory, the rest in a lecture room, always
-- one that is free at those times (a class stays TBA if none is). Internship has no class time.
-- Safe to run again: it only touches classes that still have no class time.

do $$
declare
  room_gym bigint;
  r record;
  slot int;
  sec_offset int;
  chosen_room bigint;
begin
  select id into room_gym from public.rooms where name = 'Gymnasium';

  for r in
    select o.id as off_id, o.section_id, cs.sort_order, cs.kind
    from public.class_offerings o
    join public.sections sec on sec.id = o.section_id
    join public.school_terms t on t.id = sec.school_term_id and t.is_current
    join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id
    where cs.kind <> 'internship'
      and not exists (select 1 from public.class_meetings m where m.offering_id = o.id)
    order by o.section_id, cs.sort_order
  loop
    sec_offset := (select count(*) from public.sections s2
                   where s2.school_term_id = (select school_term_id from public.sections where id = r.section_id)
                     and s2.id < r.section_id)::int % 3;
    begin
      if r.sort_order % 2 = 1 then
        slot := (r.sort_order + 1) / 2 + sec_offset;
        insert into public.class_meetings (offering_id, weekday, starts_at, ends_at)
        select r.off_id, d,
               time '07:30' + (slot - 1) * interval '1 hour' + case when slot > 4 then interval '1 hour 30 minutes' else interval '0' end,
               time '08:30' + (slot - 1) * interval '1 hour' + case when slot > 4 then interval '1 hour 30 minutes' else interval '0' end
        from unnest(array[1, 3, 5]) as d;
      else
        slot := r.sort_order / 2 + sec_offset;
        insert into public.class_meetings (offering_id, weekday, starts_at, ends_at)
        select r.off_id, d,
               time '07:30' + (slot - 1) * interval '1 hour 30 minutes' + case when slot > 3 then interval '1 hour' else interval '0' end,
               time '09:00' + (slot - 1) * interval '1 hour 30 minutes' + case when slot > 3 then interval '1 hour' else interval '0' end
        from unnest(array[2, 4]) as d;
      end if;

      if r.kind = 'pathfit' then
        chosen_room := room_gym;
      else
        select rm.id into chosen_room from public.rooms rm
        where rm.kind = case when r.kind in ('major', 'elective') then 'laboratory' else 'lecture' end
          and rm.id <> room_gym
          and not exists (
            select 1 from public.class_meetings mine
            join public.class_meetings x
              on x.room_id = rm.id and x.weekday = mine.weekday
             and x.starts_at < mine.ends_at and mine.starts_at < x.ends_at
            where mine.offering_id = r.off_id)
        order by rm.name limit 1;
      end if;
      update public.class_meetings set room_id = chosen_room where offering_id = r.off_id;
    exception when others then
      -- a clash or an invalid time: leave this class without a time rather than stop the whole run
      delete from public.class_meetings where offering_id = r.off_id;
    end;
  end loop;
end $$;
