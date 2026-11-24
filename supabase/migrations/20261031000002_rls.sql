-- CCS Monitor · access rules (two roles)
-- anon (not signed in): no access to anything.
-- student:   reads reference data (curriculum, terms, sections, schedules) + only their own
--            student row, registrations and enrollments. Never writes.
-- secretary: reads and writes everything.

-- ─── Who is calling? (security definer so policies can look up roles without recursion) ──
create function public.is_secretary() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.secretaries where auth_user_id = auth.uid()) $$;

create function public.current_student_id() returns text
language sql stable security definer set search_path = ''
as $$ select id from public.students where auth_user_id = auth.uid() $$;

-- Link a new Supabase Auth account to its secretary or student row by email
create function public.link_auth_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.secretaries set auth_user_id = new.id where lower(email) = lower(new.email) and auth_user_id is null;
  update public.students    set auth_user_id = new.id where lower(email) = lower(new.email) and auth_user_id is null;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_auth_user();

-- ─── Enable RLS everywhere ────────────────────────────────────────────────
alter table public.programs              enable row level security;
alter table public.curricula             enable row level security;
alter table public.curriculum_subjects   enable row level security;
alter table public.subject_prerequisites enable row level security;
alter table public.secretaries           enable row level security;
alter table public.students              enable row level security;
alter table public.school_terms          enable row level security;
alter table public.rooms                 enable row level security;
alter table public.sections              enable row level security;
alter table public.registrations         enable row level security;
alter table public.class_offerings       enable row level security;
alter table public.class_meetings        enable row level security;
alter table public.enrollments           enable row level security;

-- ─── Reference data: any signed-in user reads, secretary writes ───────────
do $$
declare t text;
begin
  foreach t in array array[
    'programs', 'curricula', 'curriculum_subjects', 'subject_prerequisites',
    'school_terms', 'rooms', 'sections', 'class_offerings', 'class_meetings'
  ] loop
    execute format('create policy "signed-in users read %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "secretary writes %1$s" on public.%1$I for all to authenticated using (public.is_secretary()) with check (public.is_secretary())', t);
  end loop;
end $$;

-- ─── Personal data: secretary sees and edits all; a student reads only their own ──
create policy "secretary manages secretaries" on public.secretaries
  for all to authenticated using (public.is_secretary()) with check (public.is_secretary());
create policy "secretary reads self" on public.secretaries
  for select to authenticated using (auth_user_id = auth.uid());

create policy "secretary manages students" on public.students
  for all to authenticated using (public.is_secretary()) with check (public.is_secretary());
create policy "student reads self" on public.students
  for select to authenticated using (id = public.current_student_id());

create policy "secretary manages registrations" on public.registrations
  for all to authenticated using (public.is_secretary()) with check (public.is_secretary());
create policy "student reads own registrations" on public.registrations
  for select to authenticated using (student_id = public.current_student_id());

create policy "secretary manages enrollments" on public.enrollments
  for all to authenticated using (public.is_secretary()) with check (public.is_secretary());
create policy "student reads own enrollments" on public.enrollments
  for select to authenticated using (student_id = public.current_student_id());

-- Views are security_invoker, so the table policies above decide what each view returns.
grant select on public.v_enrollment_details, public.v_student_deficiencies, public.v_prerequisite_violations,
                public.v_student_overview, public.v_section_capacity to authenticated;
revoke all on public.v_enrollment_details, public.v_student_deficiencies, public.v_prerequisite_violations,
              public.v_student_overview, public.v_section_capacity from anon;
