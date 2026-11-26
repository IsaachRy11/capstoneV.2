import { useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { addSummerSubject, getSummerCandidates } from "../../services/sections";
import { EmptyState, ErrorState, FormError, LoadingState, Modal } from "../../components/ui";
import { yearSemesterLabel } from "../../lib/format";

// Summer: open one more subject of this program for students who have to retake it. The subjects that students
// failed (or left INC / dropped) and have not passed since are listed first, with how many students owe each one.
export default function SummerSubjectModal({ section, onClose, onAdded }) {
  const list = useAsync(() => getSummerCandidates(section.id), [section.id], `summer-candidates-${section.id}`);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const add = async (c) => {
    setBusy(c.subject_id);
    setError("");
    try {
      await addSummerSubject(section.id, c.subject_id);
      onAdded();
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  const key = q.trim().toLowerCase();
  const rows = (list.data || []).filter((c) => !key || `${c.code} ${c.title}`.toLowerCase().includes(key));

  return (
    <Modal title="Add a subject to the summer" onClose={onClose} width="max-w-xl"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <p className="mb-3 text-[14px] text-ink-2">For students who have to retake a subject. Subjects that students still owe come first. After adding one, use Add students on it to add them.</p>
      <input className="field mb-3" placeholder="Search by course number or description" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search subjects" />
      {list.loading && <LoadingState variant="list" />}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {list.data && rows.length === 0 && <EmptyState>{key ? "No subject matches your search." : "Every subject of this program is already offered."}</EmptyState>}
      <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
        {rows.map((c) => (
          <li key={c.subject_id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-accent">{c.code}</span>
                <span className="text-[12px] text-ink-3">{yearSemesterLabel(c.year_level, c.semester)} · {Number(c.units)} {Number(c.units) === 1 ? "unit" : "units"}</span>
              </span>
              <span className="mt-1 block text-[14px] font-semibold text-ink">{c.title}</span>
              <span className={`block text-[12px] ${c.owing > 0 ? "font-semibold text-bad" : "text-ink-3"}`}>
                {c.owing > 0 ? `${c.owing} ${c.owing === 1 ? "student has" : "students have"} to retake it` : "Nobody owes it"}
              </span>
            </span>
            <button className="btn btn-secondary btn-sm shrink-0" onClick={() => add(c)} disabled={busy !== null}>{busy === c.subject_id ? "Adding…" : "Add"}</button>
          </li>
        ))}
      </ul>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
