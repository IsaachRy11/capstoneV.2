import { useState } from "react";
import { resetStudentPassword } from "../../services/students";
import { FormError, Modal } from "../../components/ui";

export default function ResetPasswordModal({ student, onClose }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const reset = async () => {
    setBusy(true);
    setError("");
    try {
      setPassword(await resetStudentPassword(student.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(password); setCopied(true); } catch { /* the password is on screen to copy by hand */ }
  };

  return (
    <Modal title={password ? "Password reset" : `Reset ${student.full_name}'s password?`} onClose={onClose}
      footer={password
        ? <button className="btn btn-primary" onClick={onClose}>Done</button>
        : <>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={reset} disabled={busy}>{busy ? "Resetting…" : "Reset password"}</button>
          </>}>
      {password ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="rounded-lg px-4 py-3 text-[14px] tone-ok">{student.full_name}'s password was reset.</p>
          <p className="text-[14px] text-ink-2">Give the student this one-time password. It is shown only now. They sign in with their student ID ({student.id}) and will be asked to choose their own password.</p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
            <span className="select-all font-mono text-[18px] font-semibold tracking-wide">{password}</span>
            <button className="btn btn-secondary btn-sm" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[14px] text-ink-2">This replaces their current password with a new one-time password. The student must choose their own password the next time they sign in. Do this only after checking who they are at the CCS office.</p>
          <div className="mt-3"><FormError error={error} /></div>
        </>
      )}
    </Modal>
  );
}
