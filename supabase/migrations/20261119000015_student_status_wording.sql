-- The student status "Left the college" is now called Dropped (with Graduated, Regular and Irregular).
-- Only the wording of the message changes: a student with grades or class history still can't be deleted.
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
    raise exception 'This student has grades or class history on record, so the record is kept. Mark them as Dropped or Graduated instead.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;
