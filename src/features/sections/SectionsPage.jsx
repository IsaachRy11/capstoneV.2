import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { useSectionPicker } from "../../hooks/useSectionPicker";
import SectionPicker from "../../components/SectionPicker";
import { getRoster, getSectionOfferings, removeEnrollment } from "../../services/sections";
import WeekStrip from "../schedules/WeekStrip";
import { Avatar, EmptyState, ErrorState, FormError, LoadingState, Modal, PageHeader, StandingBadge } from "../../components/ui";
import { yearLabel } from "../../lib/format";
import { meetingDays } from "../../lib/schedule";
import EnrollBox from "./EnrollBox";
import CapacityModal from "./CapacityModal";

export default function Sections() {
  const picker = useSectionPicker();
  const { program, year, section } = picker;
  const [offeringId, setOfferingId] = useState(null);
  const [editingCap, setEditingCap] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
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
        <div className="card"><EmptyState>No {program.code} {yearLabel(year)} section this semester.</EmptyState></div>
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
                </button>
              ))}
            </div>
          </section>
          <section aria-label="Subjects" className="card hidden flex-[1_1_320px] flex-col gap-0.5 p-2 sm:flex">
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-2.5">
              <span className="text-[12px] font-semibold text-ink-3">{section.name} · {offerings.data?.length ?? "…"} subjects</span>
              <button className="hidden min-h-10 items-center text-[13px] font-semibold text-accent lg:inline-flex" onClick={() => setEditingCap(true)}>Capacity {section.enrolled} / {section.capacity}</button>
              <span className="font-mono text-[13px] font-semibold text-ink-2 lg:hidden">{section.enrolled} / {section.capacity} seats</span>
            </div>
            {offerings.loading && <LoadingState />}
            {offerings.error && <ErrorState error={offerings.error} onRetry={offerings.reload} />}
            {offerings.data?.map((o) => {
              const on = o.id === offering?.id;
              return (
                <button key={o.id} aria-pressed={on} onClick={() => setOfferingId(o.id)}
                  className={`flex w-full items-center gap-3.5 rounded-[10px] border px-4 py-3.5 text-left ${on ? "border-accent bg-tint" : "border-transparent hover:bg-hover"}`}>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-mono text-[13px] text-accent">{o.curriculum_subjects.code}</span>
                    <span className="text-[14px] font-semibold leading-snug text-ink">{o.curriculum_subjects.title}</span>
                    <span className="text-[12px] text-ink-3">{Number(o.curriculum_subjects.units)} units · {meetingDays(o.class_meetings) || "To be arranged"}</span>
                  </div>
                  {o.enrolled !== section.enrolled && (
                    <span className="whitespace-nowrap font-mono text-[12px] text-ink-2" title="Differs from the section because of irregular students">{o.enrolled} / {o.capacity ?? section.capacity}</span>
                  )}
                </button>
              );
            })}
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
                </div>
                <WeekStrip meetings={offering.class_meetings} className="sm:min-w-[420px] sm:flex-[2_1_480px]" />
              </div>

              <EnrollBox key={offering.id} section={section} offering={offering} rosterIds={new Set((roster.data || []).map((r) => r.student_id))} onEnrolled={refresh} />

              {roster.loading ? <LoadingState /> : roster.error ? <div className="p-5"><ErrorState error={roster.error} onRetry={roster.reload} /></div> : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Student</th><th className="hidden sm:table-cell">Student ID</th><th>Standing</th><th className="hidden lg:table-cell"><span className="sr-only">Remove</span></th></tr></thead>
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
                          <td><StandingBadge standing={r.standing} /></td>
                          <td className="hidden text-right lg:table-cell"><button className="icon-btn icon-btn-danger" onClick={() => setConfirmRemove(r)} aria-label={`Remove ${r.name} from this class`}><Trash2 size={16} /></button></td>
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
          <p className="text-[14px] text-ink-2">{confirmRemove.name} will be removed from {offering.curriculum_subjects.code}. This only works for a class added by mistake: once a class has a grade or a status, mark it Dropped on the student's record instead so the history is kept.</p>
          <div className="mt-3"><FormError error={actionError} /></div>
        </Modal>
      )}
    </>
  );
}
