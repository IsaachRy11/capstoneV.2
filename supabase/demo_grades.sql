-- Demo grades for the CURRENT semester, for presentations. Not part of the seed and not a migration.
-- Some students are completely graded, some partly graded (midterm for every subject, final for about half),
-- the rest untouched. A few grades are failed (5.00) and a few subjects INC, so the next term has something to carry.
-- Safe to run again: it only fills classes that still have no final grade and no status, and keeps any midterm
-- grade that is already there. Which group a student is in is fixed by their student ID.
--
--   group 0-3 (40% of students)  complete: midterm and final for every subject
--   group 4-5 (20%)              partly graded: midterm for every subject, final for about half
--   group 6-9 (40%)              not yet: nothing added

update public.enrollments e set
  midterm_grade = case when e.midterm_grade is null then t.mid else e.midterm_grade end,
  final_grade = case when t.finished and t.outcome <> 'inc' then t.fin else e.final_grade end,
  status = case when t.finished and t.outcome = 'inc' then 'incomplete'::public.enrollment_status else e.status end
from (
  select x.id, x.grp, x.outcome,
         (x.grp <= 3 or (x.grp <= 5 and x.r1 % 2 = 0)) as finished,
         case when x.outcome = 'fail' then 5.00::numeric
              else (array[1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00])[1 + (x.r1 + 3) % 9]::numeric end as mid,
         case when x.outcome = 'fail' then 5.00::numeric
              else (array[1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00])[1 + x.r1 % 9]::numeric end as fin
  from (
    select en.id,
           abs(hashtext(en.student_id)) % 10 as grp,
           abs(hashtext(en.id::text)) % 100 as r1,
           case when abs(hashtext(en.id::text || 'x')) % 100 < 8 then 'fail'
                when abs(hashtext(en.id::text || 'x')) % 100 < 11 then 'inc'
                else 'pass' end as outcome
    from public.enrollments en
    join public.class_offerings o on o.id = en.offering_id
    join public.sections s on s.id = o.section_id
    where s.school_term_id = (select id from public.school_terms where is_current)
      and en.status = 'enrolled' and en.final_grade is null
  ) x
) t
where e.id = t.id and t.grp <= 5;
