-- Rules for the "Withdrawn" subject status.
--   * Like Dropped, it frees the seat, ends schedule clashes, doesn't count toward the unit limit or the year level,
--     and is part of the student's history (kept, logged, protects the record from deletion).
--   * Unlike Dropped, it is not a subject to resolve: the student simply hasn't taken it.
--   * A subject with a final grade can't be withdrawn.
--   * Withdrawing a STUDENT now marks this term's subjects without a result Withdrawn (before: Dropped).

-- ─── 1. Every rule that treated Dropped as "not in the subject" now treats Withdrawn the same way ───
-- The functions are rewritten in place from their current definitions, with these exact phrases replaced, so no
-- other line of them changes. The block stops with an error if a phrase is still there afterwards.
do $$
declare
  f record;
  v_def text;
  v_new text;
begin
  for f in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prokind = 'f' and p.prosrc like '%''dropped''%'
  loop
    v_def := pg_get_functiondef(f.oid);
    -- seats, clashes, unit totals and year level
    v_new := regexp_replace(v_def, '\m((e|e1|e2|new)\.)?status <> ''dropped''', '\1status not in (''dropped'', ''withdrawn'')', 'g');
    -- bringing a subject back runs the seat and clash checks again
    v_new := replace(v_new, 'old.status = ''dropped'' and new.status not in (''dropped'', ''withdrawn'')',
                            'old.status in (''dropped'', ''withdrawn'') and new.status not in (''dropped'', ''withdrawn'')');
    -- saved without a final grade
    v_new := replace(v_new, 'v_status in (''incomplete'', ''dropped'')', 'v_status in (''incomplete'', ''dropped'', ''withdrawn'')');
    -- counts as class history
    v_new := replace(v_new, 'status in (''passed'', ''failed'', ''incomplete'', ''dropped'')',
                            'status in (''passed'', ''failed'', ''incomplete'', ''dropped'', ''withdrawn'')');
    if v_new <> v_def then
      execute v_new;
    end if;
  end loop;

  select string_agg(p.proname, ', ') into v_def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prokind = 'f' and p.prosrc ~ '\m((e|e1|e2)\.)?status <> ''dropped''';
  if v_def is not null then
    raise exception 'These functions still count a Withdrawn subject as taken: %', v_def;
  end if;
end $$;

-- ─── 2. Grade → status: Withdrawn carries no final grade, and a graded subject can't be withdrawn ──
create or replace function public.sync_enrollment_status() returns trigger
language plpgsql
as $$
begin
  if new.status = 'withdrawn' and tg_op = 'UPDATE' and old.status <> 'withdrawn' and old.final_grade is not null then
    raise exception 'A subject with a final grade can''t be withdrawn.' using errcode = 'P0001';
  end if;
  if new.status in ('incomplete', 'dropped', 'withdrawn') then
    if new.final_grade is not null then
      raise exception 'A subject marked % can''t have a final grade. Clear the status first.',
        case new.status when 'incomplete' then 'NC' when 'dropped' then 'Dropped' else 'Withdrawn' end
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

-- ─── 3. Withdrawing a student: this term's subjects without a result become Withdrawn ──
create or replace function private.leave_current_term() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Passed, failed, NC and Dropped are results already given and stay as they are.
  update public.enrollments e set status = 'withdrawn'
  from public.class_offerings o, public.sections sec, public.school_terms t
  where e.student_id = new.id and e.status = 'enrolled' and e.final_grade is null
    and o.id = e.offering_id and sec.id = o.section_id and t.id = sec.school_term_id and t.is_current;
  return null;
end $$;

-- ─── 4. A withdrawn subject can't make a student Irregular for a missing prerequisite ──
create or replace view public.v_prerequisite_violations with (security_invoker = true) as
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
  and d.status <> 'withdrawn'
  and not exists (
    select 1 from public.v_enrollment_details p
    where p.student_id = d.student_id
      and p.code_key = pre.code_key
      and p.status = 'passed'
  )
  and not exists (
    select 1 from public.student_credits c
    join public.curriculum_subjects cs on cs.id = c.curriculum_subject_id
    where c.student_id = d.student_id and c.removed_at is null and cs.code_key = pre.code_key
  );

-- ─── 5. Add students says when a student withdrew from this subject this term ──
do $$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef('public.subject_enroll_plan(bigint, text[])'::regprocedure) into v_def;
  v_new := regexp_replace(v_def,
    'v_state := ''enrolled'';(\s+)elsif private\.has_passed',
    'v_state := case when exists (select 1 from public.enrollments w join public.class_offerings wo on wo.id = w.offering_id
                 join public.sections ws on ws.id = wo.section_id
                 where w.student_id = s.id and wo.curriculum_subject_id = v_o.subject_id and ws.school_term_id = v_o.school_term_id
                   and w.status = ''withdrawn'') then ''withdrawn'' else ''enrolled'' end;\1elsif private.has_passed');
  if v_new = v_def then
    raise exception 'subject_enroll_plan did not have the expected line.';
  end if;
  execute v_new;
end $$;
