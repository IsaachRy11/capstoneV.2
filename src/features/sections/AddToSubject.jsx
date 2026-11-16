import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Monitor, Plus, Search, UserPlus } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { enrollInSubject, getSubjectPlan, searchStudents } from "../../services/sections";
import { BackButton, EmptyState, ErrorState, FormError, LoadingState, PageHeader } from "../../components/ui";
import { termLabel, yearLabel } from "../../lib/format";

// "Add students" for ONE subject (retakes, irregular students): the same list-and-checkbox page as for a whole
// section. Listed: students in this section who don't have the subject yet and anyone who failed, dropped or left it
// INC before. Each row says whether they can be added and why not. The database does the adding with the same rules
// (subject_enroll_plan / enroll_in_subject, migration 0018).
const STATE = {
  add: { text: "Can be added", tone: "text-ok" },
  enrolled: { text: "Already in this class", tone: "text-ink-3" },
  passed: { text: "Already passed it", tone: "text-ink-3" },
  over_limit: { text: "Over their unit limit", tone: "text-warn" },
};

export default function AddToSubject({ offeringId }) {
  const { term } = useOutletContext();
  const { data, error, loading, reload } = useAsync(() => getSubjectPlan(offeringId), [offeringId], `subject-plan-${offeringId}`);
  const [extra, setExtra] = useState([]);
  const [ticked, setTicked] = useState(new Set()); // nobody is pre-selected for one subject
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { searchStudents(q).then((r) => alive && setFound(r)).catch(() => {}); }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const rows = [...data.students, ...extra.filter((x) => !data.students.some((s) => s.student_id === x.student_id))];
  const ready = rows.filter((r) => r.state === "add");
  const chosen = ready.filter((r) => ticked.has(r.student_id));
  const allOn = chosen.length === ready.length && ready.length > 0;
  const toggle = (id) => setTicked((u) => { const n = new Set(u); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const tooMany = chosen.length > data.seats_left;
  const nameOf = (id) => rows.find((r) => r.student_id === id)?.full_name || id;

  const addStudent = async (s) => {
    setErr("");
    try {
      const plan = await getSubjectPlan(offeringId, [s.id]);
      setExtra((x) => [...x.filter((r) => r.student_id !== s.id), ...plan.students]);
      setQ("");
    } catch (e) { setErr(e.message); }
  };
  const add = async () => {
    setBusy(true);
    setErr("");
    try {
      setResult(await enrollInSubject(offeringId, chosen.map((r) => r.student_id)));
      const fresh = extra.length ? await getSubjectPlan(offeringId, extra.map((r) => r.student_id)) : { students: [] };
      setExtra(fresh.students);
      setTicked(new Set());
      reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <BackButton to="/sections" label="Section allocations" />
      <PageHeader title={`Add students to ${data.code}`} showTitle
        subtitle={`${data.title} · ${data.section} · ${Number(data.units)} units${term ? ` · ${termLabel(term)}` : ""}. Adds only this subject. Listed: students in ${data.section} without it, and anyone who failed, dropped or left it INC in an earlier semester. Tick who to add.`} />

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Adding students is done on a computer.</span>
      </p>

      <div className="hidden flex-col gap-4 lg:flex">
        {result && (
          <div role="status" className="card flex flex-col gap-1 p-4 text-[14px]">
            <p><strong className="text-ink">{result.filter((r) => r.ok).length} students added</strong> to {data.code}.</p>
            {result.filter((r) => !r.ok).map((r) => <p key={r.student_id} className="text-[13px] text-ink-2">{nameOf(r.student_id)}: {r.why}</p>)}
          </div>
        )}

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-5 py-3.5">
            <label className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <input type="checkbox" className="h-4 w-4" checked={allOn} disabled={ready.length === 0}
                onChange={() => setTicked(allOn ? new Set() : new Set(ready.map((r) => r.student_id)))} />
              Select all who can be added
            </label>
            <span className={`text-[13px] ${tooMany ? "font-semibold text-bad" : "text-ink-3"}`}>
              {chosen.length} selected · {data.seats_left} {data.seats_left === 1 ? "seat" : "seats"} left{tooMany ? ": too many for the seats" : ""}
            </span>
            <div className="relative ml-auto w-[300px]">
              <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
              <input className="field pl-9" placeholder="Add a student to this list" aria-label="Add a student to this list" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
              {q.trim().length >= 2 && (
                <ul className="absolute right-0 top-[46px] z-10 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
                  {found.filter((s) => !rows.some((r) => r.student_id === s.id)).map((s) => (
                    <li key={s.id}>
                      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-hover" onClick={() => addStudent(s)}>
                        <Plus size={14} className="shrink-0 text-accent" aria-hidden="true" />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{s.full_name}</span>
                          <span className="text-[12px] text-ink-3"><span className="font-mono">{s.id}</span> · {s.program_code} {yearLabel(s.year_level)}</span></span>
                      </button>
                    </li>
                  ))}
                  {found.length === 0 && <li className="px-3 py-2 text-[13px] text-ink-3">No matching students.</li>}
                </ul>
              )}
            </div>
            <button className="btn btn-primary" onClick={add} disabled={busy || chosen.length === 0 || tooMany}>
              <UserPlus size={16} aria-hidden="true" />{busy ? "Adding…" : `Add ${chosen.length} to ${data.code}`}
            </button>
          </div>
          <FormError error={err} />

          {rows.length === 0 ? (
            <EmptyState>Nobody needs {data.code} right now. Add a student with the search above.</EmptyState>
          ) : (
            <table className="data-table">
              <thead><tr><th className="w-10"><span className="sr-only">Select</span></th><th>Student</th><th>Section this semester</th><th>{data.code}</th><th>Notices</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATE[r.state];
                  return (
                    <tr key={r.student_id}>
                      <td><input type="checkbox" className="h-4 w-4" aria-label={`Select ${r.full_name}`} disabled={r.state !== "add"}
                        checked={r.state === "add" && ticked.has(r.student_id)} onChange={() => toggle(r.student_id)} /></td>
                      <td>
                        <Link to={`/students/${r.student_id}`} className="font-semibold text-ink">{r.full_name}</Link>
                        <span className="block font-mono text-[12px] text-ink-3">{r.student_id} · {yearLabel(r.year_level)}</span>
                      </td>
                      <td className="whitespace-nowrap text-[13px] text-ink-2">{r.section || "Not enrolled yet"}</td>
                      <td className={`text-[13px] font-semibold ${r.state === "needs" ? "text-warn" : st.tone}`}>{r.state === "needs" ? `Needs ${r.needs} passed first` : st.text}</td>
                      <td className="text-[12px]">
                        <div className="flex flex-col gap-1">
                          {r.retake && <span className="badge tone-warn w-fit">Retake (took it before)</span>}
                          {r.failed > 0 && <span className="badge tone-bad w-fit">{r.failed} failed {r.failed === 1 ? "subject" : "subjects"}</span>}
                          {!r.retake && r.failed === 0 && <span className="text-ink-3">None</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
