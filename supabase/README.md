# Database

| File | What it is | Real or demo |
|---|---|---|
| `migrations/…01_core_schema.sql` | Tables, grade rules, read-only views | Structure |
| `migrations/…02_rls.sql` | Who can read/write what (Row Level Security) + links logins to people by email | Structure |
| `migrations/…03_sjc_curriculum.sql` | First BSIT, BSCS, ACT curricula, from sjc.edu.ph (now inactive) | Official (old) |
| `migrations/…12_curriculum_ay_2024_2025.sql` | Active BSIT, BSCS, ACT (Networking) curricula, effective AY 2024-2025, with prerequisites and year-standing rules, from the printed CCS checklists | **Official** |
| `seed.sql` | 100 students (10 per program per year level), sections, rooms, weekly schedules, grades, demo logins | **Made up** |
| `legacy/rename_legacy_tables.sql` | Renames the old prototype tables to `legacy_*` (keeps their data; run by hand) | — |

## How the data fits together

```
programs ─ curricula ─ curriculum_subjects ─ subject_prerequisites
school_terms ─ sections ─ class_offerings ─ class_meetings (schedule)
students ─ registrations (section per term)
         └ enrollments (one per class taken; midterm/final grade, status)
secretaries (the secretary role; students are the other role)
```

Views the app reads: `v_student_overview` (standing, section, flags), `v_enrollment_details`
(grade history), `v_student_deficiencies`, `v_prerequisite_violations`, `v_section_capacity`.
Regular/irregular is **computed**, never typed in.

## Apply to your Supabase project (once)

1. Dashboard → SQL Editor → run `legacy/rename_legacy_tables.sql`. This renames, not deletes, so no backup is needed.
2. Run the three migration files in order, then `seed.sql`.
4. Dashboard → Authentication → Users → **Add user** for
   `ccs-001@staff.ccs-monitor.test` (the secretary signs in with secretary ID CCS-001) and `demo.student@ccs-monitor.test` (pick passwords).
   They link to their records automatically.

Later changes go in a **new** migration file (never edit an applied one).
With the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

## Changing a sign-in email

Supabase confirms an email change by mailing a link to the new address. That needs:
1. **Custom SMTP** (Dashboard → Authentication → Emails → SMTP settings), for example a Gmail app password or Resend.
   The built-in mailer only sends a few emails an hour, and only to project team members.
2. A real inbox. The demo `@ccs-monitor.test` addresses can't receive mail.

Until then, change an email by hand in Dashboard → Authentication → Users, then update the same email in the
`secretaries` or `students` table so the account stays linked.

## Still needed from SJC
- **Prerequisites**: from the printed AY 2024-2025 checklists (migration 0012). Year-standing rules ("4th yr standing") are in `curriculum_subjects.standing_required`. Two BSCS printing slips are noted in that migration (CS 312 lists a non-existent CS 308; the 3rd-year elective is printed as CS EL 2).
