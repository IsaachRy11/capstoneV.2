import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useSectionPicker } from "../../hooks/useSectionPicker";
import SectionPicker from "../../components/SectionPicker";
import { getRoster, getSectionOfferings, removeEnrollment, removeSummerSubject } from "../../services/sections";
import WeekStrip from "../schedules/WeekStrip";
import { Avatar, EmptyState, ErrorState, FormError, LoadingState, Modal, PageHeader, StudentStatusBadge } from "../../components/ui";
import { studentTypeLabel, yearLabel } from "../../lib/format";
import { meetingDays } from "../../lib/schedule";
import EnrollBox from "./EnrollBox";
import CapacityModal from "./CapacityModal";
import SubjectCapacityModal from "./SubjectCapacityModal";
import SummerSubjectModal from "./SummerSubjectModal";

export default function Sections() {
  const picker = useSectionPicker();
  const { program, year, summer, section } = picker;
  const [offeringId, setOfferingId] = useState(null);
  const [editingCap, setEditingCap] = useState(false);
  const [editingSeats, setEditingSeats] = useState(false); // one subject's own seats
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [addingSubject, setAddingSubject] = useState(false); // summer: open another subject for retakes
  const [actionError, setActionError] = useState("");

  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id], "section-offerings");
  const offering = offerings.data?.find((o) => o.id === offeringId) || offerings.data?.[0];
  const roster = useAsync(() => (offering ? getRoster(offering.id) : Promise.resolve([])), [offering?.id], "roster");

  if (picker.loading) return <LoadingState />;
  if (picker.error) return <ErrorState error={picker.error} onRetry={picker.reload} />;

  const refresh = () => { offerings.reload(); roster.reload(); picker.reload(); };
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
      <PageHeader title="Section allocations" />

      <SectionPicker picker={picker} onChange={() => setOfferingId(null)} />

      {!section ? (
        <div className="card"><EmptyState>No {program.code} {summer ? "Summer" : yearLabel(year)} section this semester.</EmptyState></div>
      ) : (
        <div className="flex flex-wrap items-start gap-4 sm:gap-5">
          {/* Phones: the section summary and its subjects as a sideways row of chips, so the chosen class sits right below. */}
          <section aria-label="Subjects" className="flex w-full flex-col gap-2.5 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-ink-2">{section.name} · {offerings.data?.length ?? "…"} subjects</span>
              <span className="inline-flex min-h-8 items-center rounded-full border border-line bg-surface px-3 font-mono text-[13px] font-semibold text-ink-2">{section.enrolled} / {section.capacity} seats</span>
            </div>
            {offerings.loading && <LoadingState />}
            <div className="chip-row">
              {offerings.data?.map((o) => (
                <button key={o.id} className="chip" aria-pressed={o.id === offering?.id} onClick={() => setOfferingId(o.id)}>
                  <span className="font-mono text-[12px] text-accent">{o.curriculum_subjects.code}</span>
                  <span className="w-full truncate text-[13px] font-semibold text-ink">{o.curriculum_subjects.title}</span>
                  <span className="font-mono text-[11px] text-ink-3">{o.enrolled} / {o.capacity ?? section.capacity} seats</span>
                </button>
              ))}
            </div>
          </section>
          <section aria-label="Subjects" className="card hidden flex-[1_1_340px] flex-col overflow-hidden sm:flex">
            {/* The section on one line, the default seats on their own row underneath, so neither is squeezed. */}
            <div className="border-b border-line px-4 pb-3.5 pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[16px] font-bold">{section.name}</h2>
                <span className="text-[13px] text-ink-3">{offerings.data?.length ?? "…"} subjects</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <span className="text-[13px] text-ink-2">Each subject has <span className="font-mono font-semibold text-ink">{section.capacity}</span> seats unless it has its own</span>
                <button className="hidden shrink-0 text-[13px] font-semibold text-accent lg:inline-flex" onClick={() => setEditingCap(true)} title="Sets the seats for every subject without its own number">Change</button>
              </div>
            </div>
            {summer && (
              <div className="hidden border-b border-line px-4 py-3 lg:block">
                <button className="btn btn-secondary btn-sm w-full" onClick={() => setAddingSubject(true)}>Add a subject for failed students</button>
              </div>
            )}
            {offerings.loading && <LoadingState />}
            {offerings.error && <ErrorState error={offerings.error} onRetry={offerings.reload} />}
            <ul className="flex flex-col gap-2 p-3">
              {offerings.data?.map((o) => {
                const on = o.id === offering?.id;
                const cap = o.capacity ?? section.capacity;
                const pct = cap ? Math.min(100, Math.round((o.enrolled / cap) * 100)) : 0;
                return (
                  <li key={o.id}>
                    <button aria-pressed={on} onClick={() => setOfferingId(o.id)}
                      className={`flex w-full items-center gap-3.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${on ? "border-accent bg-tint" : "border-line hover:border-ink-3 hover:bg-hover"}`}>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-accent">{o.curriculum_subjects.code}</span>
                          <span className="text-[12px] text-ink-3">{Number(o.curriculum_subjects.units)} units · {meetingDays(o.class_meetings) || "To be arranged"}</span>
                        </span>
                        <span className="mt-1.5 block text-[15px] font-semibold leading-snug text-ink">{o.curriculum_subjects.title}</span>
                      </span>
                      <span className="w-[68px] shrink-0 text-right" title={o.capacity !== null ? "This subject has its own number of seats" : "Follows the section's seats"}>
                        <span className="font-mono text-[14px] font-semibold text-ink">{o.enrolled}<span className="text-ink-3">/{cap}</span></span>
                        <span className="bar mt-1.5 block" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                        <span className="mt-1 block text-[11px] text-ink-3">{o.capacity !== null ? "own seats" : "seats"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {offering && (
            <section className="card min-w-0 flex-[999_1_520px] overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-line p-5 sm:p-6">
                <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2 sm:min-w-[220px]">
                  <span className="font-mono text-[13px] text-accent">{offering.curriculum_subjects.code} · {Number(offering.curriculum_subjects.units)} units</span>
                  <h2 className="text-[20px] font-bold leading-tight tracking-tight sm:text-[22px]">{offering.curriculum_subjects.title}</h2>
                  <span className="text-[13px] text-ink-3">
                    {offering.class_meetings.length
                      ? `Meets ${offering.class_meetings.length} ${offering.class_meetings.length === 1 ? "day" : "days"} a week`
                      : "No fixed schedule yet"}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
                    <span><span className="font-mono font-semibold text-ink">{offering.enrolled} / {offering.capacity ?? section.capacity}</span> seats{offering.capacity !== null ? " (this subject's own)" : " (the section's)"}</span>
                    <button className="hidden min-h-8 items-center font-semibold text-accent lg:inline-flex" onClick={() => setEditingSeats(true)}>Change seats</button>
                  </span>
                </div>
                <WeekStrip meetings={offering.class_meetings} className="sm:min-w-[420px] sm:flex-[2_1_480px]" />
              </div>

              <EnrollBox key={offering.id} section={section} offering={offering} />

              {roster.loading ? <LoadingState /> : roster.error ? <div className="p-5"><ErrorState error={roster.error} onRetry={roster.reload} /></div> : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Student</th><th className="hidden sm:table-cell">Student ID</th><th>Type / status</th><th className="hidden lg:table-cell"><span className="sr-only">Remove</span></th></tr></thead>
                    <tbody>
                      {roster.data.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={r.name} size={30} />
                              <div className="flex min-w-0 flex-col">
                                <Link to={`/students/${r.student_id}`} className="inline-flex min-h-10 items-center font-semibold text-ink sm:whitespace-nowrap">{r.name}</Link>
                                <span className="-mt-1.5 font-mono text-[12px] text-ink-3 sm:hidden">{r.student_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap font-mono text-[13px] text-ink-2 sm:table-cell">{r.student_id}</td>
                          <td>
                            <StudentStatusBadge student={{ status: r.student_status, standing: r.standing }} />
                            <span className="mt-0.5 block text-[12px] text-ink-3">{studentTypeLabel(r)}</span>
                          </td>
                          <td className="hidden text-right lg:table-cell"><button className="icon-btn icon-btn-danger" onClick={() => setConfirmRemove(r)} aria-label={`Remove ${r.name} from this subject`}><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {roster.data.length === 0 && (
                    <EmptyState>
                      No students in this subject yet.
                      {summer && (
                        <button className="mt-2 hidden text-[13px] font-semibold text-accent lg:block" onClick={async () => { setActionError(""); try { await removeSummerSubject(offering.id); setOfferingId(null); refresh(); } catch (err) { setActionError(err.message); } }}>
                          Take this subject out of the summer
                        </button>
                      )}
                    </EmptyState>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {editingSeats && offering && <SubjectCapacityModal section={section} offering={offering} onClose={() => setEditingSeats(false)} onSaved={() => { setEditingSeats(false); refresh(); }} />}
      {addingSubject && section && <SummerSubjectModal section={section} onClose={() => setAddingSubject(false)} onAdded={() => { setAddingSubject(false); refresh(); }} />}
      {editingCap && section && <CapacityModal section={section} onClose={() => setEditingCap(false)} onSaved={() => { setEditingCap(false); refresh(); }} />}
      {confirmRemove && (
        <Modal title="Remove from subject?" onClose={() => setConfirmRemove(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setConfirmRemove(null)}>Cancel</button><button className="btn btn-danger" onClick={doRemove}>Remove</button></>}>
          <p className="text-[14px] text-ink-2">{confirmRemove.name} will be removed from {offering.curriculum_subjects.code}. If the subject already has grades, they are removed with it, and the removal is saved in the grade change history on the student&apos;s record.</p>
          <div className="mt-3"><FormError error={actionError} /></div>
        </Modal>
      )}
    </>
  );
}
