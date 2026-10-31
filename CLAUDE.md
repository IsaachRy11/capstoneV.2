# CCS Subject Monitoring System

Subject monitoring system for Saint Joseph College, College of Computer Studies (BSIT, BSCS, ACT).
Tracks students, enrolment per section, grades, back subjects and prerequisite compliance.

## Stack
- React 19 + Vite 8, React Router 7, Tailwind CSS 3 (config in `tailwind.config.js`), lucide-react icons
- Supabase (Postgres) via `src/lib/supabase.js`, env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env` (never commit)
- Deployed on Vercel (`vercel.json` rewrites all routes to `index.html`)

## Commands
- `npm run dev` — dev server on :5173. **Restart it after changing `tailwind.config.js`**: Tailwind doesn't reload its config, so new theme classes (`bg-surface`, `text-ink-3`, `border-line`…) silently don't apply and the UI looks flat/white.
- Logged-in visual checks: demo passwords are in `.env.local` (gitignored; `DEMO_SECRETARY_PASSWORD`, `DEMO_STUDENT_PASSWORD`). Start a fresh `npx vite --port 5174 --strictPort`, sign in with playwright-core + Edge (`#email`, `#password`, submit, wait for `aside nav`), screenshot, then stop the 5174 server. Never print the passwords.
- Visual check without Python: Edge is installed; `playwright-core` with `executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"` can screenshot pages and read computed styles (install it in the scratchpad, not the project).
- `npm run build` — production build (run before saying a change works)
- `npm run lint`
- `npm test` — Vitest unit tests for `src/lib` (progress, grades, schedules, CSV). Add a test when changing that logic.

## Roles (exactly two — no adviser/teacher/department roles)
- `secretary` — full admin: add students, encode grades, edit section capacity, edit curriculum
- `student` — read-only, own record only. Never render another student's data for this role.
- Failed/INC/dropped info is shown ONLY inside a student's record and as a standing badge in the student list. No "needs attention"/concern/flag widgets on dashboards.

## Code layout
- `src/services/*.js` — every Supabase query lives here (catalog, students, sections). Pages never call `supabase` directly except small one-off reads.
- `src/hooks/useAsync.js` — `{ data, error, loading, reload }` for page data. `src/lib/format.js` — display helpers (labels, grades, schedules, CSV).
- `src/context/AuthContext.jsx` — Supabase Auth; role comes from `secretaries` / `students` rows linked by `auth_user_id`. `ThemeContext.jsx` — light/dark via `data-theme` on `<html>`.
- `src/components/AppShell.jsx` (sidebar nav, top bar), `TermCalendar.jsx` (term chip → month calendar from `school_terms` dates only; never invent events), `UserMenu.jsx` (top-right avatar menu: Profile, Settings, Appearance toggle, Sign out — keep it to items that fit this app), `ui.jsx` (Badge, PageHeader, Modal, Loading/Error/Empty states).
- `src/lib/progress.js` — per-subject curriculum progress (passed / taking now / back subject / not taken), next-semester subjects, midterm early warnings. Pure functions; used by the student tracker and home page.
- Product direction: the student finds out first (tracker, midterm warnings, retake hints) and then goes to the CCS office. Don't build secretary-side "notify the student" or flag widgets.
- `src/App.jsx` — routes. Secretary: `/`, `/students`, `/students/:id`, `/sections`, `/schedules` (section timetables, current semester only), `/curriculum`. Student: `/`, `/schedule` (weekly timetable), `/progress` (Subject tracker), `/record`, `/curriculum`. Both: `/profile`, `/settings` (theme + change password).

## Data rules
- All counts, capacities, codes and sections come from Supabase via `src/services`. No hard-coded figures or seed data in React.
- Normalize identifiers before comparing: `s.replace(/\s+/g, '').toLowerCase()` (subject codes, section names).
- Admin controls are gated by role in the UI AND must be enforced by Supabase RLS, not just hidden.
- Grade scale: 1.00 best … 3.00 is still passing, anything past 3.00 (5.00) fails; INC and Dropped are statuses, not grades. Midterm warnings: > 3.00 "Failing at midterm", 2.75–3.00 "Close to the passing line" (still passing). Show `<GradeLegend />` (one legend for midterm and final grades) wherever grades appear for students. Grade tables use separate Midterm and Final columns; never a combined "Grade / note".
- Grade colors mean the same thing everywhere: red = failing/failed, green = passed, yellow = close to the passing line only, grey = INC or Dropped. Always pair a color with words. Legends use the colored-line swatch from `GradeLegend`.
- UI reviews: Vercel's Web Interface Guidelines (https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) are a useful checklist; this file's conventions win where they differ (sentence case, not Title Case).
- Every number on screen is computed from Supabase; label counts with their unit ("6 subjects", "17 units"), never a bare number.
- Wording: say "Student type" (Student / Transferee / Shiftee / Returnee), never "New student"; say "Room", not "Home room"; never show "Major" (CCS has no majors; subject kind is inferred from the code).

## Database (`supabase/`, see `supabase/README.md`)
- Schema, RLS and the official SJC curriculum are migrations in `supabase/migrations/`. Demo students/sections/schedules/grades are in `supabase/seed.sql`.
- Curriculum is official data (sjc.edu.ph): never invent subjects, units or prerequisites. Only students, schedules and rooms may be made up.
- Standing (regular/irregular) is computed by the `v_student_overview` view; grade → status is a DB trigger. Don't recompute these in React.
- Multi-step writes go through database functions (one transaction): `add_student()`, `save_grades()` via `supabase.rpc`. Enrollment capacity and schedule clashes are enforced by a trigger (friendly error messages come back from the DB). Every grade change is logged in `grade_changes` / `v_grade_changes` (secretary only).
- RLS helpers live in the `private` schema (`private.is_secretary()`, `private.current_student_id()`), always wrapped as `(select …)` in policies. Index every new foreign key.
- Schema changes = a new migration file; never edit an applied one.

## Known state (Oct 31 2026)
- Schema, curriculum and seed are LIVE on the Supabase project (migrations 0001–0004 recorded). Old prototype tables kept as `legacy_*` with RLS on (locked). The user is on Supabase's free plan: no dashboard backups, no Docker; keep data by renaming, not dropping.
- React app rebuilt on the new schema with real Supabase Auth and both themes (Oct 31 2026). Demo logins: demo.secretary@ccs-monitor.test, demo.student@ccs-monitor.test (passwords set by the user, unknown to Claude).
- Writing to the live DB (db push, migrations) needs the user's explicit OK; the auto-mode classifier blocks it otherwise. Read-only `npx supabase db query --linked` checks are fine.
- Prerequisites: not in the official source; `subject_prerequisites` is empty until the user provides the official list.

## UI conventions (redesign direction)
- Orange is a signal: primary action, active nav, items needing a decision. No gradients.
- Colors: brand `#C2410C`, brand-strong `#9A3412`, brand-tint `#FFF1E8`, ink `#1A1714`, ink-muted `#57534E`, line `#E7E5E0`, ground `#F7F6F3`, surface `#FFFFFF`.
- Status: regular/passed green `#166534` on `#ECFDF3`; irregular/warning `#92400E` on `#FFF4E0`; failed `#B91C1C` on `#FEF2F2`; enrolled `#1E40AF` on `#EFF4FF`.
- Fonts: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (codes, IDs, counts only).
- Radius 8px controls, 12px cards; 1px borders; text ≥ 12px; clickable things are `<button>` or `<a>`, never `<div onClick>`.
- Dark theme ("ink-navy"): NO orange anywhere (avoid the black+orange look). Accent periwinkle: text/links `#8FA8FF`, buttons `#4361D8` (hover `#3651C0`), active tint `rgba(143,168,255,.14)` with text `#C3D0FF`; ground `#0E1320`, surface `#151B2B`, surface-2 `#1A2133`, line `#263049`, ink `#E6EAF2`, ink-muted `#B4BCCD`, ink-subtle `#97A1B6`. Implement both themes as CSS variables (see the canvas Dashboard artboards), toggled by a button in the top bar.
- Use the shared classes in `src/index.css` (`.btn`, `.btn-primary/secondary/danger`, `.icon-btn`, `.card`, `.field`, `.badge` + `.tone-*`, `.data-table`, `.bar`, `.seg`, `.nav-link`) and the Tailwind theme colors (`bg-surface`, `text-ink-2`, `border-line`, `text-accent`…). Never hard-code hex colors in components; add a CSS variable for both themes instead.

## Skills (use automatically — the user won't name them)
Project skills live in `.claude/skills/` (`.agents/skills/` is an unused archive; Claude Code doesn't read it).
- **frontend-design** — load for ANY UI/UX request, however small: colors, spacing, layout, "make this look better", "this button looks off", new components or pages. Follow the UI conventions above; they win over the skill's generic advice.
- **webapp-testing** — after a UI or behavior change, use it to check the page in the running app (`npm run dev`, :5173). Needs Python + Playwright; if missing, say so and fall back to `npm run build`.
- **clarify-request** — the user writes fast and casually; at the start of any non-trivial request, open with a 2–5 line brief (goal, scope, done when), fill gaps with sensible defaults, then do the work.
- **find-skills** — when a request falls outside what these cover (e.g. testing setup, deployment, Supabase, accessibility audits), search for a skill first. Only suggest well-known sources (anthropics, vercel-labs, 1K+ installs) and ask before installing.

## Working here
- Keep changes scoped to the request; don't refactor unrelated pages.
- Don't add new dependencies without asking.
