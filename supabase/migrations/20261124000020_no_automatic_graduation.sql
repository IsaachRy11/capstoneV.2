-- CCS Subject Monitoring System · starting a term no longer graduates anyone
-- Passing every subject is not enough to graduate (there are requirements outside the grades), so the secretary
-- sets a student's status to Graduated on their record. run_term_start() keeps everything else as it was.

create or replace function private.run_term_start(p_term_id bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_t public.school_terms%rowtype;
  v_cur public.school_terms%rowtype;
  v_new_year boolean;
begin
  perform pg_advisory_xact_lock(20261121);  -- one term change at a time (see migration 0017)
  select * into v_t from public.school_terms where id = p_term_id;
  if not found then
    raise exception 'That term doesn''t exist.' using errcode = 'P0001';
  end if;
  if v_t.is_current then
    raise exception 'This term has already started.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.sections where school_term_id = p_term_id) then
    raise exception 'Prepare this term first.' using errcode = 'P0001';
  end if;
  select * into v_cur from public.school_terms where is_current;
  if found and (v_t.school_year, v_t.semester) <= (v_cur.school_year, v_cur.semester) then
    raise exception 'Only a term that comes after the current one can be started.' using errcode = 'P0001';
  end if;
  v_new_year := v_cur.id is null or v_t.school_year <> v_cur.school_year;

  -- Snapshot for Undo (year levels change later as the secretary enrolls students; Undo puts them back).
  insert into public.term_starts (from_term_id, to_term_id, started_by, students_before)
  select v_cur.id, p_term_id, (select auth.uid()),
         coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'year_level', st.year_level, 'status', st.status)), '[]'::jsonb)
  from public.students st where st.status = 'active';

  update public.school_terms set is_current = false where is_current;
  update public.school_terms set is_current = true where id = p_term_id;

  return jsonb_build_object(
    'term_id', p_term_id, 'new_school_year', v_new_year, 'graduated', 0,
    'sections', (select count(*) from public.sections where school_term_id = p_term_id),
    'classes', (select count(*) from public.class_offerings o join public.sections sec on sec.id = o.section_id
                where sec.school_term_id = p_term_id));
end $$;
revoke all on function private.run_term_start(bigint) from public, anon;
