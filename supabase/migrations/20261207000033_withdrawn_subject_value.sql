-- A subject can be "Withdrawn" (user decision, Nov 26 2026): the student won't take it and won't pay for it. "Dropped"
-- keeps its own meaning (counted against the student). The new value is added on its own, because Postgres only
-- lets a new enum value be used after the transaction that added it.
alter type public.enrollment_status add value if not exists 'withdrawn';
