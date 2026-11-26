import { useState } from "react";
import { createStudent } from "../../services/students";
import { FormError, Modal } from "../../components/ui";
import { ADMISSION_FOR_TYPE, STUDENT_TYPE, yearLabel } from "../../lib/format";

export default function AddStudentModal({ programs, term, onClose, onCreated }) {
  const [form, setForm] = useState({ id: "", first_name: "", last_name: "", programId: programs[0]?.id ?? "", year_level: 1, studentType: "freshman" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setGroup = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // A Freshman is a first-time 1st year student: moving the year away from 1st switches to Transferee.
  const setYear = (e) => setForm((f) => { const y = Number(e.target.value); return { ...f, year_level: y, studentType: y !== 1 && f.studentType === "freshman" ? "transferee" : f.studentType }; });
  const program = programs.find((p) => String(p.id) === String(form.programId));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}-\d{4}$/.test(form.id.trim())) return setError("Student ID must look like 2026-0001.");
    setBusy(true);
    setError("");
    try {
      const { loginCreated, tempPassword } = await createStudent({ ...form, admission_type: ADMISSION_FOR_TYPE[form.studentType], programId: Number(form.programId), year_level: Number(form.year_level) }, term);
      const login = tempPassword
        ? ` Their temporary password is ${tempPassword}. They sign in with their student ID, then choose their own password.`
        : loginCreated ? " They can sign in with their student ID." : " Their login could not be created; open their record and use Reset password.";
      onCreated(`${form.first_name} ${form.last_name} was created. Add them to their subjects on Section allocations.${login}`);
    } catch (err) {
      setError(err.code === "23505" ? "A student with this ID already exists." : err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Create student" onClose={onClose} width="max-w-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="submit" form="add-student" disabled={busy}>{busy ? "Creating…" : "Create student"}</button>
      </>}>
      <form id="add-student" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label" htmlFor="sid">Student ID</label><input id="sid" className="field font-mono" placeholder="2026-0001" value={form.id} onChange={set("id")} required /></div>
                <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="sfirst">First name</label><input id="sfirst" className="field" value={form.first_name} onChange={set("first_name")} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="slast">Last name</label><input id="slast" className="field" value={form.last_name} onChange={set("last_name")} required /></div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="sprog">Program</label>
          <select id="sprog" className="field" value={form.programId} onChange={setGroup("programId")}>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="syear">Year level</label>
          <select id="syear" className="field" value={form.year_level} onChange={setYear}>
            {Array.from({ length: program?.duration_years || 4 }, (_, i) => <option key={i + 1} value={i + 1}>{yearLabel(i + 1)}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="sadm">Student type</label>
          <select id="sadm" className="field" value={form.studentType} onChange={set("studentType")}>
            {Object.entries(STUDENT_TYPE).filter(([v]) => v !== "continuing").map(([v, l]) => <option key={v} value={v} disabled={v === "freshman" && Number(form.year_level) !== 1}>{l}</option>)}
          </select>
          <p className="mt-1.5 text-[12px] text-ink-3">Freshman: a first-time 1st year student. Transferee: from another school. Shiftee: from another program. A student already here becomes Continuing automatically.</p>
        </div>
        <div className="col-span-2"><FormError error={error} /></div>
      </form>
    </Modal>
  );
}
