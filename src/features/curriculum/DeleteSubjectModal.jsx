import { useState } from "react";
import { deleteCurriculumSubject } from "../../services/catalog";
import { FormError, Modal } from "../../components/ui";

export default function DeleteSubjectModal({ subject, onClose, onDeleted }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteCurriculumSubject(subject.id);
      onDeleted();
    } catch (err) {
      setError(err.code === "23503"
        ? `${subject.code} can't be deleted because it's on a class schedule or students already have grades in it. Their records are kept safe.`
        : err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title={`Delete ${subject.code}?`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete subject"}</button>
      </>}>
      <p className="text-[14px] text-ink-2">{subject.code} {subject.title} will be removed from the curriculum. Students in this program will no longer see it in their subject tracker.</p>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
