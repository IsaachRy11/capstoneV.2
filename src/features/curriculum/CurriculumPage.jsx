import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getCurriculum, getPrerequisites, getPrograms } from "../../services/catalog";
import { getStudent } from "../../services/students";
import { ErrorState, LoadingState } from "../../components/ui";
import { TrackerSwitch } from "../progress/TrackerParts";
import { semesterLabel, sumUnits, yearLabel } from "../../lib/format";
import SubjectModal from "./SubjectModal";
import DeleteSubjectModal from "./DeleteSubjectModal";

export default function Curriculum() {
  const { user } = useAuth();
  const isSecretary = user.role === "secretary";
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null);   // null | "new" | subject
  const [deleting, setDeleting] = useState(null); // null | subject

  const { data, error, loading, reload } = useAsync(async () => {
    const [programs, rows, prerequisites, me] = await Promise.all([
      getPrograms(), getCurriculum(), getPrerequisites(), isSecretary ? null : getStudent(user.studentId),
    ]);
    return { programs, rows, prerequisites, myProgram: me?.program_code };
  }, [isSecretary, user.studentId], "curriculum");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const code = isSecretary ? params.get("program") || data.programs[0]?.code : data.myProgram;
  const program = data.programs.find((p) => p.code === code) || data.programs[0];
  const subjects = data.rows.filter((r) => r.curricula.programs.code === program.code);
  const years = [...new Set(subjects.map((s) => s.year_level))].sort();
  const count = (list) => `${list.length} ${list.length === 1 ? "subject" : "subjects"}`;
  // Prerequisites as on the official checklist: subject codes and/or a year standing ("4th year standing").
  const codeById = new Map(data.rows.map((r) => [r.id, r.code]));
  const prereqText = (s) => {
    const codes = data.prerequisites.filter((p) => p.subject_id === s.id).map((p) => codeById.get(p.prerequisite_id)).filter(Boolean);
    const standing = s.standing_required ? `${({ 2: "2nd", 3: "3rd" })[s.standing_required] || `${s.standing_required}th`} year standing` : null;
    return [...codes, standing].filter(Boolean).join(", ");
  };

  // Like the printed checklist: Code | Description | Units | Prerequisite, each in its own column.
  // The columns are fixed-width so the description keeps the room; phones fold code and prerequisite under the title.
  const semesterCard = (sem, rows) => (
    <div key={sem} className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h3 className="text-[15px] font-bold">{semesterLabel(sem)}</h3>
        <span className="font-mono text-[13px] text-ink-2">{count(rows)} · {sumUnits(rows)} units</span>
      </div>
      <table className="data-table w-full table-fixed [&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4">
        <thead>
          <tr>
            <th className="hidden w-[128px] sm:table-cell">Course No.</th>
            <th>Description</th>
            <th className="w-[54px] !text-center">Units</th>
            <th className="hidden w-[112px] md:table-cell">Prerequisite</th>
            {isSecretary && <th className="hidden w-[84px] lg:table-cell"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="hidden whitespace-nowrap align-top font-mono text-[13px] text-accent sm:table-cell">{s.code}</td>
              <td className="min-w-0 align-top font-medium">
                <span className="block font-mono text-[12px] font-normal text-accent sm:hidden">{s.code}</span>
                {s.title}
                {prereqText(s) && <span className="mt-0.5 block text-[12px] font-normal text-ink-3 md:hidden">Prerequisite: {prereqText(s)}</span>}
              </td>
              <td className="num align-top">{Number(s.units)}</td>
              <td className="hidden align-top text-[13px] leading-snug text-ink-2 md:table-cell">{prereqText(s) || <span className="text-ink-3">—</span>}</td>
              {isSecretary && (
                <td className="hidden whitespace-nowrap text-right align-top lg:table-cell">
                  <button className="icon-btn touch-40 h-8 w-8" onClick={() => setEditing(s)} aria-label={`Edit ${s.code}`} title="Edit"><Pencil size={15} /></button>
                  <button className="icon-btn icon-btn-danger touch-40 h-8 w-8" onClick={() => setDeleting(s)} aria-label={`Delete ${s.code}`} title="Delete"><Trash2 size={15} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {!isSecretary && <TrackerSwitch />}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Academic Degree Programs</span>
          <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]">
            Saint Joseph College <span className="text-ink-3">•</span> College of Computer Studies Curriculum
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14px] text-ink-2">
            <span className="rounded-md px-2 py-0.5 font-mono text-[12px] font-bold tone-info" title={program.name}>{program.code}</span>
            <span>Complete {program.duration_years}-Year Academic Curriculum</span>
            <span className="text-ink-3" aria-hidden="true">·</span>
            <span>{subjects.length} subjects · {sumUnits(subjects)} units</span>
          </p>
        </div>
        {isSecretary && <button className="btn btn-primary hidden lg:inline-flex" onClick={() => setEditing("new")}><Plus size={16} aria-hidden="true" />Add subject</button>}
      </header>

      {isSecretary && (
        <div className="seg seg-fill self-start" role="group" aria-label="Program">
          {data.programs.map((p) => <button key={p.code} aria-pressed={p.code === program.code} onClick={() => setParams({ program: p.code })}>{p.code}</button>)}
        </div>
      )}

      {years.map((y) => {
        const ofYear = subjects.filter((s) => s.year_level === y);
        const inSem = (sem) => ofYear.filter((s) => s.semester === sem);
        const summer = inSem(3);
        return (
          <section key={y} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-[19px] font-bold">{yearLabel(y)}</h2>
              <span className="text-[13px] text-ink-3">Total: {count(ofYear)} · {sumUnits(ofYear)} units</span>
            </div>
            {/* 1st and 2nd semester side by side (stacked on phones and tablets), as on the official checklist. */}
            <div className="grid items-start gap-5 min-[1360px]:grid-cols-2">
              {[1, 2].filter((sem) => inSem(sem).length > 0).map((sem) => semesterCard(sem, inSem(sem)))}
            </div>
            {/* Summer is its own full-width strip underneath, like the "Summer" bar on the sheet. */}
            {summer.length > 0 && semesterCard(3, summer)}
          </section>
        );
      })}

      {editing && (
        <SubjectModal program={program} subject={editing === "new" ? null : editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
      {deleting && <DeleteSubjectModal subject={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); reload(); }} />}
    </>
  );
}
