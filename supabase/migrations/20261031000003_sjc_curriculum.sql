-- CCS Monitor · official SJC CCS curriculum
-- Source: https://www.sjc.edu.ph/academics/college-of-computer-studies ("Curriculum Checklist"), read 2026-10-31.
-- Codes, titles and units are copied verbatim. The source lists no prerequisites and no lecture/lab split,
-- so subject_prerequisites is left empty here on purpose; add the official ones in a later migration.

insert into public.programs (code, name, duration_years, description) values
  ('BSCS', 'Bachelor of Science in Computer Science',     4, null),
  ('BSIT', 'Bachelor of Science in Information Technology', 4, null),
  ('ACT',  'Associate in Computer Technology',             2, '2-year practical diploma covering Networking or App Development tracks.');

insert into public.curricula (program_id, title, effective_school_year, source_url)
select p.id,
       case p.code when 'ACT' then 'Saint Joseph College • 2-Year Practical Technical Program'
                   else 'Saint Joseph College • Complete 4-Year Academic Curriculum' end,
       '2026-2027',
       'https://www.sjc.edu.ph/academics/college-of-computer-studies'
from public.programs p;

with rows (program, year_level, semester, sort_order, code, title, units) as (values
  -- ── BSCS ──
  ('BSCS',1,1,1,'CS 101','Introduction to Computing',3),
  ('BSCS',1,1,2,'CS 102','Computer Programming 1',3),
  ('BSCS',1,1,3,'GE 1','Understanding the Self',3),
  ('BSCS',1,1,4,'GE 2','Readings in Philippine History',3),
  ('BSCS',1,1,5,'GE 3','Mathematics in the Modern World',3),
  ('BSCS',1,1,6,'PATHFIT 1','Movement Competency Training',2),
  ('BSCS',1,1,7,'NSTP 11','National Service Training Program 1',3),
  ('BSCS',1,2,1,'CS 103','Computer Programming 2',3),
  ('BSCS',1,2,2,'CS 104','Discrete Structures 1',3),
  ('BSCS',1,2,3,'GE 4','Purposive Communication',3),
  ('BSCS',1,2,4,'GE 5','The Contemporary World',3),
  ('BSCS',1,2,5,'GE 6','Art Appreciation',3),
  ('BSCS',1,2,6,'PATHFIT 2','Exercise-based Fitness Activities',2),
  ('BSCS',1,2,7,'NSTP 12','National Service Training Program 2',3),
  ('BSCS',2,1,1,'CS 201','Data Structures and Algorithms',3),
  ('BSCS',2,1,2,'CS 202','Object-Oriented Programming',3),
  ('BSCS',2,1,3,'CS 203','Discrete Structures 2',3),
  ('BSCS',2,1,4,'GE 7','Science, Technology, and Society',3),
  ('BSCS',2,1,5,'GE 8','Ethics',3),
  ('BSCS',2,1,6,'PATHFIT 3','Sports and Dance Competency',2),
  ('BSCS',2,2,1,'CS 204','Algorithms and Complexity',3),
  ('BSCS',2,2,2,'CS 205','Architecture and Organization',3),
  ('BSCS',2,2,3,'CS 206','Information Management (Database)',3),
  ('BSCS',2,2,4,'GE 9','Life and Works of Rizal',3),
  ('BSCS',2,2,5,'PATHFIT 4','Fitness for Outdoor and Adventure',2),
  ('BSCS',3,1,1,'CS 301','Operating Systems',3),
  ('BSCS',3,1,2,'CS 302','Software Engineering 1',3),
  ('BSCS',3,1,3,'CS 303','Automata Theory and Formal Languages',3),
  ('BSCS',3,1,4,'CS 304','Artificial Intelligence Fundamentals',3),
  ('BSCS',3,2,1,'CS 305','Software Engineering 2 (Capstone 1)',3),
  ('BSCS',3,2,2,'CS 306','Programming Languages Principles',3),
  ('BSCS',3,2,3,'CS 307','Networks and Communications',3),
  ('BSCS',3,2,4,'CS Elective 1','CS Track Elective 1',3),
  ('BSCS',4,1,1,'CS 401','CS Capstone Project 2',3),
  ('BSCS',4,1,2,'CS 402','Social Issues and Professional Practice',3),
  ('BSCS',4,1,3,'CS Elective 2','CS Track Elective 2',3),
  ('BSCS',4,2,1,'CS 403','Practicum / Industry Internship (500 hrs)',6),
  -- ── BSIT ──
  ('BSIT',1,1,1,'IT 101','Introduction to Computing',3),
  ('BSIT',1,1,2,'IT 102','Computer Programming 1',3),
  ('BSIT',1,1,3,'GE 1','Understanding the Self',3),
  ('BSIT',1,1,4,'GE 2','Readings in Philippine History',3),
  ('BSIT',1,1,5,'GE 3','Mathematics in the Modern World',3),
  ('BSIT',1,1,6,'PATHFIT 1','Movement Competency Training',2),
  ('BSIT',1,1,7,'NSTP 11','National Service Training Program 1',3),
  ('BSIT',1,2,1,'IT 103','Computer Programming 2',3),
  ('BSIT',1,2,2,'IT 104','Data Communications and Networking',3),
  ('BSIT',1,2,3,'GE 4','Purposive Communication',3),
  ('BSIT',1,2,4,'GE 5','The Contemporary World',3),
  ('BSIT',1,2,5,'PATHFIT 2','Exercise-based Fitness Activities',2),
  ('BSIT',1,2,6,'NSTP 12','National Service Training Program 2',3),
  ('BSIT',2,1,1,'IT 201','Data Structures and Algorithms',3),
  ('BSIT',2,1,2,'IT 202','Object-Oriented Programming',3),
  ('BSIT',2,1,3,'IT 203','Web Development 1',3),
  ('BSIT',2,1,4,'GE 7','Science, Technology, and Society',3),
  ('BSIT',2,1,5,'GE 8','Ethics',3),
  ('BSIT',2,1,6,'PATHFIT 3','Sports and Dance Competency',2),
  ('BSIT',2,2,1,'IT 204','Information Management & Database',3),
  ('BSIT',2,2,2,'IT 205','Integrative Programming & Technologies',3),
  ('BSIT',2,2,3,'IT 206','Network Administration',3),
  ('BSIT',2,2,4,'GE 9','Life and Works of Rizal',3),
  ('BSIT',2,2,5,'PATHFIT 4','Fitness for Outdoor and Adventure',2),
  ('BSIT',3,1,1,'IT 301','Systems Analysis and Design',3),
  ('BSIT',3,1,2,'IT 302','Mobile Applications Development',3),
  ('BSIT',3,1,3,'IT 303','Information Assurance and Security 1',3),
  ('BSIT',3,1,4,'IT Elective 1','IT Track Elective 1',3),
  ('BSIT',3,2,1,'IT 304','Capstone Project 1',3),
  ('BSIT',3,2,2,'IT 305','Information Assurance and Security 2',3),
  ('BSIT',3,2,3,'IT 306','System Administration and Maintenance',3),
  ('BSIT',3,2,4,'IT Elective 2','IT Track Elective 2',3),
  ('BSIT',4,1,1,'IT 401','Capstone Project 2',3),
  ('BSIT',4,1,2,'IT 402','Social and Professional Issues',3),
  ('BSIT',4,1,3,'IT Elective 3','IT Track Elective 3',3),
  ('BSIT',4,2,1,'IT 403','IT Internship / On-the-Job Training (486 hrs)',6),
  -- ── ACT ──
  ('ACT',1,1,1,'ACT 101','Introduction to Computing & Hardware',3),
  ('ACT',1,1,2,'ACT 102','Computer Logic & Programming 1',3),
  ('ACT',1,1,3,'GE 1','Understanding the Self',3),
  ('ACT',1,1,4,'GE 3','Mathematics in the Modern World',3),
  ('ACT',1,1,5,'PATHFIT 1','Movement Competency Training',2),
  ('ACT',1,1,6,'NSTP 11','National Service Training Program 1',3),
  ('ACT',1,2,1,'ACT 103','Computer Programming 2',3),
  ('ACT',1,2,2,'ACT 104','PC Maintenance & Troubleshooting',3),
  ('ACT',1,2,3,'GE 4','Purposive Communication',3),
  ('ACT',1,2,4,'PATHFIT 2','Fitness Activities',2),
  ('ACT',1,2,5,'NSTP 12','National Service Training Program 2',3),
  ('ACT',2,1,1,'ACT 201','Web Development Essentials',3),
  ('ACT',2,1,2,'ACT 202','Networking Fundamentals',3),
  ('ACT',2,1,3,'ACT 203','Database Management Systems',3),
  ('ACT',2,1,4,'PATHFIT 3','Sports Competency',2),
  ('ACT',2,2,1,'ACT 204','Systems Integration Project',3),
  ('ACT',2,2,2,'ACT 205','Technical Internship (300 Hours)',6),
  ('ACT',2,2,3,'PATHFIT 4','Outdoor Fitness',2)
)
insert into public.curriculum_subjects (curriculum_id, year_level, semester, sort_order, code, title, units, kind)
select c.id, r.year_level, r.semester, r.sort_order, r.code, r.title, r.units,
       (case
          when r.title ~* '(internship|practicum|on-the-job)' then 'internship'
          when r.code ~* 'elective'                          then 'elective'
          when r.code ~* '^GE '                              then 'general_education'
          when r.code ~* '^PATHFIT'                          then 'pathfit'
          when r.code ~* '^NSTP'                             then 'nstp'
          else 'major'
        end)::public.subject_kind
from rows r
join public.programs p  on p.code = r.program
join public.curricula c on c.program_id = p.id and c.is_active;
