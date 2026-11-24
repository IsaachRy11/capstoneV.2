import { useState } from "react";
import { addMeeting, updateMeeting } from "../../services/sections";
import { FormError, Modal } from "../../components/ui";
import { DAY_NAMES, SCHOOL_DAYS, hhmm } from "../../lib/schedule";

// Add (meeting = null) or edit one class time. Clashes come back from the database as readable messages.
export default function MeetingModal({ offering, meeting, rooms, onClose, onSaved }) {
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
          <select id="md" className="field" value={form.weekday} onChange={set("weekday")}>{SCHOOL_DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}</select></div>
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
