-- A subject's own capacity (class_offerings.capacity) can't be set below the students already in that class.
-- Same rule migration 0009 gave a section's capacity, now for each subject on its own.
-- (An empty capacity means "use the section's number", which is checked by the section rule.)
create function private.check_offering_capacity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_enrolled int;
begin
  if new.capacity is null then
    return new;
  end if;
  select count(*) into v_enrolled
  from public.enrollments e
  where e.offering_id = new.id and e.status <> 'dropped';
  if new.capacity < v_enrolled then
    raise exception 'Seats can''t be lower than the % students already in this class.', v_enrolled
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger class_offerings_check_capacity
  before update of capacity on public.class_offerings
  for each row execute function private.check_offering_capacity();
