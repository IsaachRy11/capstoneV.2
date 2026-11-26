-- CCS Subject Monitoring System · Undo a term start completely (bug found Nov 26 2026)
-- Undo removed the added students, registrations and calendar dates but left the new term's sections and subjects
-- behind (its message said they were removed). Starting that term again then reused the old ones: subjects added
-- before came back and old class times were not copied again. Undo now removes the sections too (their subjects and
-- class times go with them).

create or replace function public.undo_term_start() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_start public.term_starts%rowtype;
  v_restored int;
begin
  if not (select private.is_secretary()) then
    raise exception 'Only the secretary can undo a term start.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time (see migration 0017)
  select * into v_start from public.term_starts where undone_at is null order by id desc limit 1;
  if not found then
    raise exception 'There is no term start to undo.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.school_terms where id = v_start.to_term_id and is_current) then
    raise exception 'That term is no longer the current one, so it can''t be undone.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.enrollments e
    join public.class_offerings o on o.id = e.offering_id
    join public.sections sec on sec.id = o.section_id
    where sec.school_term_id = v_start.to_term_id
      and (e.midterm_grade is not null or e.final_grade is not null or e.status <> 'enrolled'
           or exists (select 1 from public.grade_changes g where g.enrollment_id = e.id))) then
    raise exception 'Grades or statuses were already entered in the new term, so it can''t be undone.' using errcode = 'P0001';
  end if;

  delete from public.enrollments e using public.class_offerings o, public.sections sec
  where o.id = e.offering_id and sec.id = o.section_id and sec.school_term_id = v_start.to_term_id;
  delete from public.registrations where school_term_id = v_start.to_term_id;

  update public.students st
  set year_level = (b ->> 'year_level')::smallint, status = (b ->> 'status')::public.student_status
  from jsonb_array_elements(v_start.students_before) b
  where st.id = b ->> 'id';
  get diagnostics v_restored = row_count;

  update public.school_terms set is_current = false where is_current;
  if v_start.from_term_id is not null then
    update public.school_terms set is_current = true where id = v_start.from_term_id;
  end if;
  delete from public.sections where school_term_id = v_start.to_term_id;
  delete from public.school_calendar_events where id = any(v_start.added_events);
  update public.term_starts set undone_at = now() where id = v_start.id;
  return jsonb_build_object('restored_students', v_restored, 'term_id', v_start.from_term_id);
end $$;

-- Clear what earlier undos left behind: sections of an undone term that is not current and has no students.
delete from public.sections s
using public.school_terms t
where t.id = s.school_term_id and not t.is_current
  and exists (select 1 from public.term_starts ts where ts.to_term_id = t.id and ts.undone_at is not null)
  and not exists (select 1 from public.registrations r where r.school_term_id = t.id)
  and not exists (select 1 from public.enrollments e join public.class_offerings o on o.id = e.offering_id
                  join public.sections x on x.id = o.section_id where x.school_term_id = t.id);
