import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteMeeting } from "../../services/sections";
import { FormError, Modal } from "../../components/ui";
import { DAY_NAMES, DAY_SHORT, timeRange } from "../../lib/schedule";
import MeetingModal from "./MeetingModal";

export default function ClassTimes({ offerings, rooms, onChanged }) {
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
                    <span className="font-semibold text-ink">{DAY_SHORT[m.weekday]}</span>
                    <span className="text-ink-2">{timeRange(m.starts_at, m.ends_at)} · {m.rooms?.name || "Room TBA"}</span>
                    <button className="icon-btn h-8 w-8" onClick={() => setEditing({ offering: o, meeting: m })} aria-label={`Change ${o.curriculum_subjects.code} on ${DAY_SHORT[m.weekday]}`} title="Change"><Pencil size={14} /></button>
                    <button className="icon-btn icon-btn-danger h-8 w-8" onClick={() => { setError(""); setRemoving({ offering: o, meeting: m }); }} aria-label={`Remove ${o.curriculum_subjects.code} on ${DAY_SHORT[m.weekday]}`} title="Remove"><Trash2 size={14} /></button>
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
            {removing.offering.curriculum_subjects.code} on {DAY_NAMES[removing.meeting.weekday]}, {timeRange(removing.meeting.starts_at, removing.meeting.ends_at)} will be removed from the schedule. Students in this class will stop seeing it.
          </p>
          <div className="mt-3"><FormError error={error} /></div>
        </Modal>
      )}
    </section>
  );
}
