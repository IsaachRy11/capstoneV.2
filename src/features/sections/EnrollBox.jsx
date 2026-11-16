import { useEffect, useState } from "react";
import { ListPlus, Plus, Search, X } from "lucide-react";
import { enrollStudent, getPrerequisiteGaps, getStudentsByIds, searchStudents } from "../../services/sections";
import { FormError } from "../../components/ui";
import { yearLabel } from "../../lib/format";

// Secretary: add students to one class. One at a time (Enroll), or several at once: build a list from searches or a
// pasted list of student IDs, then enroll them all. The database refuses a student whose prerequisite isn't passed,
// a full class and a timetable clash; a warning shows the prerequisite problem before anyone tries.
export default function EnrollBox({ section, offering, rosterIds, onEnrolled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);       // students waiting to be enrolled together
  const [gaps, setGaps] = useState({});       // studentId -> missing prerequisite code
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [outcome, setOutcome] = useState(null); // [{ student, ok, why }] after enrolling the list
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      searchStudents(q).then((r) => alive && setResults(r)).catch((e) => alive && setError(e.message));
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const seatsLeft = (offering.capacity ?? section.capacity) - offering.enrolled;
  const inList = (id) => list.some((s) => s.id === id);
  const options = results.filter((r) => !rosterIds.has(r.id));

  // Warn before adding: look up prerequisite gaps for everyone on screen.
  const idsOnScreen = [...new Set([...options.map((s) => s.id), ...list.map((s) => s.id)])].sort().join(",");
  useEffect(() => {
    let alive = true;
    getPrerequisiteGaps(offering.id, idsOnScreen ? idsOnScreen.split(",") : []).then((g) => alive && setGaps(g));
    return () => { alive = false; };
  }, [offering.id, idsOnScreen]);

  const enroll = async (student) => {
    setBusyId(student.id);
    setError("");
    try {
      await enrollStudent(student.id, offering.id);
      setQ("");
      setResults([]);
      onEnrolled();
    } catch (err) {
      setError(err.code === "23505" ? `${student.full_name} is already in this class.` : err.message);
    } finally {
      setBusyId(null);
    }
  };

  const addToList = (s) => { setOutcome(null); setList((l) => (inList(s.id) ? l : [...l, s])); };
  const addPasted = async () => {
    setError("");
    const ids = [...new Set(pasted.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];
    if (ids.length === 0) return;
    try {
      const found = await getStudentsByIds(ids);
      const missing = ids.filter((id) => !found.some((f) => f.id === id));
      const fresh = found.filter((f) => !rosterIds.has(f.id) && f.status === "active");
      setOutcome(null);
      setList((l) => [...l, ...fresh.filter((f) => !l.some((x) => x.id === f.id))]);
      const skipped = found.length - fresh.length;
      setPasted("");
      setPasting(false);
      if (missing.length || skipped) setError([missing.length && `Not found: ${missing.join(", ")}.`, skipped && `${skipped} already in this class or not active, left out.`].filter(Boolean).join(" "));
    } catch (err) {
      setError(err.message);
    }
  };

  const enrollList = async () => {
    setRunning(true);
    setError("");
    const out = [];
    for (const s of list) {
      try {
        await enrollStudent(s.id, offering.id);
        out.push({ student: s, ok: true });
      } catch (err) {
        out.push({ student: s, ok: false, why: err.code === "23505" ? "Already in this class" : err.message });
      }
    }
    setOutcome(out);
    setList(out.filter((o) => !o.ok).map((o) => o.student)); // failures stay so they can be fixed and retried
    setRunning(false);
    onEnrolled();
  };

  const seatsText = seatsLeft > 0 ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left` : "Class is full";

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3.5 sm:px-6">
        <span className="text-[13px] text-ink-2">
          <span className="font-semibold text-ink">{offering.enrolled} {offering.enrolled === 1 ? "student" : "students"}</span> · {seatsText}
        </span>
        <button className="btn btn-secondary btn-sm hidden lg:inline-flex" onClick={() => setOpen(true)} disabled={seatsLeft <= 0}>
          <Plus size={14} aria-hidden="true" />Add students
        </button>
      </div>
    );
  }

  const blocked = (s) => Boolean(gaps[s.id]);
  const ready = list.filter((s) => !blocked(s));
  const tooMany = ready.length > seatsLeft;

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-surface-2 px-5 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="enrol" className="text-[13px] font-semibold text-ink">Add students to {offering.curriculum_subjects.code} · {section.name}</label>
        <button className="text-[13px] font-semibold text-accent" onClick={() => { setOpen(false); setQ(""); setList([]); setOutcome(null); setError(""); }}>Done</button>
      </div>
      <p className="text-[12px] text-ink-3">For irregular students taking this subject with {section.name}. Everyone in the block section is already enrolled. Enroll one student, or add several to a list first.</p>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
        <input id="enrol" className="field pl-9" placeholder="Search by name or student ID" value={q} onChange={(e) => setQ(e.target.value)} disabled={seatsLeft <= 0} autoComplete="off" autoFocus />
      </div>
      <button type="button" className="w-fit text-[13px] font-semibold text-accent" onClick={() => setPasting((p) => !p)}>{pasting ? "Hide the pasted list" : "Paste a list of student IDs"}</button>
      {pasting && (
        <div className="flex flex-col gap-2">
          <textarea className="field min-h-[88px] font-mono text-[13px]" aria-label="Student IDs" placeholder="2025-0003, 2025-0007, 2024-0012" value={pasted} onChange={(e) => setPasted(e.target.value)} />
          <button type="button" className="btn btn-secondary btn-sm w-fit" onClick={addPasted} disabled={!pasted.trim()}>Add to the list</button>
        </div>
      )}

      {q.trim().length >= 2 && (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {options.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">No matching students who aren't already in this class.</li>}
          {options.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 border-b border-line-2 px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{s.full_name}</div>
                <div className="text-[12px] text-ink-3"><span className="font-mono">{s.id}</span> · {s.program_code} {yearLabel(s.year_level)} · {s.section_name || "no section"}</div>
                {blocked(s) && <div className="mt-0.5 text-[12px] font-semibold text-warn">Needs {gaps[s.id]} passed first. It can't be added until then.</div>}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => addToList(s)} disabled={inList(s.id) || blocked(s)}><ListPlus size={14} aria-hidden="true" />{inList(s.id) ? "In the list" : "Add to list"}</button>
              <button className="btn btn-primary btn-sm" onClick={() => enroll(s)} disabled={busyId !== null || blocked(s)}><Plus size={14} aria-hidden="true" />{busyId === s.id ? "Adding…" : "Enroll"}</button>
            </li>
          ))}
        </ul>
      )}

      {list.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-ink">{list.length} {list.length === 1 ? "student" : "students"} in the list</span>
            <button type="button" className="text-[13px] font-semibold text-ink-3" onClick={() => setList([])}>Clear</button>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {list.map((s) => (
              <li key={s.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${blocked(s) ? "border-warn text-warn" : "border-line text-ink-2"}`}
                title={blocked(s) ? `Needs ${gaps[s.id]} passed first` : undefined}>
                <span className="font-mono">{s.id}</span> {s.full_name}
                <button type="button" aria-label={`Remove ${s.full_name} from the list`} onClick={() => setList((l) => l.filter((x) => x.id !== s.id))}><X size={12} /></button>
              </li>
            ))}
          </ul>
          {list.some(blocked) && <p className="text-[12px] text-warn">Students marked in orange need a prerequisite first; they are skipped.</p>}
          {tooMany && <p className="text-[12px] text-bad">The class has {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left but the list has {ready.length} students. Remove some or add seats.</p>}
          <button className="btn btn-primary btn-sm w-fit" onClick={enrollList} disabled={running || ready.length === 0 || tooMany}>
            {running ? "Enrolling…" : `Enroll ${ready.length} ${ready.length === 1 ? "student" : "students"}`}
          </button>
        </div>
      )}

      {outcome && (
        <div role="status" className="rounded-lg border border-line bg-surface p-3 text-[13px]">
          <p><strong className="text-ink">{outcome.filter((o) => o.ok).length} enrolled</strong>{outcome.some((o) => !o.ok) && <>, <strong className="text-bad">{outcome.filter((o) => !o.ok).length} not</strong> (still in the list)</>}.</p>
          {outcome.filter((o) => !o.ok).map((o) => <p key={o.student.id} className="mt-1"><span className="font-mono">{o.student.id}</span> {o.student.full_name}: {o.why}</p>)}
        </div>
      )}
      <FormError error={error} />
      <span className="text-[12px] text-ink-3">{seatsLeft > 0 ? `${seatsText}.` : "This class is full. Raise the section capacity to add more."}</span>
    </div>
  );
}
