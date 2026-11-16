import { useState } from "react";
import { updateOfferingCapacity } from "../../services/sections";
import { FormError, Modal } from "../../components/ui";

// Seats for ONE subject of a section. Empty means "same as the section" (the default for every subject).
export default function SubjectCapacityModal({ section, offering, onClose, onSaved }) {
  const own = offering.capacity !== null && offering.capacity !== undefined;
  const [value, setValue] = useState(own ? offering.capacity : section.capacity);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const subject = offering.curriculum_subjects;
  const least = Math.max(1, offering.enrolled);

  const save = async (capacity) => {
    setBusy(true);
    setError("");
    try {
      await updateOfferingCapacity(offering.id, capacity);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < least) return setError(`Enter a whole number of at least ${least} (students already in this class).`);
    save(n);
  };

  return (
    <Modal title={`Seats for ${subject.code}`} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" form="subject-cap-form" disabled={busy}>{busy ? "Saving…" : "Save seats"}</button></>}>
      <form id="subject-cap-form" onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-[14px] text-ink-2">{subject.title} · {section.name}. {offering.enrolled} {offering.enrolled === 1 ? "student is" : "students are"} in this class.</p>
        <label className="label" htmlFor="subject-cap">Seats in this subject</label>
        <input id="subject-cap" type="number" min={least} className="field font-mono" value={value} onChange={(e) => setValue(e.target.value)} />
        {own ? (
          <button type="button" className="self-start text-[13px] font-semibold text-accent" onClick={() => save(null)} disabled={busy}>
            Use the section's {section.capacity} seats instead
          </button>
        ) : (
          <p className="text-[13px] text-ink-3">Right now this subject follows the section's {section.capacity} seats. Saving a number gives it its own.</p>
        )}
        <FormError error={error} />
      </form>
    </Modal>
  );
}
