import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { getPrograms } from "../services/catalog";
import { enrollStudent, getRoster, getSectionOfferings, listCurrentSections, removeEnrollment, searchStudents, updateSectionCapacity } from "../services/sections";
import { Avatar, EmptyState, ErrorState, FormError, LoadingState, Modal, PageHeader, StandingBadge } from "../components/ui";
import { scheduleLines, termLabel, yearLabel } from "../lib/format";

function EnrollBox({ section, offering, rosterIds, onEnrolled }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

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

  return (
    <div className="flex flex-col gap-2 border-b border-line bg-surface-2 px-6 py-4">
      <label htmlFor="enrol" className="text-[13px] font-semibold text-ink">Enroll a student into {offering.curriculum_subjects.code} · {section.name}</label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
        <input id="enrol" className="field pl-9" placeholder="Search by name or student ID" value={q} onChange={(e) => setQ(e.target.value)} disabled={seatsLeft <= 0} autoComplete="off" />
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
      <span className="text-[12px] text-ink-3">{seatsLeft > 0 ? `${seatsLeft} seats left.` : "This class is full. Raise the section capacity to add more."}</span>
    </div>
  );
}

function CapacityModal({ section, onClose, onSaved }) {
  const [value, setValue] = useState(section.capacity);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < section.enrolled || n < 1) return setError(`Enter a whole number of at least ${Math.max(1, section.enrolled)} (students already registered).`);
    setBusy(true);
    try {
      await updateSectionCapacity(section.id, n);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title={`Capacity for ${section.name}`} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" form="cap-form" disabled={busy}>{busy ? "Saving…" : "Save capacity"}</button></>}>
      <form id="cap-form" onSubmit={save} className="flex flex-col gap-3">
        <label className="label" htmlFor="cap">Seats in this section</label>
        <input id="cap" type="number" min={1} className="field font-mono" value={value} onChange={(e) => setValue(e.target.value)} />
        <FormError error={error} />
      </form>
    </Modal>
  );
}

export default function Sections() {
  const { term } = useOutletContext();
  const [programCode, setProgramCode] = useState(null);
  const [year, setYear] = useState(1);
  const [offeringId, setOfferingId] = useState(null);
  const [editingCap, setEditingCap] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [actionError, setActionError] = useState("");

  const base = useAsync(async () => {
    const [programs, sections] = await Promise.all([getPrograms(), listCurrentSections()]);
    return { programs, sections };
  }, []);

  const program = base.data?.programs.find((p) => p.code === programCode) || base.data?.programs[0];
  const section = base.data?.sections.find((s) => s.program_code === program?.code && s.year_level === year);

  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id]);
  const offering = offerings.data?.find((o) => o.id === offeringId) || offerings.data?.[0];
  const roster = useAsync(() => (offering ? getRoster(offering.id) : Promise.resolve([])), [offering?.id]);

  if (base.loading) return <LoadingState />;
  if (base.error) return <ErrorState error={base.error} onRetry={base.reload} />;

  const refresh = () => { offerings.reload(); roster.reload(); base.reload(); };
  const doRemove = async () => {
    setActionError("");
    try {
      await removeEnrollment(confirmRemove.id);
      setConfirmRemove(null);
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Section allocations" subtitle={`${termLabel(term)} · pick a subject to see its schedule, seats and class list.`} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="seg" role="group" aria-label="Program">
          {base.data.programs.map((p) => (
            <button key={p.code} aria-pressed={p.code === program.code} onClick={() => { setProgramCode(p.code); setOfferingId(null); if (year > p.duration_years) setYear(1); }}>{p.code}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Year level">
          {Array.from({ length: program.duration_years }, (_, i) => i + 1).map((y) => (
            <button key={y} aria-pressed={y === year} onClick={() => { setYear(y); setOfferingId(null); }}>{yearLabel(y)}</button>
          ))}
        </div>
      </div>

      {!section ? (
        <div className="card"><EmptyState>No {program.code} {yearLabel(year)} section this semester.</EmptyState></div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <section aria-label="Subjects" className="card flex flex-[1_1_320px] flex-col gap-0.5 p-2">
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-2.5">
              <span className="text-[12px] font-semibold text-ink-3">{section.name} · {offerings.data?.length ?? "…"} subjects</span>
              <button className="text-[13px] font-semibold text-accent" onClick={() => setEditingCap(true)}>Capacity {section.enrolled} / {section.capacity}</button>
            </div>
            {offerings.loading && <LoadingState />}
            {offerings.error && <ErrorState error={offerings.error} onRetry={offerings.reload} />}
            {offerings.data?.map((o) => {
              const on = o.id === offering?.id;
              const lines = scheduleLines(o.class_meetings);
              return (
                <button key={o.id} aria-pressed={on} onClick={() => setOfferingId(o.id)}
                  className={`flex w-full items-center gap-3.5 rounded-[10px] border px-4 py-3.5 text-left ${on ? "border-accent bg-tint" : "border-transparent hover:bg-hover"}`}>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-mono text-[13px] text-accent">{o.curriculum_subjects.code}</span>
                    <span className="text-[14px] font-semibold leading-snug text-ink">{o.curriculum_subjects.title}</span>
                    <span className="text-[12px] text-ink-3">{Number(o.curriculum_subjects.units)} units · {lines.map((l) => l.days).join(" / ") || "To be arranged"}</span>
                  </div>
                  <span className="whitespace-nowrap font-mono text-[12px] text-ink-2">{o.enrolled} / {o.capacity ?? section.capacity}</span>
                </button>
              );
            })}
          </section>

          {offering && (
            <section className="card min-w-0 flex-[999_1_520px] overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-line p-6">
                <span className="font-mono text-[13px] text-accent">{offering.curriculum_subjects.code} · {Number(offering.curriculum_subjects.units)} units</span>
                <h2 className="text-[22px] font-bold tracking-tight">{offering.curriculum_subjects.title}</h2>
                <div className="text-[14px] text-ink-2">
                  {scheduleLines(offering.class_meetings).map((l) => <div key={l.days + l.time}>{l.days} {l.time} · {l.room}</div>)}
                  {offering.class_meetings.length === 0 && "Schedule to be arranged"}
                </div>
              </div>

              <EnrollBox section={section} offering={offering} rosterIds={new Set((roster.data || []).map((r) => r.student_id))} onEnrolled={refresh} />

              {roster.loading ? <LoadingState /> : roster.error ? <div className="p-5"><ErrorState error={roster.error} onRetry={roster.reload} /></div> : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Student</th><th>Student ID</th><th>Standing</th><th><span className="sr-only">Remove</span></th></tr></thead>
                    <tbody>
                      {roster.data.map((r) => (
                        <tr key={r.id}>
                          <td className="whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={r.name} size={30} />
                              <Link to={`/students/${r.student_id}`} className="font-semibold text-ink">{r.name}</Link>
                            </div>
                          </td>
                          <td className="font-mono text-[13px] text-ink-2">{r.student_id}</td>
                          <td><StandingBadge standing={r.standing} /></td>
                          <td className="text-right"><button className="icon-btn icon-btn-danger" onClick={() => setConfirmRemove(r)} aria-label={`Remove ${r.name} from this class`}><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {roster.data.length === 0 && <EmptyState>No students in this class yet.</EmptyState>}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {editingCap && section && <CapacityModal section={section} onClose={() => setEditingCap(false)} onSaved={() => { setEditingCap(false); refresh(); }} />}
      {confirmRemove && (
        <Modal title="Remove from class?" onClose={() => setConfirmRemove(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setConfirmRemove(null)}>Cancel</button><button className="btn btn-danger" onClick={doRemove}>Remove</button></>}>
          <p className="text-[14px] text-ink-2">{confirmRemove.name} will be removed from {offering.curriculum_subjects.code}. Any grades recorded for this class are deleted too.</p>
          <div className="mt-3"><FormError error={actionError} /></div>
        </Modal>
      )}
    </>
  );
}
