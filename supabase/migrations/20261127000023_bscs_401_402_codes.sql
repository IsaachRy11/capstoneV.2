-- BSCS 4th year: the printed checklist uses IT 401 / IT 402 for Automata Theory & Formal Languages and
-- Analytics Application. The CCS office confirmed (Nov 23 2026) that in the BSCS program these are CS 401 / CS 402.
-- Only the active BSCS curriculum changes; BSIT keeps its own IT 401 / IT 402. code_key is generated from code.
update public.curriculum_subjects cs
set code = case cs.code when 'IT 401' then 'CS 401' else 'CS 402' end
from public.curricula c
join public.programs p on p.id = c.program_id
where cs.curriculum_id = c.id
  and p.code = 'BSCS'
  and c.is_active
  and cs.code in ('IT 401', 'IT 402');
