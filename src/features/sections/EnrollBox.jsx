import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { enrollStudent, searchStudents } from "../../services/sections";
import { FormError } from "../../components/ui";
import { yearLabel } from "../../lib/format";

export default function EnrollBox({ section, offering, rosterIds, onEnrolled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      searchStudents(q).then((r) => alive && setResults(r)).catch((e) => alive && setError(e.message));
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const seatsLeft = (offering.capacity ?? section.capacity) - offering.enrolled;
  const options = results.filter((r) => !rosterIds.has(r.id));

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

  const seatsText = seatsLeft > 0 ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left` : "Class is full";

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-6 py-3.5">
        <span className="text-[13px] text-ink-2">
          <span className="font-semibold text-ink">{offering.enrolled} {offering.enrolled === 1 ? "student" : "students"}</span> · {seatsText}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)} disabled={seatsLeft <= 0}>
          <Plus size={14} aria-hidden="true" />Add a student
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-surface-2 px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="enrol" className="text-[13px] font-semibold text-ink">Add a student to {offering.curriculum_subjects.code} · {section.name}</label>
        <button className="text-[13px] font-semibold text-accent" onClick={() => { setOpen(false); setQ(""); }}>Done</button>
      </div>
      <p className="text-[12px] text-ink-3">For irregular students taking this subject with {section.name}. Everyone in the block section is already enrolled.</p>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
        <input id="enrol" className="field pl-9" placeholder="Search by name or student ID" value={q} onChange={(e) => setQ(e.target.value)} disabled={seatsLeft <= 0} autoComplete="off" autoFocus />
      </div>
      {q.trim().length >= 2 && (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {options.length === 0 && <li className="px-4 py-3 text-[13px] text-ink-3">No matching students who aren't already in this class.</li>}
          {options.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b border-line-2 px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{s.full_name}</div>
                <div className="text-[12px] text-ink-3"><span className="font-mono">{s.id}</span> · {s.program_code} {yearLabel(s.year_level)} · {s.section_name || "no section"}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => enroll(s)} disabled={busyId !== null}><Plus size={14} aria-hidden="true" />{busyId === s.id ? "Adding…" : "Enroll"}</button>
            </li>
          ))}
        </ul>
      )}
      <FormError error={error} />
      <span className="text-[12px] text-ink-3">{seatsLeft > 0 ? `${seatsText}.` : "This class is full. Raise the section capacity to add more."}</span>
    </div>
  );
}
