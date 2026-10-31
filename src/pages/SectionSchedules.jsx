import { useState } from "react";
import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { getPrograms } from "../services/catalog";
import { addMeeting, deleteMeeting, getRooms, getSectionOfferings, listCurrentSections, updateMeeting } from "../services/sections";
import { EmptyState, ErrorState, FormError, LoadingState, Modal, PageHeader } from "../components/ui";
import WeekTimetable from "../components/WeekTimetable";
import { sumUnits, timeRange, yearLabel } from "../lib/format";

const DAYS = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"]];
const SHORT_DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hhmm = (t) => (t ? t.slice(0, 5) : "");

// Add (meeting = null) or edit one class time. Clashes come back from the database as readable messages.
function MeetingModal({ offering, meeting, rooms, onClose, onSaved }) {
  const editing = Boolean(meeting);
  const [form, setForm] = useState({
    weekday: meeting?.weekday ?? 1,
    starts_at: hhmm(meeting?.starts_at) || "07:30",
    ends_at: hhmm(meeting?.ends_at) || "08:30",
    room_id: meeting?.room_id ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (form.ends_at <= form.starts_at) return setError("The end time must be after the start time.");
    setBusy(true);
    setError("");
    const fields = { weekday: Number(form.weekday), starts_at: form.starts_at, ends_at: form.ends_at, room_id: form.room_id ? Number(form.room_id) : null };
    try {
      if (editing) await updateMeeting(meeting.id, fields);
      else await addMeeting(offering.id, fields);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const code = offering.curriculum_subjects.code;
  return (
    <Modal title={editing ? `Change ${code} class time` : `Add a class time for ${code}`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="submit" form="meeting-form" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add time"}</button>
      </>}>
      <form id="meeting-form" onSubmit={save} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label" htmlFor="md">Day</label>
          <select id="md" className="field" value={form.weekday} onChange={set("weekday")}>{DAYS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="ms">Starts</label><input id="ms" type="time" step={900} className="field font-mono" value={form.starts_at} onChange={set("starts_at")} required /></div>
        <div><label className="label" htmlFor="me">Ends</label><input id="me" type="time" step={900} className="field font-mono" value={form.ends_at} onChange={set("ends_at")} required /></div>
        <div className="col-span-2"><label className="label" htmlFor="mr">Room</label>
          <select id="mr" className="field" value={form.room_id} onChange={set("room_id")}>
            <option value="">Room TBA</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}{r.is_shared ? " (shared)" : ""}</option>)}
          </select></div>
        <p className="col-span-2 text-[13px] text-ink-3">Students in this class see the new time on their schedule right away.</p>
        <div className="col-span-2"><FormError error={error} /></div>
      </form>
    </Modal>
  );
}

function ClassTimes({ offerings, rooms, onChanged }) {
  const [editing, setEditing] = useState(null);   // { offering, meeting | null }
  const [removing, setRemoving] = useState(null); // { offering, meeting }
  const [error, setError] = useState("");

  const remove = async () => {
    setError("");
    try {
      await deleteMeeting(removing.meeting.id);
      setRemoving(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="card no-print overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[17px] font-bold">Class times</h2>
        <p className="mt-1 text-[13px] text-ink-3">Add, change or remove when and where each subject meets. Clashes are blocked automatically.</p>
      </div>
      <ul>
        {offerings.map((o) => {
          const meetings = [...o.class_meetings].sort((a, b) => a.weekday - b.weekday || a.starts_at.localeCompare(b.starts_at));
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line-2 px-5 py-4 last:border-0">
              <div className="min-w-[200px] flex-[1_1_220px]">
                <span className="block font-mono text-[12px] text-accent">{o.curriculum_subjects.code}</span>
                <span className="block text-[14px] font-medium text-ink">{o.curriculum_subjects.title}</span>
              </div>
              <div className="flex flex-[3_1_420px] flex-wrap items-center gap-2">
                {meetings.length === 0 && <span className="text-[13px] text-ink-3">No class times yet</span>}
                {meetings.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 py-1 pl-3 pr-1 text-[13px]">
                    <span className="font-semibold text-ink">{SHORT_DAY[m.weekday]}</span>
                    <span className="text-ink-2">{timeRange(m.starts_at, m.ends_at)} · {m.rooms?.name || "Room TBA"}</span>
                    <button className="icon-btn h-8 w-8" onClick={() => setEditing({ offering: o, meeting: m })} aria-label={`Change ${o.curriculum_subjects.code} on ${SHORT_DAY[m.weekday]}`} title="Change"><Pencil size={14} /></button>
                    <button className="icon-btn icon-btn-danger h-8 w-8" onClick={() => { setError(""); setRemoving({ offering: o, meeting: m }); }} aria-label={`Remove ${o.curriculum_subjects.code} on ${SHORT_DAY[m.weekday]}`} title="Remove"><Trash2 size={14} /></button>
                  </span>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ offering: o, meeting: null })}><Plus size={14} aria-hidden="true" />Add time</button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <MeetingModal offering={editing.offering} meeting={editing.meeting} rooms={rooms}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />
      )}
      {removing && (
        <Modal title="Remove this class time?" onClose={() => setRemoving(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setRemoving(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}>Remove</button></>}>
          <p className="text-[14px] text-ink-2">
            {removing.offering.curriculum_subjects.code} on {DAYS.find(([d]) => d === removing.meeting.weekday)?.[1]}, {timeRange(removing.meeting.starts_at, removing.meeting.ends_at)} will be removed from the schedule. Students in this class will stop seeing it.
          </p>
          <div className="mt-3"><FormError error={error} /></div>
        </Modal>
      )}
    </section>
  );
}

// Secretary: weekly timetable of each block section (current semester), with class-time editing.
export default function SectionSchedules() {
  const [programCode, setProgramCode] = useState(null);
  const [year, setYear] = useState(1);

  const base = useAsync(async () => {
    const [programs, sections, rooms] = await Promise.all([getPrograms(), listCurrentSections(), getRooms()]);
    return { programs, sections, rooms };
  }, []);

  const program = base.data?.programs.find((p) => p.code === programCode) || base.data?.programs[0];
  const section = base.data?.sections.find((s) => s.program_code === program?.code && s.year_level === year);
  const offerings = useAsync(() => (section ? getSectionOfferings(section.id) : Promise.resolve([])), [section?.id]);

  if (base.loading) return <LoadingState />;
  if (base.error) return <ErrorState error={base.error} onRetry={base.reload} />;

  const items = (offerings.data || []).map((o) => ({
    id: o.id,
    code: o.curriculum_subjects.code,
    title: o.curriculum_subjects.title,
    units: o.curriculum_subjects.units,
    meetings: o.class_meetings,
  }));

  return (
    <>
      <PageHeader title="Schedules"
        actions={items.length > 0 && <button className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print schedule</button>} />

      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="seg" role="group" aria-label="Program">
          {base.data.programs.map((p) => (
            <button key={p.code} aria-pressed={p.code === program.code} onClick={() => { setProgramCode(p.code); if (year > p.duration_years) setYear(1); }}>{p.code}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Year level">
          {Array.from({ length: program.duration_years }, (_, i) => i + 1).map((y) => (
            <button key={y} aria-pressed={y === year} onClick={() => setYear(y)}>{yearLabel(y)}</button>
          ))}
        </div>
      </div>

      {!section ? (
        <div className="card"><EmptyState>No {program.code} {yearLabel(year)} section this semester.</EmptyState></div>
      ) : offerings.loading ? (
        <LoadingState />
      ) : offerings.error ? (
        <ErrorState error={offerings.error} onRetry={offerings.reload} />
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-[19px] font-bold">{section.name}</h2>
            <span className="text-[14px] text-ink-3">
              {items.length} {items.length === 1 ? "subject" : "subjects"} · {sumUnits(items)} units · {section.home_room || "Room TBA"} · {section.enrolled} of {section.capacity} seats filled
            </span>
          </div>
          <WeekTimetable items={items} emptyText="No classes scheduled for this section yet." />
          <ClassTimes offerings={offerings.data} rooms={base.data.rooms} onChanged={offerings.reload} />
        </>
      )}
    </>
  );
}
