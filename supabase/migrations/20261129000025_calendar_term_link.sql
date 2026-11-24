-- Each official calendar date belongs to a school term (user decision, Nov 24 2026: the calendar table should be linked
-- in the ERD like every other table).
--
-- The link is worked out from the date, never typed by hand:
--   1. the term of the same school year whose first-to-last day contains the date;
--   2. otherwise the latest term of that school year that had already started (a holiday in the semestral break
--      belongs to the semester that just ended);
--   3. otherwise the first term of that school year (registration before classes start).
-- A school year with no terms yet leaves the link empty until its first term exists.
-- The link follows changes on both sides: a new or moved calendar date, and a term whose dates are set or changed
-- (begin_term sets a new term's dates).

alter table public.school_calendar_events
  add column school_term_id bigint references public.school_terms (id) on delete set null;
create index school_calendar_events_term_idx on public.school_calendar_events (school_term_id);
comment on column public.school_calendar_events.school_term_id is
  'The term this date belongs to, worked out from the date by private.calendar_term_for (not typed by hand).';

create function private.calendar_term_for(p_school_year text, p_day date) returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select t.id from public.school_terms t
     where t.school_year = p_school_year and p_day between t.starts_on and t.ends_on
     order by t.semester limit 1),
    (select t.id from public.school_terms t
     where t.school_year = p_school_year and t.starts_on <= p_day
     order by t.starts_on desc limit 1),
    (select t.id from public.school_terms t
     where t.school_year = p_school_year
     order by t.starts_on nulls last, t.semester limit 1));
$$;

create function private.calendar_event_link() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.school_term_id := private.calendar_term_for(new.school_year, new.starts_on);
  return new;
end $$;

create trigger school_calendar_events_link
  before insert or update of school_year, starts_on, school_term_id on public.school_calendar_events
  for each row execute function private.calendar_event_link();

create function private.calendar_relink_year() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.school_calendar_events e
  set school_term_id = private.calendar_term_for(e.school_year, e.starts_on)
  where e.school_year = new.school_year;
  return null;
end $$;

create trigger school_terms_relink_calendar
  after insert or update of starts_on, ends_on, school_year on public.school_terms
  for each row execute function private.calendar_relink_year();

revoke all on function private.calendar_term_for(text, date), private.calendar_event_link(), private.calendar_relink_year() from public, anon, authenticated;

-- Link the dates already on the calendar.
update public.school_calendar_events e
set school_term_id = private.calendar_term_for(e.school_year, e.starts_on);
