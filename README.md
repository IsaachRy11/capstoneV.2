# CCS Subject Monitoring System · Saint Joseph College

Subject, section and academic-standing monitor for the **College of Computer Studies, Saint Joseph College** (Maasin City, Southern Leyte). It covers the BSIT, BSCS and ACT programs.

## What it does

**Secretary**
- Department overview: students per program and year, seats filled per section, curriculum totals.
- Student registry: search, filter by year, program and standing, export to CSV, and add students. A new student is placed in their block section and enrolled in its classes.
- Student record: grades for every term, back subjects, encoding of midterm and final grades (INC and Dropped included), and a printable record.
- Section allocations: each subject's schedule, room and seats, enrolling or removing students, and section capacity.
- Curriculum: the official SJC checklist per program, plus adding subjects.

**Student**
- Home page: this semester's classes with schedule, room and midterm grades, plus back subjects if any.
- Their own academic record and their program's curriculum. Students can't see anyone else's data.

Regular/irregular standing and grade status are calculated in the database, not typed in. The app has light and dark themes.

## Stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 3, lucide-react |
| Backend | Supabase: Postgres with Row Level Security, and Auth |
| Hosting | Vercel |

## Project structure

```
src/
  features/        one folder per area: its page + the dialogs and parts only it uses
    account/       sign in, profile, settings
    dashboard/     secretary overview
    students/      student list, student record (grades, grade history)
    sections/      section allocations (class lists, enrollment, capacity)
    schedules/     weekly timetables, class-time editing
    curriculum/    official curriculum per program
    home/          student home
    progress/      student subject tracker
  components/      app-wide pieces: sidebar and top bar, menus, shared UI
  services/        every database query
  hooks/           data loading, section picker
  lib/             pure helpers: labels, schedules, progress, CSV, login
  context/         sign-in and theme
supabase/
  migrations/      schema, security rules, official SJC curriculum, enrollment, schedule and state rules
  seed.sql         demo students, sections, schedules and grades (not real people)
  tests/           database tests (in-memory Postgres, never touches Supabase)
scripts/           one-off tools (create student logins)
```

## Run it locally

1. Get the code: `git clone https://github.com/IsaachRy11/capstoneV.2.git` (first time), or `git pull` on `main` in an existing copy.
2. `npm install` (again after every pull that changes package.json).
3. Put the settings file next to package.json (never commit it; ask a team member for it):
   - `.env.rehearsal.local` for the test database (the one ccs-monitor-test.vercel.app uses, safe for demos), then `npm run dev:rehearsal` and open http://localhost:5175
   - or `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the live database, then `npm run dev` and open http://localhost:5173
4. `npm test` runs the unit and database tests (no settings file needed).

Sign-in uses Supabase Auth: students sign in with their student ID and the secretary with a staff ID (CCS-001). The database is already set up; [supabase/README.md](supabase/README.md) is only needed to build a new one.

## Data sources

- **Curriculum:** copied word for word from the official [SJC College of Computer Studies page](https://www.sjc.edu.ph/academics/college-of-computer-studies).
- **Students, sections, schedules, rooms and grades:** generated demo data for development.
