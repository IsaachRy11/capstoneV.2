-- CCS Monitor · demo data (NOT official): students, sections, schedules, grades.
-- Runs after the migrations (`supabase db reset` loads it automatically).
-- Subjects always come from the official curriculum tables; nothing academic is invented here.
-- Safe to run again: it only adds what is missing (new terms, rooms, and any block section that doesn't
-- exist yet this semester, with its students). That is how new sections are added to a live project
-- without touching the students already there.
-- Sections per program year: 1st year S T U V · 2nd year S T U · 3rd and 4th year S T (ACT stops at 2nd year).
-- Each section gets 10 students: a shiftee, a transferee, a returnee, two with an INC or dropped class,
-- and one transferee with a failed subject, so every kind of student has examples.

select setseed(0.4217);

-- ─── School terms (SY 2023-2024 → 2026-2027; current = 2026-2027 1st semester) ──
insert into public.school_terms (school_year, semester, starts_on, ends_on, is_current)
select sy, sem,
       case sem when 1 then make_date(y, 8, 4)  else make_date(y + 1, 1, 6)  end,
       case sem when 1 then make_date(y, 12, 19) else make_date(y + 1, 5, 22) end,
       (y = 2026 and sem = 1)
from generate_series(2023, 2026) as y,
     lateral (select y || '-' || (y + 1) as sy) s,
     generate_series(1, 2) as sem
on conflict do nothing;

-- ─── Rooms (made up) ──────────────────────────────────────────────────────
insert into public.rooms (name, kind, capacity) values
  ('CCS Lab 1', 'laboratory', 40), ('CCS Lab 2', 'laboratory', 40),
  ('CCS Lab 3', 'laboratory', 40), ('CCS Lab 4', 'laboratory', 40),
  ('CCS Lab 5', 'laboratory', 40), ('CCS Lab 6', 'laboratory', 40),
  ('Room 301',  'lecture',    45), ('Room 302',  'lecture',    45),
  ('Room 303',  'lecture',    45), ('Room 304',  'lecture',    45),
  ('Room 305',  'lecture',    45), ('Room 306',  'lecture',    45),
  ('CCS Lab 7', 'laboratory', 40), ('CCS Lab 8', 'laboratory', 40),
  ('CCS Lab 9', 'laboratory', 40), ('CCS Lab 10', 'laboratory', 40),
  ('CCS Lab 11', 'laboratory', 40), ('CCS Lab 12', 'laboratory', 40),
  ('CCS Lab 13', 'laboratory', 40), ('CCS Lab 14', 'laboratory', 40),
  ('CCS Lab 15', 'laboratory', 40), ('CCS Lab 16', 'laboratory', 40),
  ('Room 307',  'lecture',    45), ('Room 308',  'lecture',    45),
  ('Room 309',  'lecture',    45), ('Room 310',  'lecture',    45),
  ('Room 311',  'lecture',    45), ('Room 312',  'lecture',    45),
  ('Gymnasium', 'lecture',   120)
on conflict do nothing;
-- The gym hosts several PATHFIT classes at once, so it's exempt from the room double-booking rule.
update public.rooms set is_shared = true where name = 'Gymnasium';

-- ─── Demo login (link it by creating an Auth user with this email) ────────
insert into public.secretaries (full_name, email) values
  ('Demo Secretary', 'demo.secretary@ccs-monitor.test')
on conflict do nothing;

-- ─── Students, sections, registrations, offerings, schedules, grades ──────
do $$
declare
  first_names text[] := array['Angelo','Bea','Carlo','Danica','Elijah','Faith','Gabriel','Hazel','Ivan','Jasmine',
    'Kenneth','Lea','Miguel','Nicole','Oliver','Patricia','Rafael','Sofia','Tristan','Uriel',
    'Vince','Wendy','Xavier','Ysabel','Zack','Aira','Bryan','Clarisse','Dominic','Erika',
    'Francis','Gianne','Harold','Irish','Jerome','Kyla','Lance','Mika','Nathan','Reyna'];
  last_names text[] := array['Abella','Bacalso','Cabahug','Dagatan','Espina','Flores','Gador','Hipolito','Inoc','Jumao-as',
    'Kintanar','Labra','Mabini','Nacua','Ocariza','Pacaña','Quijano','Rosales','Sumalpong','Tagalog',
    'Uy','Villaflor','Wenceslao','Yap','Zamora','Alcuizar','Baguio','Canoy','Dumaguit','Estrella'];
  programs_cfg jsonb := '[
    {"code":"BSIT","per_section":10,"letters":{"1":["S","T","U","V"],"2":["S","T","U"],"3":["S","T"],"4":["S","T"]}},
    {"code":"BSCS","per_section":10,"letters":{"1":["S","T","U","V"],"2":["S","T","U"],"3":["S","T"],"4":["S","T"]}},
    {"code":"ACT","per_section":10,"letters":{"1":["S","T","U","V"],"2":["S","T","U"]}}
  ]';
  pc jsonb;
  prog record;
  cur_curriculum bigint;
  cur_term record;
  term record;
  y int;
  entry_year int;
  letter text;
  k int;
  counters int[] := array[0,0,0,0,0];   -- per entry year 2023..2027
  sid text;
  fname text;
  lname text;
  bias numeric;
  risk numeric;
  chosen_room bigint;
  sec_offset int;
  term_index int;
  level int;
  sec_id bigint;
  off_id bigint;
  subj record;
  slot int;
  r numeric;
  grade_idx int;
  passing numeric[] := array[1.00,1.25,1.50,1.75,2.00,2.25,2.50,2.75,3.00];
  fg numeric;
  st public.enrollment_status;
  adm public.admission_type;
  force_state text;
  forced_done boolean;
  i int;
  max_n int;
  room_lab bigint[];
  room_lec bigint[];
  room_gym bigint;
begin
  select * into cur_term from public.school_terms where is_current;
  -- Continue student numbers after the ones already in the database (entry years 2023..2027).
  for i in 0..4 loop
    select coalesce(max(right(id, 4)::int), 0) into max_n from public.students where left(id, 4) = (2023 + i)::text;
    counters[i + 1] := max_n;
  end loop;
  select array_agg(id order by name) into room_lab from public.rooms where kind = 'laboratory';
  select array_agg(id order by name) into room_lec from public.rooms where kind = 'lecture' and name like 'Room%';
  select id into room_gym from public.rooms where name = 'Gymnasium';

  for pc in select * from jsonb_array_elements(programs_cfg) loop
    select * into prog from public.programs where code = pc->>'code';
    select id into cur_curriculum from public.curricula where program_id = prog.id and is_active;

    for y in 1..prog.duration_years loop
      entry_year := 2026 - (y - 1);

      for letter in select jsonb_array_elements_text(pc->'letters'->(y::text)) loop
        -- Skip a section that already exists this semester (keeps re-runs from duplicating it).
        if exists (select 1 from public.sections x
                   where x.school_term_id = cur_term.id and x.name_key = public.norm_key(prog.code || ' ' || y || '-' || letter)) then
          continue;
        end if;
        for k in 1..(pc->>'per_section')::int loop
          counters[entry_year - 2022] := counters[entry_year - 2022] + 1;
          sid   := entry_year || '-' || lpad(counters[entry_year - 2022]::text, 4, '0');
          fname := first_names[1 + floor(random() * array_length(first_names, 1))::int];
          lname := last_names[1 + floor(random() * array_length(last_names, 1))::int];
          bias  := random() * 2 - 1;   -- -1 strong … +1 struggling
          -- Examples of every kind of student in each section.
          adm := (case k when 1 then 'shiftee' when 2 then 'transferee' when 3 then 'returnee' else 'new' end)::public.admission_type;
          force_state := case k when 2 then 'failed' when 5 then 'incomplete' when 8 then 'dropped' else null end;
          forced_done := false;

          insert into public.students (id, first_name, last_name, email, program_id, curriculum_id, year_level, admission_type)
          values (sid, fname, lname,
                  lower(replace(fname, ' ', '') || '.' || replace(replace(lname, ' ', ''), 'ñ', 'n')) || '.' || replace(sid, '-', '') || '@student.ccs-monitor.test',
                  prog.id, cur_curriculum, y,
                  adm);

          -- Walk every term from the student's entry term up to the current term
          term_index := 0;
          for term in
            select * from public.school_terms
            where (school_year, semester) >= (entry_year || '-' || (entry_year + 1), 1)
              and (school_year, semester) <= (cur_term.school_year, cur_term.semester)
            order by school_year, semester
          loop
            level := term_index / 2 + 1;
            term_index := term_index + 1;
            exit when level > prog.duration_years;

            -- Block section for this term (created once, shared by classmates)
            select id into sec_id from public.sections
              where school_term_id = term.id and name_key = public.norm_key(prog.code || ' ' || level || '-' || letter);
            if not found then
              insert into public.sections (school_term_id, program_id, year_level, name, capacity, home_room_id)
              values (term.id, prog.id, level, prog.code || ' ' || level || '-' || letter, 40,
                      room_lec[1 + floor(random() * array_length(room_lec, 1))::int])
              returning id into sec_id;
            end if;

            insert into public.registrations (student_id, school_term_id, section_id, year_level)
            values (sid, term.id, sec_id, level);

            for subj in
              select * from public.curriculum_subjects
              where curriculum_id = cur_curriculum and year_level = level and semester = term.semester
              order by sort_order
            loop
              select id into off_id from public.class_offerings
                where section_id = sec_id and curriculum_subject_id = subj.id;
              if not found then
                insert into public.class_offerings (section_id, curriculum_subject_id)
                values (sec_id, subj.id) returning id into off_id;

                -- Weekly schedule, current term only. Odd slots MWF (1 h), even slots TTh (1.5 h).
                -- Each section is shifted by 0–2 slots so sections don't all start at 7:30.
                -- A room is assigned only if free at that time (else left TBA); the gym is shared.
                if term.is_current and subj.kind <> 'internship' then
                  sec_offset := (select count(*) from public.sections where school_term_id = term.id and id < sec_id)::int % 3;
                  if subj.sort_order % 2 = 1 then
                    slot := (subj.sort_order + 1) / 2 + sec_offset;
                    insert into public.class_meetings (offering_id, weekday, starts_at, ends_at)
                    select off_id, d,
                           time '07:30' + (slot - 1) * interval '1 hour' + case when slot > 4 then interval '1 hour 30 minutes' else interval '0' end,
                           time '08:30' + (slot - 1) * interval '1 hour' + case when slot > 4 then interval '1 hour 30 minutes' else interval '0' end
                    from unnest(array[1, 3, 5]) as d;
                  else
                    slot := subj.sort_order / 2 + sec_offset;
                    insert into public.class_meetings (offering_id, weekday, starts_at, ends_at)
                    select off_id, d,
                           time '07:30' + (slot - 1) * interval '1 hour 30 minutes' + case when slot > 3 then interval '1 hour' else interval '0' end,
                           time '09:00' + (slot - 1) * interval '1 hour 30 minutes' + case when slot > 3 then interval '1 hour' else interval '0' end
                    from unnest(array[2, 4]) as d;
                  end if;

                  -- One room for every meeting of this class: free at all of its times.
                  if subj.kind = 'pathfit' then
                    chosen_room := room_gym;
                  else
                    select rm.id into chosen_room from public.rooms rm
                    where rm.kind = case when subj.kind in ('major', 'elective') then 'laboratory' else 'lecture' end
                      and rm.id <> room_gym
                      and not exists (
                        select 1 from public.class_meetings mine
                        join public.class_meetings x
                          on x.room_id = rm.id and x.weekday = mine.weekday
                         and x.starts_at < mine.ends_at and mine.starts_at < x.ends_at
                        where mine.offering_id = off_id)
                    order by random() limit 1;
                  end if;
                  update public.class_meetings set room_id = chosen_room where offering_id = off_id;
                end if;
              end if;

              -- Grades: past terms get finals; the current term has midterms only
              grade_idx := least(9, greatest(1, round(4 + bias * 2.5 + (random() + random() + random() - 1.5) * 2)::int));
              r := random();
              fg := null;
              st := 'enrolled';
              -- Most students rarely have a deficiency; roughly 1 in 5 (bias > 0.6) struggle more often.
              risk := case when bias > 0.6 then 0.045 else 0.002 end;
              if not term.is_current then
                if r < risk * 0.55 then
                  fg := 5.00;
                elsif r < risk * 0.85 then
                  st := 'incomplete';
                elsif r < risk then
                  st := 'dropped';
                else
                  fg := passing[grade_idx];
                end if;
              end if;

              -- Give the students picked above their example problem once: a failed / INC / dropped class in
              -- a past term, or (1st years, who only have this term) a class dropped this semester.
              if force_state is not null and not forced_done then
                if not term.is_current then
                  forced_done := true;
                  if force_state = 'failed' then
                    fg := 5.00; st := 'enrolled';
                  elsif force_state = 'incomplete' then
                    fg := null; st := 'incomplete';
                  else
                    fg := null; st := 'dropped';
                  end if;
                elsif y = 1 then
                  forced_done := true; fg := null; st := 'dropped';
                end if;
              end if;

              insert into public.enrollments (student_id, offering_id, midterm_grade, final_grade, status)
              values (sid, off_id,
                      case when st = 'dropped' then null
                           when fg = 5.00 then 5.00
                           else passing[least(9, greatest(1, grade_idx + (floor(random() * 3) - 1)::int))] end,
                      fg, st);
            end loop;
          end loop;
        end loop;
      end loop;
    end loop;
  end loop;
end $$;

-- Demo student login: the first 2nd-year BSIT student
update public.students
set email = 'demo.student@ccs-monitor.test'
where id = (select s.id from public.students s join public.programs p on p.id = s.program_id
            where p.code = 'BSIT' and s.year_level = 2 order by s.id limit 1);
