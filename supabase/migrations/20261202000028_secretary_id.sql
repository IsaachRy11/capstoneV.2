-- The secretary's ID is called "secretary ID" (user decision, Nov 26 2026): the secretary is the only staff role.
-- Only the column name changes; the value (CCS-001) and the sign-in account stay as they are. The hidden sign-in
-- address in auth.users keeps its staff.ccs-monitor.test domain (nobody types or sees it).
alter table public.secretaries rename column staff_id to secretary_id;
alter table public.secretaries rename constraint secretaries_staff_id_key to secretaries_secretary_id_key;
comment on column public.secretaries.secretary_id is 'Secretary ID used to sign in, e.g. CCS-001.';

create or replace function public.link_auth_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := lower(split_part(new.email, '@', 1));
  v_domain text := lower(split_part(new.email, '@', 2));
begin
  if v_domain = 'staff.ccs-monitor.test' then
    update public.secretaries set auth_user_id = new.id where lower(secretary_id) = v_name and auth_user_id is null;
  elsif v_domain = 'students.ccs-monitor.test' then
    update public.students set auth_user_id = new.id where lower(id) = v_name and auth_user_id is null;
  end if;
  return new;
end $$;
