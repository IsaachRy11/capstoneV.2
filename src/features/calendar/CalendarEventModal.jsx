import { useState } from "react";
import { deleteCalendarEvent, saveCalendarEvent } from "../../services/catalog";
import { EVENT_KINDS } from "../../lib/calendar";
import { FormError, Modal } from "../../components/ui";

// Secretary: add a date to the school calendar, change one, or remove one. `event` is null when adding.
export default function CalendarEventModal({ event, onClose, onSaved }) {
  const [title, setTitle] = useState(event?.title || "");
  const [kind, setKind] = useState(event?.kind || "school");
  const [starts, setStarts] = useState(event?.starts_on || "");
  const [ends, setEnds] = useState(event?.ends_on && event.ends_on !== event.starts_on ? event.ends_on : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); onSaved(); } catch (err) { setError(err.message); setBusy(false); }
  };
  const save = (e) => {
    e.preventDefault();
    if (!title.trim() || !starts) return setError("Enter a title and the date it starts.");
    const last = ends || starts;
    if (last < starts) return setError("It can't end before it starts.");
    run(() => saveCalendarEvent({ id: event?.id, title, kind, starts_on: starts, ends_on: last }));
  };

  return (
    <Modal title={event ? "Edit calendar date" : "Add calendar date"} onClose={onClose}
      footer={confirmDelete ? (
        <>
          <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Keep it</button>
          <button className="btn btn-danger" disabled={busy} onClick={() => run(() => deleteCalendarEvent(event.id))}>{busy ? "Deleting…" : "Delete date"}</button>
        </>
      ) : (
        <>
          {event && <button className="btn btn-danger mr-auto" type="button" onClick={() => setConfirmDelete(true)}>Delete</button>}
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="cal-form" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </>
      )}>
      {confirmDelete ? (
        <p className="text-[14px] text-ink-2">Delete “{event.title}” from the school calendar? Students and the class-day notices stop showing it right away.</p>
      ) : (
        <form id="cal-form" onSubmit={save} className="flex flex-col gap-3">
          <label className="label" htmlFor="cal-title">Title</label>
          <input id="cal-title" className="field" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Midterm Exams" />
          <label className="label" htmlFor="cal-kind">Type</label>
          <select id="cal-kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(EVENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><label className="label" htmlFor="cal-start">Starts</label><input id="cal-start" type="date" className="field" value={starts} onChange={(e) => setStarts(e.target.value)} /></div>
            <div className="flex flex-col gap-1.5"><label className="label" htmlFor="cal-end">Ends</label><input id="cal-end" type="date" className="field" value={ends} min={starts} onChange={(e) => setEnds(e.target.value)} /></div>
          </div>
          <p className="text-[12px] text-ink-3">Leave “Ends” empty for a single day. Breaks and holidays switch the class-day notices to “No classes”; exams show “Exam week”.</p>
          <FormError error={error} />
        </form>
      )}
    </Modal>
  );
}
