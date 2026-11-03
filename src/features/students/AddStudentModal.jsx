import { useState } from "react";
import { createStudent } from "../../services/students";
import { FormError, Modal } from "../../components/ui";
import { STUDENT_TYPE, yearLabel } from "../../lib/format";

export default function AddStudentModal({ programs, term, onClose, onCreated }) {
  const [form, setForm] = useState({ id: "", first_name: "", last_name: "", email: "", programId: programs[0]?.id ?? "", year_level: 1, admission_type: "new" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const program = programs.find((p) => String(p.id) === String(form.programId));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}-\d{4}$/.test(form.id.trim())) return setError("Student ID must look like 2026-0001.");
    setBusy(true);
    setError("");
    try {
      const { sectionName } = await createStudent({ ...form, programId: Number(form.programId), year_level: Number(form.year_level) }, term);
      onCreated(`${form.first_name} ${form.last_name} was added${sectionName ? ` to ${sectionName} and enrolled in its classes` : ""}.`);
    } catch (err) {
      setError(err.code === "23505" ? "A student with this ID or email already exists." : err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Add student" onClose={onClose} width="max-w-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="submit" form="add-student" disabled={busy}>{busy ? "Adding…" : "Add student"}</button>
      </>}>
      <form id="add-student" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="sid">Student ID</label><input id="sid" className="field font-mono" placeholder="2026-0001" value={form.id} onChange={set("id")} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="semail">Email</label><input id="semail" type="email" className="field" value={form.email} onChange={set("email")} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="sfirst">First name</label><input id="sfirst" className="field" value={form.first_name} onChange={set("first_name")} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="label" htmlFor="slast">Last name</label><input id="slast" className="field" value={form.last_name} onChange={set("last_name")} required /></div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="sprog">Program</label>
          <select id="sprog" className="field" value={form.programId} onChange={set("programId")}>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="syear">Year level</label>
          <select id="syear" className="field" value={form.year_level} onChange={set("year_level")}>
            {Array.from({ length: program?.duration_years || 4 }, (_, i) => <option key={i + 1} value={i + 1}>{yearLabel(i + 1)}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="sadm">Student type</label>
          <select id="sadm" className="field" value={form.admission_type} onChange={set("admission_type")}>
            {Object.entries(STUDENT_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <p className="col-span-2 text-[13px] text-ink-3">They're placed in their block section for this semester and enrolled in its classes. To let them sign in, add a login with the same email under Authentication in Supabase.</p>
        <div className="col-span-2"><FormError error={error} /></div>
      </form>
    </Modal>
  );
}
