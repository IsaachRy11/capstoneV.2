-- CCS Monitor · core schema
-- Programs → curricula → curriculum subjects (official SJC data, see 20261031000003)
-- School terms → sections → class offerings → class meetings (schedules)
-- Students → term registrations (block section) → enrollments (grades)

-- ─── Types ────────────────────────────────────────────────────────────────
create type public.subject_kind as enum ('major', 'elective', 'general_education', 'pathfit', 'nstp', 'internship');
create type public.admission_type as enum ('new', 'transferee', 'shiftee', 'returnee');
create type public.student_status as enum ('active', 'inactive', 'graduated', 'dropped');
create type public.enrollment_status as enum ('enrolled', 'passed', 'failed', 'incomplete', 'dropped');

-- Normalized key for codes and section names: "IT 101" → "it101" (matches CLAUDE.md rule)
create function public.norm_key(t text) returns text
language sql immutable parallel safe
as $$ select lower(regexp_replace(coalesce(t, ''), '\s+', '', 'g')) $$;

create function public.touch_updated_at() returns trigger
language plpgsql
as $$ begin new.updated_at := now(); return new; end $$;

-- ─── Academic structure (reference data) ──────────────────────────────────
create table public.programs (
  id             bigint generated always as identity primary key,
  code           text not null unique,                 -- BSIT, BSCS, ACT
  name           text not null,
  duration_years smallint not null check (duration_years between 1 and 5),
  description    text
);

create table public.curricula (
  id                    bigint generated always as identity primary key,
  program_id            bigint not null references public.programs (id) on delete restrict,
  title                 text not null,
  effective_school_year text not null check (effective_school_year ~ '^\d{4}-\d{4}$'),
  source_url            text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);
create unique index curricula_one_active_per_program on public.curricula (program_id) where is_active;

create table public.curriculum_subjects (
  id            bigint generated always as identity primary key,
  curriculum_id bigint not null references public.curricula (id) on delete cascade,
  year_level    smallint not null check (year_level between 1 and 5),
  semester      smallint not null check (semester in (1, 2, 3)),  -- 3 = summer
  code          text not null,
  code_key      text generated always as (public.norm_key(code)) stored,
  title         text not null,
  units         numeric(3, 1) not null check (units > 0),
  kind          public.subject_kind not null,
  sort_order    smallint not null default 0,
  unique (curriculum_id, code_key)
);
create index curriculum_subjects_term_idx on public.curriculum_subjects (curriculum_id, year_level, semester, sort_order);

create table public.subject_prerequisites (
  subject_id      bigint not null references public.curriculum_subjects (id) on delete cascade,
  prerequisite_id bigint not null references public.curriculum_subjects (id) on delete cascade,
  primary key (subject_id, prerequisite_id),
  check (subject_id <> prerequisite_id)
);

create function public.check_prerequisite_same_curriculum() returns trigger
language plpgsql
as $$
begin
  if (select curriculum_id from public.curriculum_subjects where id = new.subject_id)
     is distinct from
     (select curriculum_id from public.curriculum_subjects where id = new.prerequisite_id) then
    raise exception 'A prerequisite must belong to the same curriculum as the subject';
  end if;
  return new;
end $$;
create trigger subject_prerequisites_same_curriculum
  before insert or update on public.subject_prerequisites
  for each row execute function public.check_prerequisite_same_curriculum();

-- ─── People (two roles only: secretary and student) ───────────────────────
create table public.secretaries (
  id           bigint generated always as identity primary key,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name    text not null,
  email        text not null unique,
  created_at   timestamptz not null default now()
);

create table public.students (
  id             text primary key check (id ~ '^\d{4}-\d{4}$'),   -- student number, e.g. 2025-0014
  auth_user_id   uuid unique references auth.users (id) on delete set null,
  first_name     text not null,
  middle_name    text,
  last_name      text not null,
  email          text not null unique,
  program_id     bigint not null references public.programs (id),
  curriculum_id  bigint not null references public.curricula (id),
  year_level     smallint not null check (year_level between 1 and 5),
  admission_type public.admission_type not null default 'new',
  status         public.student_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index students_program_year_idx on public.students (program_id, year_level);
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

-- ─── Terms, sections, schedules ───────────────────────────────────────────
create table public.school_terms (
  id          bigint generated always as identity primary key,
  school_year text not null check (school_year ~ '^\d{4}-\d{4}$'),
  semester    smallint not null check (semester in (1, 2, 3)),
  starts_on   date,
  ends_on     date,
  is_current  boolean not null default false,
  unique (school_year, semester),
  check (ends_on is null or starts_on is null or ends_on > starts_on)
);
create unique index school_terms_one_current on public.school_terms (is_current) where is_current;

create table public.rooms (
  id       bigint generated always as identity primary key,
  name     text not null unique,
  kind     text not null check (kind in ('lecture', 'laboratory')),
  capacity smallint check (capacity > 0)
);

create table public.sections (
  id             bigint generated always as identity primary key,
  school_term_id bigint not null references public.school_terms (id) on delete cascade,
  program_id     bigint not null references public.programs (id),
  year_level     smallint not null check (year_level between 1 and 5),
  name           text not null,                       -- e.g. "BSIT 2-S"
  name_key       text generated always as (public.norm_key(name)) stored,
  capacity       smallint not null default 40 check (capacity > 0),
  home_room_id   bigint references public.rooms (id) on delete set null,
  unique (school_term_id, name_key)
);

-- A student's block section and year level for one term
create table public.registrations (
  id             bigint generated always as identity primary key,
  student_id     text not null references public.students (id) on delete cascade,
  school_term_id bigint not null references public.school_terms (id) on delete cascade,
  section_id     bigint not null references public.sections (id) on delete restrict,
  year_level     smallint not null check (year_level between 1 and 5),
  created_at     timestamptz not null default now(),
  unique (student_id, school_term_id)
);

create function public.check_registration_term() returns trigger
language plpgsql
as $$
begin
  if (select school_term_id from public.sections where id = new.section_id) <> new.school_term_id then
    raise exception 'Section does not belong to this school term';
  end if;
  return new;
end $$;
create trigger registrations_term_matches
  before insert or update on public.registrations
  for each row execute function public.check_registration_term();

-- One subject taught to one section in one term
create table public.class_offerings (
  id                    bigint generated always as identity primary key,
  section_id            bigint not null references public.sections (id) on delete cascade,
  curriculum_subject_id bigint not null references public.curriculum_subjects (id) on delete restrict,
  capacity              smallint check (capacity > 0),   -- null = use the section's capacity
  unique (section_id, curriculum_subject_id)
);

create table public.class_meetings (
  id          bigint generated always as identity primary key,
  offering_id bigint not null references public.class_offerings (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),   -- 1 = Monday
  starts_at   time not null,
  ends_at     time not null,
  room_id     bigint references public.rooms (id) on delete set null,
  check (ends_at > starts_at)
);
create index class_meetings_offering_idx on public.class_meetings (offering_id);

-- ─── Enrollments & grades ─────────────────────────────────────────────────
create table public.enrollments (
  id            bigint generated always as identity primary key,
  student_id    text not null references public.students (id) on delete cascade,
  offering_id   bigint not null references public.class_offerings (id) on delete restrict,
  midterm_grade numeric(3, 2),
  final_grade   numeric(3, 2),
  status        public.enrollment_status not null default 'enrolled',
  remarks       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (student_id, offering_id),
  -- SJC scale: 1.00 (best) … 3.00 (passing) in 0.25 steps, 5.00 = failed
  check (midterm_grade is null or midterm_grade in (1.00,1.25,1.50,1.75,2.00,2.25,2.50,2.75,3.00,5.00)),
  check (final_grade   is null or final_grade   in (1.00,1.25,1.50,1.75,2.00,2.25,2.50,2.75,3.00,5.00))
);
create index enrollments_student_idx on public.enrollments (student_id);
create index enrollments_offering_idx on public.enrollments (offering_id);

-- Keep status in step with the final grade (INC and Dropped are set by hand and left alone)
create function public.sync_enrollment_status() returns trigger
language plpgsql
as $$
begin
  if new.status in ('incomplete', 'dropped') then
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
create trigger enrollments_sync_status
  before insert or update of final_grade, status on public.enrollments
  for each row execute function public.sync_enrollment_status();
create trigger enrollments_touch before update on public.enrollments
  for each row execute function public.touch_updated_at();

-- ─── Read models (views run with the caller's permissions, so RLS applies) ──
create view public.v_enrollment_details with (security_invoker = true) as
select
  e.id               as enrollment_id,
  e.student_id,
  t.id               as school_term_id,
  t.school_year,
  t.semester,
  t.is_current,
  sec.id             as section_id,
  sec.name           as section_name,
  cs.id              as subject_id,
  cs.code,
  cs.code_key,
  cs.title,
  cs.units,
  cs.year_level      as curriculum_year,
  cs.semester        as curriculum_semester,
  e.midterm_grade,
  e.final_grade,
  e.status,
  e.remarks
from public.enrollments e
join public.class_offerings o  on o.id = e.offering_id
join public.sections sec       on sec.id = o.section_id
join public.school_terms t     on t.id = sec.school_term_id
join public.curriculum_subjects cs on cs.id = o.curriculum_subject_id;

-- Failed / INC / dropped subjects not yet cleared by a later pass of the same subject
create view public.v_student_deficiencies with (security_invoker = true) as
select d.*
from public.v_enrollment_details d
where d.status in ('failed', 'incomplete', 'dropped')
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = d.student_id
      and p.code_key = d.code_key
      and p.status = 'passed'
  );

-- Current-term enrollments whose prerequisite has not been passed
create view public.v_prerequisite_violations with (security_invoker = true) as
select
  d.enrollment_id,
  d.student_id,
  d.code,
  d.title,
  pre.code  as missing_code,
  pre.title as missing_title
from public.v_enrollment_details d
join public.subject_prerequisites sp on sp.subject_id = d.subject_id
join public.curriculum_subjects pre  on pre.id = sp.prerequisite_id
where d.is_current
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = d.student_id
      and p.code_key = pre.code_key
      and p.status = 'passed'
  );

-- One row per student: program, current section, computed standing
create view public.v_student_overview with (security_invoker = true) as
select
  s.id,
  s.first_name,
  s.middle_name,
  s.last_name,
  s.first_name || ' ' || s.last_name as full_name,
  s.email,
  s.year_level,
  s.admission_type,
  s.status,
  p.code  as program_code,
  p.name  as program_name,
  sec.id  as section_id,
  sec.name as section_name,
  (select count(*) from public.v_student_deficiencies d where d.student_id = s.id)      as deficiency_count,
  (select count(*) from public.v_prerequisite_violations v where v.student_id = s.id)   as prerequisite_flag_count,
  case
    when exists (select 1 from public.v_student_deficiencies d where d.student_id = s.id)
      or exists (select 1 from public.v_prerequisite_violations v where v.student_id = s.id)
    then 'irregular' else 'regular'
  end as standing
from public.students s
join public.programs p on p.id = s.program_id
left join public.school_terms ct on ct.is_current
left join public.registrations r on r.student_id = s.id and r.school_term_id = ct.id
left join public.sections sec on sec.id = r.section_id;

-- Seats per section in the current term
create view public.v_section_capacity with (security_invoker = true) as
select
  sec.id,
  sec.name,
  sec.year_level,
  p.code as program_code,
  sec.capacity,
  rm.name      as home_room,
  (select count(*) from public.registrations r where r.section_id = sec.id) as enrolled
from public.sections sec
join public.programs p      on p.id = sec.program_id
join public.school_terms t  on t.id = sec.school_term_id and t.is_current
left join public.rooms rm   on rm.id = sec.home_room_id;
