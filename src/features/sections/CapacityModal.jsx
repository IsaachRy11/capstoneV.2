import { useState } from "react";
import { updateSectionCapacity } from "../../services/sections";
import { FormError, Modal } from "../../components/ui";

export default function CapacityModal({ section, onClose, onSaved }) {
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
    <Modal title={`Seats for all subjects in ${section.name}`} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" form="cap-form" disabled={busy}>{busy ? "Saving…" : "Save capacity"}</button></>}>
      <form id="cap-form" onSubmit={save} className="flex flex-col gap-3">
        <p className="text-[13px] text-ink-3">Subjects that have their own number of seats keep it. To set one subject on its own, pick it and use Change seats.</p>
        <label className="label" htmlFor="cap">Seats for every subject without its own number</label>
        <input id="cap" type="number" min={1} className="field font-mono" value={value} onChange={(e) => setValue(e.target.value)} />
        <FormError error={error} />
      </form>
    </Modal>
  );
}
