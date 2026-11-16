import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Monitor, Plus, Search, UserPlus } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { enrollInSection, getEnrollPlan, searchStudents } from "../../services/sections";
import { BackButton, EmptyState, ErrorState, FormError, LoadingState, PageHeader } from "../../components/ui";
import { termLabel, yearLabel } from "../../lib/format";

// Secretary: enroll students in a whole section at once (after a new semester or school year starts). Last term's
// block is listed already; anyone else can be added with the search. Each row says what the student will get and
// why a subject is left out (prerequisite not passed, already passed, unit limit), plus failed subjects to retake.
// The database does the enrolling with the same rules (section_enroll_plan / enroll_in_section, migration 0017).
const units = (rows) => rows.reduce((n, s) => n + Number(s.units), 0);

function Notices({ row }) {
  const needs = row.subjects.filter((s) => s.state === "needs");
  const over = row.subjects.filter((s) => s.state === "over_limit");
  return (
    <div className="flex flex-col gap-1 text-[12px]">
      {row.failed > 0 && <span className="badge tone-bad w-fit">{row.failed} failed {row.failed === 1 ? "subject" : "subjects"}</span>}
      {row.retake.length > 0 && <span className="text-warn">Retake this semester: {row.retake.join(", ")}</span>}
      {needs.map((s) => <span key={s.code} className="text-warn">{s.code} waits for {s.needs}</span>)}
      {over.length > 0 && <span className="text-ink-3">Over the unit limit: {over.map((s) => s.code).join(", ")}</span>}
      {row.failed === 0 && row.retake.length === 0 && needs.length === 0 && over.length === 0 && <span className="text-ink-3">None</span>}
    </div>
  );
}

export default function EnrollSectionPage() {
  const { term } = useOutletContext();
  const [params] = useSearchParams();
  const sectionId = Number(params.get("section"));
  const { data, error, loading, reload } = useAsync(() => getEnrollPlan(sectionId), [sectionId], `enroll-plan-${sectionId}`);
  const [extra, setExtra] = useState([]);           // students added with the search
  const [unticked, setUnticked] = useState(new Set());
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

  if (!sectionId) return <ErrorState error={{ message: "Pick a section on Section allocations first." }} />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const rows = [...data.students, ...extra.filter((x) => !data.students.some((s) => s.student_id === x.student_id))];
  const ready = rows.filter((r) => r.to_add > 0);
  const chosen = ready.filter((r) => !unticked.has(r.student_id));
  const lastBlock = data.section.replace(/\s\d+-/, ` ${data.from_year}-`);
  const toggle = (id) => setUnticked((u) => { const n = new Set(u); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = chosen.length === ready.length && ready.length > 0;

  const addStudent = async (s) => {
    setErr("");
    try {
      const plan = await getEnrollPlan(sectionId, [s.id]);
      setExtra((x) => [...x.filter((r) => r.student_id !== s.id), ...plan.students]);
      setQ("");
    } catch (e) { setErr(e.message); }
  };
  const enroll = async () => {
    setBusy(true);
    setErr("");
    try {
      const out = await enrollInSection(sectionId, chosen.map((r) => r.student_id));
      setResult(out);
      const fresh = extra.length ? await getEnrollPlan(sectionId, extra.map((r) => r.student_id)) : { students: [] };
      setExtra(fresh.students);
      setUnticked(new Set());
      reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const added = result ? result.reduce((n, r) => n + r.added, 0) : 0;
  const skipped = result ? result.flatMap((r) => r.skipped.map((s) => ({ ...s, student_id: r.student_id }))) : [];
  const nameOf = (id) => rows.find((r) => r.student_id === id)?.full_name || id;

  return (
    <>
      <BackButton to="/sections" label="Section allocations" />
      <PageHeader title={`Enroll students in ${data.section}`} showTitle
        subtitle={`${term ? termLabel(term) + " · " : ""}Listed: the students who were in ${lastBlock} last term. Add anyone else with the search.`} />

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Enrolling is done on a computer.</span>
      </p>

      <div className="hidden flex-col gap-4 lg:flex">
        {result && (
          <div role="status" className="card flex flex-col gap-1.5 p-4 text-[14px]">
            <p><strong className="text-ink">{result.filter((r) => r.added > 0).length} students enrolled</strong> in {added} classes.</p>
            {skipped.length > 0 && (
              <details>
                <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">{skipped.length} subjects left out (see why)</summary>
                <ul className="mt-1.5 flex flex-col gap-0.5 text-[13px] text-ink-2">
                  {skipped.map((s, i) => <li key={i}>{nameOf(s.student_id)}: {s.code ? `${s.code} ` : ""}{s.why}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-5 py-3.5">
            <label className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <input type="checkbox" className="h-4 w-4" checked={allOn} disabled={ready.length === 0}
                onChange={() => setUnticked(allOn ? new Set(ready.map((r) => r.student_id)) : new Set())} />
              Select all ready
            </label>
            <span className="text-[13px] text-ink-3">{chosen.length} of {rows.length} students selected</span>
            <div className="relative ml-auto w-[300px]">
              <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
              <input className="field pl-9" placeholder="Add another student (name or ID)" aria-label="Add another student" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
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
            <button className="btn btn-primary" onClick={enroll} disabled={busy || chosen.length === 0}>
              <UserPlus size={16} aria-hidden="true" />{busy ? "Enrolling…" : `Enroll ${chosen.length} ${chosen.length === 1 ? "student" : "students"}`}
            </button>
          </div>
          <FormError error={err} />

          {rows.length === 0 ? (
            <EmptyState>Nobody from {lastBlock} last term. Add students with the search above.</EmptyState>
          ) : (
            <table className="data-table">
              <thead><tr><th className="w-10"><span className="sr-only">Select</span></th><th>Student</th><th>Last term</th><th>Will get</th><th>Notices</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const adds = r.subjects.filter((s) => s.state === "add");
                  const enrolledHere = r.subjects.filter((s) => s.state === "enrolled").length;
                  return (
                    <tr key={r.student_id}>
                      <td><input type="checkbox" className="h-4 w-4" aria-label={`Select ${r.full_name}`} disabled={r.to_add === 0}
                        checked={r.to_add > 0 && !unticked.has(r.student_id)} onChange={() => toggle(r.student_id)} /></td>
                      <td>
                        <Link to={`/students/${r.student_id}`} className="font-semibold text-ink">{r.full_name}</Link>
                        <span className="block font-mono text-[12px] text-ink-3">{r.student_id} · {yearLabel(r.year_level)}</span>
                      </td>
                      <td className="whitespace-nowrap text-[13px] text-ink-2">{r.last_section || "—"}</td>
                      <td className="text-[13px]">
                        {adds.length > 0
                          ? <><span className="font-semibold text-ink">{adds.length} {adds.length === 1 ? "subject" : "subjects"} · {units(adds)} units</span>
                              <span className="block font-mono text-[12px] text-ink-3">{adds.map((s) => s.code).join(", ")}</span></>
                          : <span className="text-ink-3">{enrolledHere > 0 ? `Enrolled in ${enrolledHere} ${enrolledHere === 1 ? "subject" : "subjects"}` : "Nothing they can take here"}</span>}
                      </td>
                      <td><Notices row={r} /></td>
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
