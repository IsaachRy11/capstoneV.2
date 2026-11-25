-- The incomplete status is shown as "NC" (user decision, Nov 26 2026); only the message text changes.
create or replace function public.sync_enrollment_status() returns trigger
language plpgsql
as $$
begin
  if new.status in ('incomplete', 'dropped') then
    if new.final_grade is not null then
      raise exception 'A class marked % can''t have a final grade. Clear the status first.',
        case new.status when 'incomplete' then 'NC' else 'Dropped' end
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
