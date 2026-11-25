import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Monitor, Plus, Search, UserPlus } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { enrollInSubject, getSubjectPlan, searchStudents } from "../../services/sections";
import { EmptyState, ErrorState, FormError, LoadingState, PageHeader } from "../../components/ui";
import { termLabel, yearLabel } from "../../lib/format";

// Add students to ONE subject, the only enrolling page. Listed: this section's block (pre-ticked) and anyone who took the
// subject before without passing it ("Retake", not ticked). Anyone else: the search bar (name or student ID). Each row
// says whether the student can be added and why not. The database adds them with the same rules (seats, clashes,
// prerequisites, unit limit): subject_enroll_plan / enroll_in_subject, migration 0018.
const STATE = {
  add: { text: "Can be added", tone: "text-ok" },
  enrolled: { text: "Already in this subject", tone: "text-ink-3" },
  passed: { text: "Already passed it", tone: "text-ink-3" },
  over_limit: { text: "Over their unit limit", tone: "text-warn" },
  other_program: { text: "Not in their curriculum", tone: "text-bad" },
};

// The student's own history with THIS subject (not their overall Regular/Irregular status).
function subjectStatus(r) {
  if (r.state === "passed") return <span className="badge tone-ok">Passed</span>;
  if (r.state === "enrolled") return <span className="badge tone-info">Enrolled</span>;
  if (r.failed_this) return <span className="badge tone-bad">Failed</span>;
  if (r.retake) return <span className="badge tone-warn">Retake</span>;
  return <span className="text-[13px] text-ink-3">Not yet enrolled</span>;
}

export default function AddToSubject({ offeringId }) {
  const { term } = useOutletContext();
  const { data, error, loading, reload } = useAsync(() => getSubjectPlan(offeringId), [offeringId], `subject-plan-${offeringId}`);
  const [extra, setExtra] = useState([]);       // students found with the search
  const [choice, setChoice] = useState(new Map()); // studentId -> ticked, when the secretary changed it
  const [typed, setTyped] = useState(""); // in the search box
  const [q, setQ] = useState("");         // searched on Enter or the Search button
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [showDone, setShowDone] = useState(false); // students already in the subject or who passed it

  useEffect(() => {
    let alive = true;
    searchStudents(q).then((r) => alive && setFound(r)).catch(() => {});
    return () => { alive = false; };
  }, [q]);

  // Picked students are only saved by the "Add ... to" button: warn before a refresh or closing the tab loses them.
  const unsaved = choice.size > 0 && [...choice.values()].some(Boolean);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const rows = [...extra.filter((x) => !data.students.some((s) => s.student_id === x.student_id)), ...data.students];
  const isTicked = (r) => r.state === "add" && (choice.has(r.student_id) ? choice.get(r.student_id) : r.in_block);
  const ready = rows.filter((r) => r.state === "add");
  const chosen = rows.filter(isTicked);
  const allOn = chosen.length === ready.length && ready.length > 0;
  const tooMany = chosen.length > data.seats_left;
  const isDone = (r) => r.state === "enrolled" || r.state === "passed";
  const done = rows.filter(isDone);
  // A student the secretary searched for is always shown, so the reason is visible.
  const listed = showDone ? rows : rows.filter((r) => !isDone(r) || extra.some((x) => x.student_id === r.student_id));
  const setTick = (id, on) => setChoice((m) => new Map(m).set(id, on));
  const nameOf = (id) => rows.find((r) => r.student_id === id)?.full_name || id;
  const shown = q.trim().length >= 2 ? found.filter((s) => !rows.some((r) => r.student_id === s.id)) : [];
  const program = data.section.split(" ")[0]; // "BSIT 1-S" -> BSIT: only its students can take its subjects

  const addToList = async (s) => {
    setErr("");
    try {
      const plan = await getSubjectPlan(offeringId, [s.id]);
      setExtra((x) => [...plan.students, ...x.filter((r) => r.student_id !== s.id)]);
      setTick(s.id, true);
      setQ("");
      setTyped("");
    } catch (e) { setErr(e.message); }
  };
  const add = async () => {
    setBusy(true);
    setErr("");
    try {
      setResult(await enrollInSubject(offeringId, chosen.map((r) => r.student_id)));
      const fresh = extra.length ? await getSubjectPlan(offeringId, extra.map((r) => r.student_id)) : { students: [] };
      setExtra(fresh.students);
      setChoice(new Map());
      reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title={`Add students to ${data.code}`} showTitle
        subtitle={`${data.title} · ${data.section} · ${Number(data.units)} units${term ? ` · ${termLabel(term)}` : ""}`} />

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Adding students is done on a computer.</span>
      </p>

      <div className="hidden flex-col gap-4 lg:flex">
        {/* Find anyone: by name or by student ID. */}
        <section className="card flex flex-col gap-3 p-5">
          <label htmlFor="find-student" className="text-[15px] font-bold text-ink">Find a student</label>
          <form role="search" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(typed.trim()); }}>
            <div className="relative min-w-0 flex-1">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <input id="find-student" type="search" enterKeyHint="search" className="field h-12 pl-12 text-[16px]" placeholder="Type a name or a student ID, e.g. 2025-0001, then press Enter"
                value={typed} onChange={(e) => { setTyped(e.target.value); if (!e.target.value) setQ(""); }} autoComplete="off" />
            </div>
            <button type="submit" className="btn btn-secondary h-12" disabled={typed.trim().length < 2}>Search</button>
          </form>
          {q.trim().length >= 2 && (
            <ul className="overflow-hidden rounded-lg border border-line">
              {shown.map((s) => (
                <li key={s.id} className="flex items-center gap-3 border-b border-line-2 px-4 py-2.5 last:border-0">
                  <span className="w-[96px] shrink-0 font-mono text-[14px] font-semibold text-ink">{s.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{s.full_name}</span>
                    <span className="text-[12px] text-ink-3">{s.program_code} {yearLabel(s.year_level)} · {s.section_name || "no section yet"}</span>
                  </span>
                  {s.program_code === program
                    ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => addToList(s)}><Plus size={14} aria-hidden="true" />Select</button>
                    : <span className="badge tone-neutral">{s.program_code} student: not a {program} subject</span>}
                </li>
              ))}
              {shown.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">{found.length ? "Everyone found is already in the list below." : "No student with that name or ID."}</li>}
            </ul>
          )}
        </section>

        {result && (
          <div role="status" className="card flex flex-col gap-1 p-4 text-[14px]">
            <p><strong className="text-ink">{result.filter((r) => r.ok).length} students added</strong> to {data.code}.</p>
            {result.filter((r) => !r.ok).map((r) => <p key={r.student_id} className="text-[13px] text-ink-2">{nameOf(r.student_id)}: {r.why}</p>)}
          </div>
        )}

        {chosen.length > 0 && (
          <p role="status" className="rounded-lg px-4 py-3 text-[14px] font-semibold tone-warn">
            {chosen.length} {chosen.length === 1 ? "student is" : "students are"} selected but not saved yet. Press “Add {chosen.length} to {data.code}” to save.
          </p>
        )}

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-2 px-5 py-3.5">
            <label className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <input type="checkbox" className="h-4 w-4" checked={allOn} disabled={ready.length === 0}
                onChange={() => setChoice(new Map(ready.map((r) => [r.student_id, !allOn])))} />
              Select all who can be added
            </label>
            <span className={`text-[13px] ${tooMany ? "font-semibold text-bad" : "text-ink-3"}`}>
              {chosen.length} selected · {data.seats_left} {data.seats_left === 1 ? "seat" : "seats"} left{tooMany ? ": too many for the seats" : ""}
            </span>
            <button className="btn btn-primary ml-auto" onClick={add} disabled={busy || chosen.length === 0 || tooMany}>
              <UserPlus size={16} aria-hidden="true" />{busy ? "Adding…" : `Add ${chosen.length} to ${data.code}`}
            </button>
          </div>
          <FormError error={err} />

          {listed.length === 0 && rows.length > 0 ? (
            <EmptyState>Everyone listed is already in {data.code} or has passed it. Find another student with the search above.</EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState>Nobody is listed for {data.code}. Find a student with the search above.</EmptyState>
          ) : (
            <table className="data-table">
              <thead><tr><th className="w-10"><span className="sr-only">Select</span></th><th>Student</th><th>Section this semester</th><th>{data.code}</th><th>Status in this subject</th></tr></thead>
              <tbody>
                {listed.map((r) => {
                  const st = STATE[r.state];
                  return (
                    <tr key={r.student_id}>
                      <td><input type="checkbox" className="h-4 w-4" aria-label={`Select ${r.full_name}`} disabled={r.state !== "add"}
                        checked={isTicked(r)} onChange={(e) => setTick(r.student_id, e.target.checked)} /></td>
                      <td>
                        <Link to={`/students/${r.student_id}`} className="font-semibold text-ink">{r.full_name}</Link>
                        <span className="block font-mono text-[12px] text-ink-3">{r.student_id} · {yearLabel(r.year_level)}</span>
                      </td>
                      <td className="whitespace-nowrap text-[13px] text-ink-2">{r.section || "Not yet enrolled"}</td>
                      <td className={`text-[13px] font-semibold ${r.state === "needs" ? "text-warn" : st.tone}`}>{r.state === "needs" ? `Needs ${r.needs} passed first` : st.text}</td>
                      <td>{subjectStatus(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {done.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-ink-3">
              <span>{done.length} {done.length === 1 ? "student is" : "students are"} already in {data.code} or passed it</span>
              <button type="button" className="btn btn-secondary btn-sm" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>{showDone ? "Show less" : "Show more"}</button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
