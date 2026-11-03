import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getCurriculum, getPrograms } from "../../services/catalog";
import { getStudent } from "../../services/students";
import { ErrorState, LoadingState, PageHeader } from "../../components/ui";
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
