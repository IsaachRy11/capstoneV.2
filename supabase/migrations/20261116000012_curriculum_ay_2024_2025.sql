-- CCS Monitor · official SJC CCS curricula, effective AY 2024-2025, with prerequisites.
-- Source: the printed CCS curriculum checklists (BSIT, BSCS: pursuant to CMO No. 25 s. 2015, CMO No. 20 s. 2013,
-- CMO No. 39 s. 2021; ACT Networking: CMO No. 13 s. 2021, CMO No. 39 s. 2021), approved by the Curriculum
-- Review Committee chairman and noted by CHED. Provided by the user on 2026-11-16.
-- Codes, titles, units and prerequisites are copied from the sheets. Only obvious misspellings were fixed
-- ("Programmng", "Appicatons", "Technoprenuership", "Algortihms", "Sofware") and "Phil" written out.
-- Two printing slips on the BSCS sheet are recorded as printed where possible (see the notes below).
--
-- The previous curricula (from the website, 2026-10-31) are kept but no longer active, so any
-- record that points at them stays valid.

-- Some subjects need a year standing instead of (or besides) a subject: "3RD YR STANDING", "4TH YR STANDING".
alter table public.curriculum_subjects
  add column standing_required smallint check (standing_required between 2 and 5);
comment on column public.curriculum_subjects.standing_required is
  'Year standing needed to take the subject (e.g. 4 = "4th year standing"), from the official checklist.';

update public.programs set description = '2-year program, Networking track.' where code = 'ACT';

update public.curricula set is_active = false where is_active;

insert into public.curricula (program_id, title, effective_school_year, source_url, is_active)
select p.id,
       case p.code when 'ACT' then 'Associate in Computer Technology (Networking) · CCS curriculum checklist'
                   else p.name || ' · CCS curriculum checklist' end,
       '2024-2025', null, true
from public.programs p;

create temporary table new_subjects (
  program text, year_level int, semester int, sort_order int,
  code text, title text, units numeric, prereqs text, standing int
) on commit drop;

insert into new_subjects values
  -- ── BSIT ─────────────────────────────────────────────────────────────────
  ('BSIT',1,1,1,'IT 101','Introduction to Computing',3,null,null),
  ('BSIT',1,1,2,'IT 102','Computer Programming 1',3,null,null),
  ('BSIT',1,1,3,'GE 1','Understanding the Self',3,null,null),
  ('BSIT',1,1,4,'GE 2','Readings in Philippine History',3,null,null),
  ('BSIT',1,1,5,'GE 3','Mathematics in the Modern World',3,null,null),
  ('BSIT',1,1,6,'GE EL 1','Living in the IT Era',3,null,null),
  ('BSIT',1,1,7,'THEO 1A','Old Testament',2,null,null),
  ('BSIT',1,1,8,'PATHFIT 1','Physical Activities Towards Health & Fitness 1: Movement Competency Training',2,null,null),
  ('BSIT',1,1,9,'NSTP 11','National Service Training Program 1',3,null,null),
  ('BSIT',1,2,1,'IT 111','Networks and Communications 1',3,'IT 101',null),
  ('BSIT',1,2,2,'IT 112','Computer Programming 2',3,'IT 102',null),
  ('BSIT',1,2,3,'IT 113','Discrete Structures',3,'IT 102',null),
  ('BSIT',1,2,4,'GE 4','Purposive Communication',3,null,null),
  ('BSIT',1,2,5,'GE 5','Science, Technology, and Society',3,null,null),
  ('BSIT',1,2,6,'GE 6','The Contemporary World',3,null,null),
  ('BSIT',1,2,7,'GE EL 2','Gender and Society',3,null,null),
  ('BSIT',1,2,8,'THEO 1B','New Testament',2,null,null),
  ('BSIT',1,2,9,'PATHFIT 2','Physical Activities Towards Health & Fitness 2: Exercise-based Fitness Activities',2,'PATHFIT 1',null),
  ('BSIT',1,2,10,'NSTP 12','National Service Training Program 2',3,null,null),
  ('BSIT',2,1,1,'IT 201','Information Management',3,'IT 112',null),
  ('BSIT',2,1,2,'IT 202','Data Structures & Algorithms',3,'IT 112',null),
  ('BSIT',2,1,3,'IT 203','Web Systems and Technologies 1',3,'IT 101',null),
  ('BSIT',2,1,4,'IT 204','Platform Technologies',3,'IT 112',null),
  ('BSIT',2,1,5,'GE 7','Art Appreciation',3,null,null),
  ('BSIT',2,1,6,'GE 8','Ethics',3,null,null),
  ('BSIT',2,1,7,'GE EL 3d','The Entrepreneurial Mind',3,null,null),
  ('BSIT',2,1,8,'THEO 2A','Christology',2,null,null),
  ('BSIT',2,1,9,'PATHFIT 3','Physical Activities Towards Health & Fitness 3: Sports',2,'PATHFIT 1, PATHFIT 2',null),
  ('BSIT',2,2,1,'IT 211','Object-Oriented Programming',3,'IT 202',null),
  ('BSIT',2,2,2,'IT 212','Human Computer Interaction',3,'IT 202',null),
  ('BSIT',2,2,3,'IT 213','Applications Dev & Emerging Tech',3,'IT 202',null),
  ('BSIT',2,2,4,'IT 214','Information Management 2',3,'IT 201',null),
  ('BSIT',2,2,5,'IT 215','Systems Analysis and Design',3,'IT 202, IT 201',null),
  ('BSIT',2,2,6,'GE 9','Life and Works of Rizal',3,null,null),
  ('BSIT',2,2,7,'Course En 1','Course Enhancement 1',3,null,null),
  ('BSIT',2,2,8,'THEO 2B','Mariology',2,null,null),
  ('BSIT',2,2,9,'PATHFIT 4','Physical Activities Towards Health & Fitness 4: Dance',2,'PATHFIT 1, PATHFIT 2',null),
  ('BSIT',3,1,1,'IT 301','Information Assurance and Security',3,'IT 213',null),
  ('BSIT',3,1,2,'IT 302','Systems Integration and Architecture 1',3,'IT 215',null),
  ('BSIT',3,1,3,'IT 303','Networking 2',3,'IT 111, IT 204',null),
  ('BSIT',3,1,4,'IT 304','Quantitative Methods',3,'IT 113',null),
  ('BSIT',3,1,5,'IT 305','Web Systems and Technologies 2',3,'IT 203',null),
  ('BSIT',3,1,6,'IT 306','Business Analytics',3,'IT 214',null),
  ('BSIT',3,1,7,'IT 307','Enterprise Data Management',3,null,null),
  ('BSIT',3,1,8,'IT EL 1','IT Elective 1',3,null,3),
  ('BSIT',3,1,9,'THEO 3A','Christian Morality',1,null,null),
  ('BSIT',3,2,1,'IT 311','Analytic Tools and Techniques',3,'IT 306',null),
  ('BSIT',3,2,2,'IT 312','Analytics Modeling',3,'IT 307',null),
  ('BSIT',3,2,3,'IT 313','Social Issues and Professional Practice',3,null,null),
  ('BSIT',3,2,4,'IT 314','Systems Admin and Maintenance',3,'IT 302, IT 304',null),
  ('BSIT',3,2,5,'IT 315','Integrative Programming and Tech 1',3,'IT 211, IT 213',null),
  ('BSIT',3,2,6,'IT EL 2','IT Elective 2',3,null,null),
  ('BSIT',3,2,7,'Course En 2','Course Enhancement 2',3,null,null),
  ('BSIT',3,2,8,'THEO 3B','The Commandments',1,null,null),
  ('BSIT',3,3,1,'CAPSTONE 1','Capstone Project 1',3,null,null),
  ('BSIT',3,3,2,'THEO 4A','Intro to Pastoral Life/BEC',1,null,null),
  ('BSIT',4,1,1,'CAPSTONE 2','Capstone Project 2',3,'CAPSTONE 1',null),
  ('BSIT',4,1,2,'IT 401','Technopreneurship',3,null,null),
  ('BSIT',4,1,3,'IT 402','Analytics Application',3,'IT 312',null),
  ('BSIT',4,1,4,'Prof En','Professional Enhancement',3,null,4),
  ('BSIT',4,1,5,'IT EL 3','IT Elective 3',3,null,null),
  ('BSIT',4,1,6,'IT EL 4','IT Elective 4',3,null,null),
  ('BSIT',4,1,7,'THEO 4B','Pastoral Exposure',1,null,null),
  ('BSIT',4,2,1,'PRAC','Practicum/Analytics Internship',6,null,4),
  ('BSIT',4,2,2,'SEMTOUR','Seminars and Tours',3,null,4),

  -- ── BSCS ─────────────────────────────────────────────────────────────────
  ('BSCS',1,1,1,'CS 101','Introduction to Computing',3,null,null),
  ('BSCS',1,1,2,'CS 102','Computer Programming 1',3,null,null),
  ('BSCS',1,1,3,'GE 1','Understanding the Self',3,null,null),
  ('BSCS',1,1,4,'GE 2','Readings in Philippine History',3,null,null),
  ('BSCS',1,1,5,'GE 3','Mathematics in the Modern World',3,null,null),
  ('BSCS',1,1,6,'GE EL 1','Living in the IT Era',3,null,null),
  ('BSCS',1,1,7,'THEO 1A','Old Testament',2,null,null),
  ('BSCS',1,1,8,'PATHFIT 1','Physical Activities Towards Health & Fitness 1: Movement Competency Training',2,null,null),
  ('BSCS',1,1,9,'NSTP 11','National Service Training Program 1',3,null,null),
  ('BSCS',1,2,1,'CS 111','Networks and Communications 1',3,'CS 101',null),
  ('BSCS',1,2,2,'CS 112','Computer Programming 2',3,'CS 102',null),
  ('BSCS',1,2,3,'CS 113','Discrete Structures 1',3,null,null),
  ('BSCS',1,2,4,'GE 4','Purposive Communication',3,null,null),
  ('BSCS',1,2,5,'GE 5','Science, Technology, and Society',3,null,null),
  ('BSCS',1,2,6,'GE 6','The Contemporary World',3,null,null),
  ('BSCS',1,2,7,'GE EL 2','Gender and Society',3,null,null),
  ('BSCS',1,2,8,'THEO 1B','New Testament',2,null,null),
  ('BSCS',1,2,9,'PATHFIT 2','Physical Activities Towards Health & Fitness 2: Exercise-based Fitness Activities',2,'PATHFIT 1',null),
  ('BSCS',1,2,10,'NSTP 12','National Service Training Program 2',3,null,null),
  ('BSCS',2,1,1,'CS 201','Information Management',3,'CS 112',null),
  ('BSCS',2,1,2,'CS 202','Data Structures & Algorithms',3,'CS 112',null),
  ('BSCS',2,1,3,'CS 203','Web Systems and Technologies',3,'CS 101',null),
  ('BSCS',2,1,4,'STAT 1a','Probability and Statistics',3,'CS 113',null),
  ('BSCS',2,1,5,'GE 7','Art Appreciation',3,null,null),
  ('BSCS',2,1,6,'GE 8','Ethics',3,null,null),
  ('BSCS',2,1,7,'GE EL 3d','The Entrepreneurial Mind',3,null,null),
  ('BSCS',2,1,8,'THEO 2A','Christology',2,null,null),
  ('BSCS',2,1,9,'PATHFIT 3','Physical Activities Towards Health & Fitness 3: Sports',2,'PATHFIT 1, PATHFIT 2',null),
  ('BSCS',2,2,1,'CS 211','Object-Oriented Programming',3,'CS 202',null),
  ('BSCS',2,2,2,'CS 212','Human Computer Interaction',3,'CS 202',null),
  ('BSCS',2,2,3,'CS 213','Applications Dev & Emerging Tech',3,'CS 202',null),
  ('BSCS',2,2,4,'CS 214','Information Management 2',3,'CS 201',null),
  ('BSCS',2,2,5,'CS 215','Systems Analysis and Design',3,'CS 201, CS 202',null),
  ('BSCS',2,2,6,'GE 9','Life and Works of Rizal',3,null,null),
  ('BSCS',2,2,7,'Course En 1','Course Enhancement 1',3,null,null),
  ('BSCS',2,2,8,'THEO 2B','Mariology',2,null,null),
  ('BSCS',2,2,9,'PATHFIT 4','Physical Activities Towards Health & Fitness 4: Dance',2,'PATHFIT 1, PATHFIT 2',null),
  ('BSCS',3,1,1,'CS 301','Information Assurance and Security 1',3,'CS 213',null),
  ('BSCS',3,1,2,'CS 302','Platform Technologies',3,'CS 211',null),
  ('BSCS',3,1,3,'CS 303','Discrete Structures 2',3,'CS 113',null),
  ('BSCS',3,1,4,'CS 304','Algorithms & Complexity',3,'CS 202',null),
  ('BSCS',3,1,5,'CS 305','Software Engineering 1',3,'CS 215',null),
  ('BSCS',3,1,6,'CS 306','Business Analytics',3,'CS 214',null),
  ('BSCS',3,1,7,'CS 307','Enterprise Data Management',3,null,null),
  ('BSCS',3,1,8,'THEO 3A','Christian Morality',1,null,null),
  ('BSCS',3,2,1,'CS 311','Analytics Techniques and Tools',3,'CS 306, CS 307',null),
  -- Printed as "CS306, 308"; there is no CS 308 in this curriculum, so only CS 306 is recorded.
  ('BSCS',3,2,2,'CS 312','Analytics Modeling',3,'CS 306',null),
  ('BSCS',3,2,3,'CS 313','Social Issues and Professional Practice',3,null,null),
  ('BSCS',3,2,4,'CS 314','Operating Systems',3,'CS 302',null),
  ('BSCS',3,2,5,'CS 315','Software Engineering 2',3,'CS 304',null),
  ('BSCS',3,2,6,'CS 316','Programming Languages',3,'CS 305',null),
  -- Printed as "CS EL 2 · CS Elective 1"; the 4th year also has "CS EL 2 · CS Elective 2", and a code can only
  -- appear once, so this one is recorded as CS EL 1 (matching its title).
  ('BSCS',3,2,7,'CS EL 1','CS Elective 1',3,null,null),
  ('BSCS',3,2,8,'Course En 2','Course Enhancement 2',3,null,null),
  ('BSCS',3,2,9,'THEO 3B','The Commandments',1,null,null),
  ('BSCS',3,3,1,'THESIS 1','Thesis Writing 1',3,null,null),
  ('BSCS',3,3,2,'THEO 4A','Intro to Pastoral Life/BEC',1,null,null),
  ('BSCS',4,1,1,'THESIS 2','Thesis Writing 2',3,'THESIS 1',null),
  -- The BSCS sheet prints these two codes as IT 401 / IT 402.
  ('BSCS',4,1,2,'IT 401','Automata Theory & Formal Languages',3,'CS 312',null),
  ('BSCS',4,1,3,'IT 402','Analytics Application',3,'CS 312',null),
  ('BSCS',4,1,4,'Prof En','Professional Enhancement',3,'CS 304',null),
  ('BSCS',4,1,5,'CS EL 2','CS Elective 2',3,null,4),
  ('BSCS',4,1,6,'CS EL 3','CS Elective 3',3,null,null),
  ('BSCS',4,1,7,'THEO 4B','Pastoral Exposure',1,null,null),
  ('BSCS',4,2,1,'PRAC','Practicum/Analytics Internship',6,null,4),
  ('BSCS',4,2,2,'SEMTOUR','Seminars and Tours',3,null,4),

  -- ── ACT (Networking) ─────────────────────────────────────────────────────
  ('ACT',1,1,1,'ACT 101','Introduction to Computing',3,null,null),
  ('ACT',1,1,2,'ACT 102','Fundamentals of Programming',3,null,null),
  ('ACT',1,1,3,'ACT 103','Platform Technologies',3,null,null),
  ('ACT',1,1,4,'GE 1','Understanding the Self',3,null,null),
  ('ACT',1,1,5,'GE 3','Mathematics in the Modern World',3,null,null),
  ('ACT',1,1,6,'THEO 1A','Old Testament',2,null,null),
  ('ACT',1,1,7,'PATHFIT 1','Physical Activities Towards Health & Fitness 1: Movement Competency Training',2,null,null),
  ('ACT',1,1,8,'NSTP 11','National Service Training Program 1',3,null,null),
  ('ACT',1,2,1,'ACT 111','Data Communications and Networking 1',3,'ACT 101',null),
  ('ACT',1,2,2,'ACT 112','Intermediate Programming',3,'ACT 102',null),
  ('ACT',1,2,3,'ACT 113','Systems Administration',3,'ACT 103',null),
  ('ACT',1,2,4,'GE 4','Purposive Communication',3,null,null),
  ('ACT',1,2,5,'GE 5','Science, Technology, and Society',3,null,null),
  ('ACT',1,2,6,'GE 9','Life and Works of Rizal',3,null,null),
  ('ACT',1,2,7,'THEO 1B','New Testament',2,null,null),
  ('ACT',1,2,8,'PATHFIT 2','Physical Activities Towards Health & Fitness 2: Exercise-based Fitness Activities',2,'PATHFIT 1',null),
  ('ACT',1,2,9,'NSTP 12','National Service Training Program 2',3,null,null),
  ('ACT',2,1,1,'ACT 201','Information Management 1',3,'ACT 112',null),
  ('ACT',2,1,2,'ACT 202','Data Structures & Algorithms',3,'ACT 112',null),
  ('ACT',2,1,3,'ACT 203','Professional Issues in Computing',3,null,null),
  ('ACT',2,1,4,'ACT 204','Data Communications and Networking 2',3,'ACT 111',null),
  ('ACT',2,1,5,'ACT 205','Network Administration',3,null,null),
  ('ACT',2,1,6,'Course En 1','Course Enhancement 1',3,null,null),
  ('ACT',2,1,7,'THEO 2A','Christology',2,null,null),
  ('ACT',2,1,8,'PATHFIT 3','Physical Activities Towards Health & Fitness 3: Sports',2,'PATHFIT 1, PATHFIT 2',null),
  ('ACT',2,2,1,'ACT 211','Internship',6,null,null),
  ('ACT',2,2,2,'ACT 212','Network Security',3,'ACT 204',null),
  ('ACT',2,2,3,'THEO 2B','Mariology',2,null,null),
  ('ACT',2,2,4,'PATHFIT 4','Physical Activities Towards Health & Fitness 4: Dance',2,'PATHFIT 1, PATHFIT 2',null);

-- Subject kind from the code (the sheets don't label it): GE / GE EL / THEO = general education,
-- electives, PATHFIT, NSTP, internships (PRAC, ACT 211); everything else is a program subject.
insert into public.curriculum_subjects (curriculum_id, year_level, semester, code, title, units, kind, sort_order, standing_required)
select c.id, n.year_level, n.semester, n.code, n.title, n.units,
       (case
          when n.code ~* '^(IT|CS) EL ' then 'elective'
          when n.code ~* '^(GE|THEO) ' then 'general_education'
          when n.code ~* '^PATHFIT ' then 'pathfit'
          when n.code ~* '^NSTP ' then 'nstp'
          when n.code ~* '^PRAC$' or n.title = 'Internship' then 'internship'
          else 'major'
        end)::public.subject_kind,
       n.sort_order, n.standing
from new_subjects n
join public.programs p on p.code = n.program
join public.curricula c on c.program_id = p.id and c.is_active;

insert into public.subject_prerequisites (subject_id, prerequisite_id)
select s.id, pre.id
from new_subjects n
join public.programs p on p.code = n.program
join public.curricula c on c.program_id = p.id and c.is_active
join public.curriculum_subjects s on s.curriculum_id = c.id and s.code_key = public.norm_key(n.code)
cross join lateral unnest(string_to_array(n.prereqs, ',')) as req(code)
join public.curriculum_subjects pre on pre.curriculum_id = c.id and pre.code_key = public.norm_key(req.code)
where n.prereqs is not null;

-- Every listed prerequisite must have matched a subject of the same curriculum.
do $$
declare
  expected int;
  got int;
begin
  select coalesce(sum(array_length(string_to_array(prereqs, ','), 1)), 0) into expected from new_subjects where prereqs is not null;
  select count(*) into got from public.subject_prerequisites sp
    join public.curriculum_subjects s on s.id = sp.subject_id
    join public.curricula c on c.id = s.curriculum_id and c.is_active;
  if got <> expected then
    raise exception 'Prerequisites: expected %, linked %', expected, got;
  end if;
end $$;
