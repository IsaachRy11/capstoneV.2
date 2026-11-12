import { useState } from "react";
import { createStudent } from "../../services/students";
import { FormError, Modal } from "../../components/ui";
import { STUDENT_TYPE, yearLabel } from "../../lib/format";

export default function AddStudentModal({ programs, sections = [], term, onClose, onCreated }) {
  const [form, setForm] = useState({ id: "", first_name: "", last_name: "", email: "", programId: programs[0]?.id ?? "", year_level: 1, admission_type: "new", sectionId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Changing program or year changes which sections apply, so the section choice starts over.
  const setGroup = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, sectionId: "" }));
  const program = programs.find((p) => String(p.id) === String(form.programId));
  const sectionsHere = sections.filter((x) => x.program_code === program?.code && x.year_level === Number(form.year_level));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}-\d{4}$/.test(form.id.trim())) return setError("Student ID must look like 2026-0001.");
    setBusy(true);
    setError("");
    try {
      const { sectionName, loginCreated } = await createStudent({ ...form, programId: Number(form.programId), year_level: Number(form.year_level), sectionId: form.sectionId ? Number(form.sectionId) : null }, term);
      onCreated(`${form.first_name} ${form.last_name} was added${sectionName ? ` to ${sectionName} and enrolled in its classes` : ""}. ${loginCreated ? "They can sign in with their student ID." : "Their login could not be created; run npm run accounts:students."}`);
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
          <select id="sprog" className="field" value={form.programId} onChange={setGroup("programId")}>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="syear">Year level</label>
          <select id="syear" className="field" value={form.year_level} onChange={setGroup("year_level")}>
            {Array.from({ length: program?.duration_years || 4 }, (_, i) => <option key={i + 1} value={i + 1}>{yearLabel(i + 1)}</option>)}
          </select>
        </div>
        {sectionsHere.length > 0 && (
          <div className="col-span-2">
            <label className="label" htmlFor="ssec">Section</label>
            <select id="ssec" className="field" value={form.sectionId} onChange={set("sectionId")}>
              <option value="">Automatic (the section with the most free seats)</option>
              {sectionsHere.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.capacity - x.enrolled} seats free</option>)}
            </select>
          </div>
        )}
        <div className="col-span-2">
          <label className="label" htmlFor="sadm">Student type</label>
          <select id="sadm" className="field" value={form.admission_type} onChange={set("admission_type")}>
            {Object.entries(STUDENT_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <p className="col-span-2 text-[13px] text-ink-3">They're placed in their block section for this semester and enrolled in its classes. Their sign-in is created automatically: they use their student ID and the starting password from the CCS office.</p>
        <div className="col-span-2"><FormError error={error} /></div>
      </form>
    </Modal>
  );
}
