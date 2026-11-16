-- CCS Monitor · official academic calendar, SY 2026-2027.
-- Source: the printed Saint Joseph College academic calendar (July 2026 to June 2027), provided by the user
-- on 2026-11-16. Dates and titles are copied from it. The printed list gives dates and titles in two
-- separate columns, so each title was matched to its date by order. The matches the sheet leaves open are:
--   August 10 = Pre-Midterm Exams · August 15 = Maasin City Charter Day and Maasin City Town Fiesta
--   (two titles, one date) · November 30 = Start of Classes (2nd Semester) and Bonifacio Day · December 9 =
--   President's Birthday. Check these against the paper copy.

-- Term dates for SY 2026-2027 now follow the calendar (start and end of classes).
update public.school_terms set starts_on = date '2026-07-06', ends_on = date '2026-11-07' where school_year = '2026-2027' and semester = 1;
update public.school_terms set starts_on = date '2026-11-30', ends_on = date '2027-04-23' where school_year = '2026-2027' and semester = 2;
update public.school_terms set starts_on = date '2027-05-03', ends_on = date '2027-06-11' where school_year = '2026-2027' and semester = 3;

create table public.school_calendar_events (
  id          bigint generated always as identity primary key,
  school_year text not null check (school_year ~ '^\d{4}-\d{4}$'),
  title       text not null,
  starts_on   date not null,
  ends_on     date not null,
  kind        text not null check (kind in ('classes', 'exam', 'holiday', 'break', 'registration', 'school')),
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (school_year, title, starts_on)
);
create index school_calendar_events_dates_idx on public.school_calendar_events (starts_on, ends_on);
comment on column public.school_calendar_events.kind is
  'classes = start/end of classes · exam = exam weeks · holiday = holidays and observances · break = semestral, Christmas, Easter breaks · registration · school = school activities (Mass, Family Day)';

alter table public.school_calendar_events enable row level security;
create policy "signed-in users read the calendar" on public.school_calendar_events
  for select to authenticated using (true);
create policy "secretary writes school_calendar_events" on public.school_calendar_events
  for all to authenticated using ((select private.is_secretary())) with check ((select private.is_secretary()));

insert into public.school_calendar_events (school_year, title, starts_on, ends_on, kind) values
  -- 2026
  ('2026-2027', 'Start of Classes (1st Semester)',          '2026-07-06', '2026-07-06', 'classes'),
  ('2026-2027', 'Mass of the Holy Spirit',                  '2026-07-17', '2026-07-17', 'school'),
  ('2026-2027', 'Family Day I (Acquaintance Party)',        '2026-07-30', '2026-08-01', 'school'),
  ('2026-2027', 'Pre-Midterm Exams',                        '2026-08-10', '2026-08-10', 'exam'),
  ('2026-2027', 'Maasin City Charter Day',                  '2026-08-15', '2026-08-15', 'holiday'),
  ('2026-2027', 'Maasin City Town Fiesta',                  '2026-08-15', '2026-08-15', 'holiday'),
  ('2026-2027', 'Ninoy Aquino Day',                         '2026-08-21', '2026-08-21', 'holiday'),
  ('2026-2027', 'National Heroes Day',                      '2026-08-31', '2026-08-31', 'holiday'),
  ('2026-2027', 'Midterm Exams',                            '2026-09-01', '2026-09-05', 'exam'),
  ('2026-2027', 'Family Day II (Intramurals)',              '2026-09-09', '2026-09-12', 'school'),
  ('2026-2027', 'Pre-Final Exams',                          '2026-10-01', '2026-10-03', 'exam'),
  ('2026-2027', 'All Saints'' Day',                         '2026-11-01', '2026-11-01', 'holiday'),
  ('2026-2027', 'All Souls'' Day',                          '2026-11-02', '2026-11-02', 'holiday'),
  ('2026-2027', 'Final Exams',                              '2026-11-03', '2026-11-07', 'exam'),
  ('2026-2027', 'End of Classes',                           '2026-11-07', '2026-11-07', 'classes'),
  ('2026-2027', 'Semestral Break',                          '2026-11-09', '2026-11-21', 'break'),
  ('2026-2027', 'Registration for 2nd Semester',            '2026-11-23', '2026-11-23', 'registration'),
  ('2026-2027', 'Start of Classes (2nd Semester)',          '2026-11-30', '2026-11-30', 'classes'),
  ('2026-2027', 'Bonifacio Day',                            '2026-11-30', '2026-11-30', 'holiday'),
  ('2026-2027', 'Feast of the Immaculate Conception',       '2026-12-08', '2026-12-08', 'holiday'),
  ('2026-2027', 'President''s Birthday',                    '2026-12-09', '2026-12-09', 'holiday'),
  ('2026-2027', 'Pre-Midterm Exams',                        '2026-12-14', '2026-12-16', 'exam'),
  ('2026-2027', 'Christmas Break',                          '2026-12-17', '2026-12-31', 'break'),
  -- 2027
  ('2026-2027', 'New Year''s Day',                          '2027-01-01', '2027-01-01', 'holiday'),
  ('2026-2027', 'Midterm Exams',                            '2027-01-25', '2027-01-30', 'exam'),
  ('2026-2027', 'Chinese New Year',                         '2027-02-06', '2027-02-06', 'holiday'),
  ('2026-2027', 'Family Day III (Founding Anniversary)',    '2027-02-15', '2027-02-19', 'school'),
  ('2026-2027', 'Pre-Final Exams',                          '2027-02-22', '2027-02-24', 'exam'),
  ('2026-2027', 'EDSA Anniversary',                         '2027-02-25', '2027-02-25', 'holiday'),
  ('2026-2027', 'Eidul Fitr',                               '2027-03-10', '2027-03-10', 'holiday'),
  ('2026-2027', 'Family Day IV (St. Joseph''s Feast Day)',  '2027-03-19', '2027-03-19', 'school'),
  ('2026-2027', 'Easter Break',                             '2027-03-22', '2027-03-27', 'break'),
  ('2026-2027', 'First Easter Mass Anniversary',            '2027-03-31', '2027-03-31', 'school'),
  ('2026-2027', 'Araw ng Kagitingan',                       '2027-04-09', '2027-04-09', 'holiday'),
  ('2026-2027', 'Final Exams',                              '2027-04-19', '2027-04-23', 'exam'),
  ('2026-2027', 'End of Classes',                           '2027-04-23', '2027-04-23', 'classes'),
  -- Summer 2027
  ('2026-2027', 'Summer: Start of Classes',                 '2027-05-03', '2027-05-03', 'classes'),
  ('2026-2027', 'Summer: Midterm Exams',                    '2027-05-20', '2027-05-22', 'exam'),
  ('2026-2027', 'Summer: Final Exams',                      '2027-06-09', '2027-06-11', 'exam'),
  ('2026-2027', 'Summer: End of Classes',                   '2027-06-11', '2027-06-11', 'classes');
