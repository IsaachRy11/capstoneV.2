import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { createStudent } from "../../services/students";
import { FormError, Modal } from "../../components/ui";
import { ADMISSION_FOR_TYPE, STUDENT_TYPE } from "../../lib/format";
import { loginEmail } from "../../lib/login";
import { parseStudentRows } from "../../lib/bulkStudents";
import { downloadFile, toCsv } from "../../lib/csv";

// Secretary: add many students at once (a new intake) from a pasted or uploaded list. Each student is created exactly
// like "Create student": placed in their block section with its classes, with a sign-in and a one-time password.
// Rows with a problem are shown and skipped; the rest are created one by one, so a failure never blocks the others.
const EXAMPLE = "Student ID,Last name,First name,Program,Year level,Student type\n2027-0001,Reyes,Ana,BSIT,1,Freshman\n2027-0002,Cruz,Ben,BSCS,1,Freshman\n2027-0003,Lim,Cy,ACT,2,Transferee";

export default function BulkAddStudentsModal({ programs, existingIds, onClose, onDone }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null); // { done, total }
  const [results, setResults] = useState(null);
  const fileRef = useRef(null);

  const good = rows?.filter((r) => r.errors.length === 0) ?? [];
  const bad = rows?.filter((r) => r.errors.length > 0) ?? [];
  const busy = progress !== null && results === null;

  const readFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setRows(null);
    e.target.value = "";
  };
  const check = () => {
    setError("");
    const parsed = parseStudentRows(text, programs, existingIds);
    if (parsed.length === 0) return setError("Paste the students first: one per line.");
    setRows(parsed);
  };

  const create = async () => {
    setProgress({ done: 0, total: good.length });
    const out = [];
    for (const r of good) {
      try {
        const res = await createStudent({
          id: r.id, first_name: r.first_name, last_name: r.last_name, email: loginEmail(r.id),
          programId: Number(r.programId), year_level: r.year_level, admission_type: ADMISSION_FOR_TYPE[r.studentType],
        });
        out.push({ ...r, ok: true, section: res.sectionName || "", password: res.tempPassword || "", loginCreated: res.loginCreated });
      } catch (err) {
        out.push({ ...r, ok: false, why: err.code === "23505" ? "Already exists" : err.message });
      }
      setProgress({ done: out.length, total: good.length });
    }
    setResults(out);
  };

  const saveLogins = () => downloadFile("new-student-logins.csv", toCsv(results.filter((r) => r.ok), [
    { label: "Student ID", value: (r) => r.id }, { label: "Name", value: (r) => `${r.last_name}, ${r.first_name}` },
    { label: "Section", value: (r) => r.section }, { label: "One-time password", value: (r) => r.password || "(use Reset password)" },
  ]));

  if (results) {
    const made = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    return (
      <Modal title="Students created" onClose={() => onDone()} width="max-w-lg"
        footer={<>
          <button className="btn btn-secondary" onClick={saveLogins} disabled={made.length === 0}><Download size={16} aria-hidden="true" />Download logins</button>
          <button className="btn btn-primary" onClick={() => onDone()}>Done</button>
        </>}>
        <p className="text-[14px] text-ink-2"><strong className="text-ink">{made.length} {made.length === 1 ? "student" : "students"}</strong> created and placed in their block section.
          {failed.length > 0 && <> <strong className="text-bad">{failed.length} failed</strong>, listed below.</>}</p>
        <p className="mt-2 rounded-lg px-3 py-2 text-[13px] tone-warn">The one-time passwords are shown only now. Download the list and keep it private: give each student their own password. They choose a new one at first sign-in.</p>
        {failed.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-[13px]">
            {failed.map((r) => <li key={r.id}><span className="font-mono">{r.id}</span> {r.last_name}: {r.why}</li>)}
          </ul>
        )}
      </Modal>
    );
  }

  return (
    <Modal title="Add several students" onClose={onClose} width="max-w-lg"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        {rows === null
          ? <button className="btn btn-primary" onClick={check} disabled={!text.trim()}>Check the list</button>
          : <button className="btn btn-primary" onClick={create} disabled={busy || good.length === 0}>
              {busy ? `Creating ${progress.done} of ${progress.total}…` : `Create ${good.length} ${good.length === 1 ? "student" : "students"}`}
            </button>}
      </>}>
      {rows === null ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-ink-2">One student per line: <span className="font-mono text-[13px]">Student ID, Last name, First name, Program, Year level, Student type</span>.
            Student type is optional (Freshman in 1st year, otherwise Continuing; or {Object.values(STUDENT_TYPE).join(", ")}). You can paste straight from Excel.</p>
          <textarea className="field min-h-[180px] font-mono text-[13px]" aria-label="Students" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"2027-0001, Reyes, Ana, BSIT, 1\n2027-0002, Cruz, Ben, BSCS, 1"} />
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={readFile} aria-label="Choose a CSV file" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Upload size={14} aria-hidden="true" />Choose a file</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadFile("students-example.csv", EXAMPLE)}><Download size={14} aria-hidden="true" />Example file</button>
          </div>
          <FormError error={error} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-ink-2"><strong className="text-ink">{good.length}</strong> ready to create{bad.length > 0 && <>, <strong className="text-bad">{bad.length}</strong> with a problem (skipped)</>}.
            Each student is placed in a block section with the most free seats and enrolled in its classes.</p>
          {bad.length > 0 && (
            <ul className="flex max-h-[200px] flex-col gap-1.5 overflow-auto rounded-lg border border-line p-3 text-[13px]">
              {bad.map((r) => <li key={r.line}><span className="font-mono text-ink-3">Line {r.line}</span> {r.id} {r.last_name}: <span className="text-bad">{r.errors.join("; ")}</span></li>)}
            </ul>
          )}
          {busy && <div className="bar" aria-hidden="true"><span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div>}
          {!busy && <button type="button" className="w-fit text-[13px] font-semibold text-accent" onClick={() => setRows(null)}>Edit the list</button>}
        </div>
      )}
    </Modal>
  );
}
