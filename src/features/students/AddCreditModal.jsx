import { useState } from "react";
import { addCredits } from "../../services/students";
import { getCurriculum, getPrerequisites } from "../../services/catalog";
import { useAsync } from "../../hooks/useAsync";
import { FormError, LoadingState, Modal } from "../../components/ui";
import { sumUnits, yearSemesterLabel } from "../../lib/format";
import { buildProgress, creditable } from "../../lib/progress";

// Pick the curriculum subjects the school has accepted. Only subjects not passed, not credited and not being taken
// now are listed. Nothing is saved until the Credit button is pressed.
export default function AddCreditModal({ student, history, credits, onClose, onSaved }) {
  const [picked, setPicked] = useState(() => new Set());
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data, error: loadError, loading } = useAsync(async () => {
    const [curriculum, prerequisites] = await Promise.all([getCurriculum(student.program_code), getPrerequisites()]);
    return creditable(buildProgress({ curriculum, history, prerequisites, credits }).subjects);
  }, [student.id]);

  const needle = filter.trim().toLowerCase();
  const shown = (data || []).filter((s) => !needle || `${s.code} ${s.title}`.toLowerCase().includes(needle));
  const groups = new Map();
  for (const s of shown) {
    const key = yearSemesterLabel(s.year_level, s.semester);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const chosen = (data || []).filter((s) => picked.has(s.id));
  const toggle = (id) => setPicked((old) => {
    const next = new Set(old);
    if (!next.delete(id)) next.add(id);
    return next;
  });
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await addCredits(student.id, [...picked]);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={`Add credited subjects for ${student.full_name}`} onClose={onClose} width="max-w-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !chosen.length}>
          {busy ? "Saving…" : chosen.length ? `Credit ${chosen.length} ${chosen.length === 1 ? "subject" : "subjects"} · ${sumUnits(chosen)} units` : "Credit subjects"}
        </button>
      </>}>
      <p className="text-[14px] text-ink-2">Pick only subjects the school has accepted. A credited subject counts as passed: it fills its place in the curriculum and opens the subjects that require it. No grade is recorded.</p>
      <label htmlFor="credit-find" className="sr-only">Find a subject</label>
      <input id="credit-find" className="field mt-3" placeholder="Course No. or description" value={filter} onChange={(e) => setFilter(e.target.value)} autoComplete="off" />
      {loading && <div className="mt-3"><LoadingState variant="list" /></div>}
      {loadError && <div className="mt-3"><FormError error="Couldn't load the curriculum. Close this and try again." /></div>}
      {data && shown.length === 0 && <p className="mt-4 text-[14px] text-ink-3">{needle ? "No subject matches." : "Every subject is already passed, credited or being taken."}</p>}
      <div className="mt-3 flex flex-col gap-4">
        {[...groups].map(([label, list]) => (
          <fieldset key={label}>
            <legend className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</legend>
            <ul className="overflow-hidden rounded-lg border border-line">
              {list.map((s) => (
                <li key={s.id} className="border-b border-line-2 last:border-0">
                  <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-[14px]">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                    <span className="min-w-0 flex-1"><span className="font-mono text-[13px] text-accent">{s.code}</span> {s.title}</span>
                    <span className="shrink-0 text-[13px] text-ink-3">{Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
