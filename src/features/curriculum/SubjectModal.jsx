import { useState } from "react";
import { addCurriculumSubject, updateCurriculumSubject } from "../../services/catalog";
import { FormError, Modal } from "../../components/ui";
import { inferSubjectKind, yearLabel } from "../../lib/format";

// Add (subject = null) or edit an existing subject.
export default function SubjectModal({ program, subject, onClose, onSaved }) {
  const editing = Boolean(subject);
  const [form, setForm] = useState(
    editing
      ? { year_level: subject.year_level, semester: subject.semester, code: subject.code, title: subject.title, units: Number(subject.units) }
      : { year_level: 1, semester: 1, code: "", title: "", units: 3 }
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = {
      ...form, year_level: Number(form.year_level), semester: Number(form.semester),
      units: Number(form.units), kind: inferSubjectKind(form.code, form.title),
    };
    try {
      if (editing) await updateCurriculumSubject(subject.id, fields);
      else await addCurriculumSubject({ ...fields, programCode: program.code });
      onSaved();
    } catch (err) {
      setError(err.code === "23505" ? `${form.code} is already in the ${program.code} curriculum.` : err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? `Edit ${subject.code}` : `Add subject to ${program.code}`} onClose={onClose} width="max-w-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" type="submit" form="subject-form" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add subject"}</button>
      </>}>
      <form id="subject-form" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div><label className="label" htmlFor="cy">Year level</label>
          <select id="cy" className="field" value={form.year_level} onChange={set("year_level")}>{Array.from({ length: program.duration_years }, (_, i) => <option key={i} value={i + 1}>{yearLabel(i + 1)}</option>)}</select></div>
        <div><label className="label" htmlFor="cs">Semester</label>
          <select id="cs" className="field" value={form.semester} onChange={set("semester")}><option value={1}>1st Semester</option><option value={2}>2nd Semester</option><option value={3}>Summer</option></select></div>
        <div><label className="label" htmlFor="cc">Code</label><input id="cc" className="field font-mono" placeholder="IT 307" value={form.code} onChange={set("code")} required /></div>
        <div><label className="label" htmlFor="cu">Units</label><input id="cu" type="number" min={0.5} step={0.5} className="field font-mono" value={form.units} onChange={set("units")} required /></div>
        <div className="col-span-2"><label className="label" htmlFor="ct">Title</label><input id="ct" className="field" value={form.title} onChange={set("title")} required /></div>
        {editing && <p className="col-span-2 text-[13px] text-ink-3">Changes show up right away for students in this program (curriculum, subject tracker and grades).</p>}
        <div className="col-span-2"><FormError error={error} /></div>
      </form>
    </Modal>
  );
}
