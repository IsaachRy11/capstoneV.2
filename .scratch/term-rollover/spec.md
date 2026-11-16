# Starting a new semester, summer or school year

Status: built (migration 0017 + School year page), not applied to the live database yet.

## What the secretary does

Sidebar > **School year** (computer only; phones show a note).

1. **Prepare** the next term: pick it (2nd semester, summer, or the new school year), enter its first and last day,
   press *Prepare term*. The system copies the section structure of the latest semester (names, seats, rooms), gives
   each section its year's subjects for that semester from the curriculum, and copies class times from the last time
   that semester ran. Students see nothing. *Discard* removes it to start over.
2. **Check**: set the unit limit (default 30, placeholder) and press *Check*. The system runs the real start and
   rolls it back, so the summary is exactly what will happen: students placed, classes added, carried subjects,
   who moves up, stays, graduates, and lists of what it couldn't do.
3. **Start**: one confirm. The whole site switches at once; it is all or nothing.
4. **Undo** (shown after a start): puts the previous term back, removes the new term's classes and registrations,
   and restores every student's year level and status. Only while the new term has no grade or status.

For a new school year, the secretary also enters the school's printed calendar on the Calendar page (the school
issues it every year, so it is never copied).

## Rules (user decisions, Nov 2026; to be confirmed by the CCS office)

All of them live in `private.run_term_start` (migration `20261121000017_term_rollover.sql`).

- **Graduation**: every subject of the student's curriculum passed. Checked whenever a term starts, so summer counts.
- **Moving up** (new school year only): every active student moves up one year, with or without failures, except in
  their program's last year (4th; 2nd for ACT). They stay there until everything is passed.
- **Who carries on**: active students registered in some term of the current school year. Others (on leave) are
  placed by hand.
- **Section**: same letter in the new year (BSIT 1-S -> BSIT 2-S); if that letter doesn't exist, the section of
  their program and year with the most free seats.
- **Subjects**: their section's subjects they haven't passed are added. **Carried subjects** (earlier years, same
  semester, not passed) are NOT enrolled automatically (user decision): the check and the start list them as
  "Carried subjects to place", and the secretary enrolls each one (Section allocations; bulk enroll is planned).
- **Prerequisites**: a subject whose prerequisite isn't passed is not added; the student takes the prerequisite
  first. Same for year standing ("3rd-year standing"). Enforced for the secretary by the database, with no override
  (`enrollments_prerequisite_check`): enrolling by hand is refused with "This subject needs IT 306 passed first".
  Writes with no signed-in secretary (the seed) are not checked.
- **No grade entered**: a class with no final grade is treated like any subject that isn't passed (carried over,
  and subjects that need it wait for it). Nothing special is done for it.
- **Unit limit**: subjects past the limit are left out and listed.

## Holes and how they are handled

| Hole | Handled |
| --- | --- |
| Carried subject clashes with the new year's classes | Not placed automatically: listed for the secretary, and the clash rule still blocks a bad pick |
| Carried subjects need seats in other sections | Same: the secretary picks the class |
| Graduation isn't just "finished 4th year" (summer capstone/thesis) | Graduation = all curriculum subjects passed |
| Backlogs grow over the years | Carried subjects come from every earlier year, not only last year |
| Prerequisites | Not added until passed; listed with what they need |
| INC and Dropped | Count as not passed, so they carry over |
| Grades not encoded yet when the term starts | Treated as not passed, like every other subject without a passed grade |
| Summer | Summer is a term like the others; only sections with summer subjects are prepared |
| Students who didn't enroll this school year | Not moved; placed by hand |
| Too many students for a year's sections | Fallback section, then the check lists anyone without a section or seat |
| Inactive, dropped, shifted out, graduated | Never moved or placed |
| A start goes wrong | All or nothing, plus Undo until grades are entered |
| Old records | Untouched: every term keeps its sections, classes and grades |
| Cached pages after the switch | Every cache is cleared and the page reloads |

## Still open

- Editing seats and class times of a prepared term **before** it starts: the editors only work on the current term,
  so the secretary adjusts them right after the start (before grades exist). A term picker for the editors would
  remove this.
- The unit limit and the moving-up rule need the CCS office's confirmation (both are one place in the code).
- A new curriculum issued by the school: students keep their curriculum; moving a batch to a new one isn't built.
- Bulk add students (CSV) and bulk enroll (several students into one class): requested, not built yet. One at a
  time (Create student, Enroll) still works.
- A warning on the enroll box before adding a student whose prerequisite isn't passed (the database already refuses;
  the message appears after the attempt).
- Credited subjects for transferees and shiftees.
- The live 1st semester (SY 2026-2027) has no final grades in the demo data, so starting the 2nd semester live would
  hold back most prerequisite-dependent subjects until grades are encoded.
- The unit limit is saved per start (the page's field). Remembering it as a school setting is not built yet.
