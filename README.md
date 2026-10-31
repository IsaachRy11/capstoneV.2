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
supabase/
  migrations/      schema, access rules, official SJC curriculum
  seed.sql         demo students, sections, schedules and grades (not real people)
  README.md        how the database fits together and how to apply it
src/
  services/        every database query (catalog, students, sections)
  context/         AuthContext (Supabase Auth + role), ThemeContext (light/dark)
  components/      AppShell (sidebar, top bar) and shared UI pieces
  pages/           Login, Dashboard, StudentHome, Students, StudentRecord, Sections, Curriculum
  hooks/ lib/      data-loading hook, display helpers
```

## Run it locally

1. `npm install`
2. Create `.env` in the project root (never commit it):
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<publishable key>
   ```
3. Set up the database once by following [supabase/README.md](supabase/README.md).
4. `npm run dev`, then open http://localhost:5173

Sign-in uses Supabase Auth. An account gets its role from a matching email in the `secretaries` or `students` table.

## Data sources

- **Curriculum:** copied word for word from the official [SJC College of Computer Studies page](https://www.sjc.edu.ph/academics/college-of-computer-studies).
- **Students, sections, schedules, rooms and grades:** generated demo data for development.
