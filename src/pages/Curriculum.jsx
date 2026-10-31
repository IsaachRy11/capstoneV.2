import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { addCurriculumSubject, deleteCurriculumSubject, getCurriculum, getPrograms, updateCurriculumSubject } from "../services/catalog";
import { getStudent } from "../services/students";
import { ErrorState, FormError, LoadingState, Modal, PageHeader } from "../components/ui";
import { inferSubjectKind, semesterLabel, sumUnits, yearLabel } from "../lib/format";

// Add (subject = null) or edit an existing subject.
function SubjectModal({ program, subject, onClose, onSaved }) {
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

function DeleteSubjectModal({ subject, onClose, onDeleted }) {
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

export default function Curriculum() {
  const { user } = useAuth();
  const isSecretary = user.role === "secretary";
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null);   // null | "new" | subject
  const [deleting, setDeleting] = useState(null); // null | subject

  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, rows, me] = await Promise.all([
      getPrograms(), getCurriculum(), isSecretary ? null : getStudent(user.studentId),
    ]);
    return { programs, rows, myProgram: me?.program_code };
  }, [isSecretary, user.studentId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const code = isSecretary ? params.get("program") || data.programs[0]?.code : data.myProgram;
  const program = data.programs.find((p) => p.code === code) || data.programs[0];
  const subjects = data.rows.filter((r) => r.curricula.programs.code === program.code);
  const years = [...new Set(subjects.map((s) => s.year_level))].sort();

  return (
    <>
      <PageHeader showTitle
        title={program.name}
        subtitle={`${subjects.length} subjects · ${sumUnits(subjects)} units · ${program.duration_years} years`}
        actions={isSecretary && <button className="btn btn-primary" onClick={() => setEditing("new")}><Plus size={16} aria-hidden="true" />Add subject</button>}
      />

      {isSecretary && (
        <div className="seg self-start" role="group" aria-label="Program">
          {data.programs.map((p) => <button key={p.code} aria-pressed={p.code === program.code} onClick={() => setParams({ program: p.code })}>{p.code}</button>)}
        </div>
      )}

      {years.map((y) => (
        <section key={y} className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold">{yearLabel(y)}</h2>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))]">
            {[...new Set(subjects.filter((s) => s.year_level === y).map((s) => s.semester))].sort().map((sem) => {
              const rows = subjects.filter((s) => s.year_level === y && s.semester === sem);
              return (
                <div key={sem} className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                    <h3 className="text-[15px] font-bold">{semesterLabel(sem)}</h3>
                    <span className="font-mono text-[13px] text-ink-2">{sumUnits(rows)} units</span>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>Code</th><th>Subject</th><th className="!text-center">Units</th>{isSecretary && <th><span className="sr-only">Actions</span></th>}</tr></thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap font-mono text-[13px] text-accent">{s.code}</td>
                          <td className="font-medium">{s.title}</td>
                          <td className="num">{Number(s.units)}</td>
                          {isSecretary && (
                            <td className="whitespace-nowrap px-2 text-right">
                              <button className="icon-btn h-9 w-9" onClick={() => setEditing(s)} aria-label={`Edit ${s.code}`} title="Edit"><Pencil size={15} /></button>
                              <button className="icon-btn icon-btn-danger h-9 w-9" onClick={() => setDeleting(s)} aria-label={`Delete ${s.code}`} title="Delete"><Trash2 size={15} /></button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {editing && (
        <SubjectModal program={program} subject={editing === "new" ? null : editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
      {deleting && <DeleteSubjectModal subject={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); reload(); }} />}
    </>
  );
}
