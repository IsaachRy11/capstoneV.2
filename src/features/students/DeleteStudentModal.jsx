import { useState } from "react";
import { deleteStudent } from "../../services/students";
import { FormError, Modal } from "../../components/ui";

export default function DeleteStudentModal({ student, onClose, onDeleted }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteStudent(student.id);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title={`Delete ${student.full_name}?`} onClose={onClose}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete student"}</button>
      </>}>
      <p className="text-[14px] text-ink-2">This removes {student.full_name} ({student.id}), their section registration, their classes and their sign-in. Use it only for a student added by mistake.</p>
      <p className="mt-2 text-[14px] text-ink-2">A student who already has grades can't be deleted. Mark them as Dropped (or Graduated) instead.</p>
      <div className="mt-3"><FormError error={error} /></div>
    </Modal>
  );
}
