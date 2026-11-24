-- A student who has any grade, a Passed/Failed/INC/Dropped class or grade history can't be deleted:
-- their record is kept (set their status to "Left the college" instead).
-- A student added by mistake (only "enrolled" classes, no grades) can be deleted;
-- registrations and classes go with them (on delete cascade).
create function private.protect_student_with_grades() returns trigger
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
    raise exception 'This student has grades or class history on record, so the record is kept. Set their student status to "Left the college" instead.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger students_protect_history
  before delete on public.students
  for each row execute function private.protect_student_with_grades();
