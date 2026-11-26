import { useState } from "react";
import { addCredits } from "../../services/students";
import { getCurriculum, getPrerequisites } from "../../services/catalog";
import { useAsync } from "../../hooks/useAsync";
import { Badge, FormError, LoadingState, Modal } from "../../components/ui";
import { GRADE_OPTIONS, sumUnits, yearSemesterLabel } from "../../lib/format";
import { buildProgress, creditable, isCredited } from "../../lib/progress";

const BLANK = { midterm: "", final: "" };

// Pick the subjects taken before and enter their grades, like Encode grades. The final grade decides: 1.00 to 3.00
// is credited, 5.00 is not. Only subjects not passed, not already listed and not being taken now are offered.
// Nothing is saved until the Save button is pressed.
export default function AddCreditModal({ student, history, credits, onClose, onSaved }) {
  const [picked, setPicked] = useState(() => new Map()); // subject id → { midterm, final }
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data, error: loadError, loading } = useAsync(async () => {
    const [curriculum, prerequisites] = await Promise.all([getCurriculum(student.program_code), getPrerequisites()]);
    const listed = new Set(credits.map((c) => c.curriculum_subject_id));
    return creditable(buildProgress({ curriculum, history, prerequisites, credits }).subjects).filter((s) => !listed.has(s.id));
  }, [student.id]);

  const needle = filter.trim().toLowerCase();
  const shown = (data || []).filter((s) => !needle || picked.has(s.id) || `${s.code} ${s.title}`.toLowerCase().includes(needle));
  const groups = new Map();
  for (const s of shown) {
    const key = yearSemesterLabel(s.year_level, s.semester);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  const chosen = (data || []).filter((s) => picked.has(s.id));
  const waiting = chosen.filter((s) => picked.get(s.id).final === "").length;
  const credited = chosen.filter((s) => picked.get(s.id).final !== "" && isCredited({ final_grade: picked.get(s.id).final }));
  const notCredited = chosen.length - waiting - credited.length;

  const toggle = (id) => setPicked((old) => {
    const next = new Map(old);
    if (!next.delete(id)) next.set(id, BLANK);
    return next;
  });
  const set = (id, key, value) => setPicked((old) => new Map(old).set(id, { ...old.get(id), [key]: value }));
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await addCredits(student.id, chosen.map((s) => {
        const g = picked.get(s.id);
        return { subjectId: s.id, midterm: g.midterm === "" ? null : Number(g.midterm), final: Number(g.final) };
      }));
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const gradeSelect = (s, key, label) => (
    <label className="flex items-center gap-2 text-[13px] text-ink-2">{label}
      <select aria-label={`${label} grade for ${s.code}`} className="field h-9 w-[96px] pl-3 pr-8 font-mono text-[13px]" value={picked.get(s.id)[key]} onChange={(e) => set(s.id, key, e.target.value)}>
        <option value="">—</option>
        {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g.toFixed(2)}</option>)}
      </select>
    </label>
  );

  return (
    <Modal title={`Subjects ${student.full_name} took before`} onClose={onClose} width="max-w-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !chosen.length || waiting > 0}>
          {busy ? "Saving…" : chosen.length ? `Save ${chosen.length} ${chosen.length === 1 ? "subject" : "subjects"}` : "Save subjects"}
        </button>
      </>}>
      <p className="text-[14px] text-ink-2">Tick each subject and enter its grades. A final grade of 1.00 to 3.00 is <strong className="text-ink">Credited</strong>. A final grade of 5.00 is <strong className="text-ink">NC</strong> (No Credit).</p>
      <label htmlFor="credit-find" className="sr-only">Find a subject</label>
      <input id="credit-find" className="field mt-3" placeholder="Course No. or description" value={filter} onChange={(e) => setFilter(e.target.value)} autoComplete="off" />
      {loading && <div className="mt-3"><LoadingState variant="list" /></div>}
      {loadError && <div className="mt-3"><FormError error="Couldn't load the curriculum. Close this and try again." /></div>}
      {data && shown.length === 0 && <p className="mt-4 text-[14px] text-ink-3">{needle ? "No subject matches." : "Every subject is already passed, listed or being taken."}</p>}
      <div className="mt-3 flex flex-col gap-4">
        {[...groups].map(([label, list]) => (
          <fieldset key={label}>
            <legend className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</legend>
            <ul className="overflow-hidden rounded-lg border border-line">
              {list.map((s) => {
                const g = picked.get(s.id);
                return (
                  <li key={s.id} className="border-b border-line-2 last:border-0">
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-[14px]">
                      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={!!g} onChange={() => toggle(s.id)} />
                      <span className="min-w-0 flex-1"><span className="font-mono text-[13px] text-accent">{s.code}</span> {s.title}</span>
                      <span className="shrink-0 text-[13px] text-ink-3">{Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
                    </label>
                    {g && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface-2 px-3 py-2.5 pl-9">
                        {gradeSelect(s, "midterm", "Midterm")}
                        {gradeSelect(s, "final", "Final")}
                        <span role="status">
                          {g.final === "" ? <span className="text-[13px] text-ink-3">Enter the final grade</span>
                            : isCredited({ final_grade: g.final }) ? <Badge tone="ok" dot>Credited</Badge>
                            : <Badge tone="bad" dot>NC</Badge>}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      {chosen.length > 0 && (
        <p role="status" className="mt-3 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">When saved: </span>
          {credited.length} credited ({sumUnits(credited)} units){notCredited ? ` · ${notCredited} NC` : ""}{waiting ? ` · ${waiting} still need a final grade` : ""}
        </p>
      )}
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
