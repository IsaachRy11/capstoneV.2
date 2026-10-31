import { useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { createStudent, listStudents } from "../services/students";
import { getPrograms } from "../services/catalog";
import { Avatar, EmptyState, ErrorState, FormError, LoadingState, Modal, PageHeader, StandingBadge } from "../components/ui";
import { STUDENT_TYPE, downloadFile, toCsv, yearLabel } from "../lib/format";

const PAGE_SIZE = 25;

function AddStudentModal({ programs, term, onClose, onCreated }) {
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

export default function Students() {
  const { term } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const year = params.get("year") || "1";
  const programFilter = params.get("program") || "all";
  const [q, setQ] = useState(params.get("q") || "");
  const [standing, setStanding] = useState("all");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(params.get("add") === "1");
  const [notice, setNotice] = useState("");

  const { data, error, loading, reload } = useAsync(async () => {
    const [students, programs] = await Promise.all([listStudents(), getPrograms()]);
    return { students, programs };
  }, []);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v === "all" || !v) next.delete(k); else next.set(k, v);
    next.delete("add");
    setParams(next);
    setPage(0);
  };

  const base = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.students.filter((s) =>
      (programFilter === "all" || s.program_code === programFilter) &&
      (standing === "all" || s.standing === standing) &&
      (!needle || `${s.full_name} ${s.id} ${s.section_name || ""}`.toLowerCase().includes(needle)));
  }, [data, q, programFilter, standing]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Searching looks across all years; otherwise one year level at a time.
  const searching = q.trim().length > 0;
  const rows = searching ? base : base.filter((s) => String(s.year_level) === year);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const tabs = [["1", "1st Year"], ["2", "2nd Year"], ["3", "3rd Year"], ["4", "4th Year"]];

  const exportCsv = () => downloadFile("ccs-students.csv", toCsv(rows, [
    { label: "Student ID", value: (s) => s.id }, { label: "Last name", value: (s) => s.last_name },
    { label: "First name", value: (s) => s.first_name }, { label: "Program", value: (s) => s.program_code },
    { label: "Year", value: (s) => s.year_level }, { label: "Section", value: (s) => s.section_name },
    { label: "Standing", value: (s) => s.standing }, { label: "Email", value: (s) => s.email },
  ]));

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={searching ? `Search results from all years · ${rows.length} of ${data.students.length} students` : `${yearLabel(Number(year))} · ${rows.length} of ${data.students.length} students`}
        actions={<>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={16} aria-hidden="true" />Export CSV</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Add student</button>
        </>}
      />
      {notice && <p role="status" className="rounded-lg px-4 py-3 text-[14px] tone-ok">{notice}</p>}

      <section className="card overflow-hidden">
        <div role="tablist" aria-label="Year level" className="flex gap-6 overflow-x-auto border-b border-line px-5">
          {tabs.map(([k, label]) => {
            const n = base.filter((s) => String(s.year_level) === k).length;
            const on = !searching && year === k;
            return (
              <button key={k} role="tab" aria-selected={on} onClick={() => { setQ(""); setParam("year", k); }}
                className={`-mb-px inline-flex h-12 items-center gap-2 whitespace-nowrap border-b-[3px] px-1 text-[14px] ${on ? "border-accent font-bold text-ink" : "border-transparent font-medium text-ink-3 hover:text-ink"}`}>
                {label}
                <span className={`rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold ${on ? "text-white" : "bg-hover text-ink-3"}`} style={on ? { background: "var(--btn)" } : undefined}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2.5 border-b border-line bg-surface-2 px-5 py-4">
          <div className="relative flex-[1_1_260px]">
            <label htmlFor="find" className="sr-only">Search students</label>
            <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
            <input id="find" className="field pl-9" placeholder="Name, student ID or section" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          </div>
          <label htmlFor="prog" className="sr-only">Program</label>
          <select id="prog" className="field w-auto flex-[0_1_220px]" value={programFilter} onChange={(e) => setParam("program", e.target.value)}>
            <option value="all">All programs</option>
            {data.programs.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <label htmlFor="stand" className="sr-only">Standing</label>
          <select id="stand" className="field w-auto flex-[0_1_170px]" value={standing} onChange={(e) => { setStanding(e.target.value); setPage(0); }}>
            <option value="all">Any standing</option><option value="regular">Regular</option><option value="irregular">Irregular</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Student ID</th><th>Program</th><th>Year</th><th>Section</th><th>Standing</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.full_name} size={34} />
                      <Link to={`/students/${s.id}`} className="font-semibold text-ink">{s.last_name}, {s.first_name}</Link>
                    </div>
                  </td>
                  <td className="font-mono text-[13px] text-ink-2">{s.id}</td>
                  <td>{s.program_code}</td>
                  <td className="whitespace-nowrap">{yearLabel(s.year_level)}</td>
                  <td className="whitespace-nowrap">{s.section_name || "—"}</td>
                  <td><StandingBadge standing={s.standing} /></td>
                  <td className="text-right"><Link to={`/students/${s.id}`} aria-label={`Open ${s.full_name}'s record`} className="icon-btn h-11 w-11"><ChevronRight size={18} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState>No students match these filters.</EmptyState>}
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-ink-3">
            <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}</span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-secondary btn-sm" disabled={(page + 1) * PAGE_SIZE >= rows.length} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>

      {adding && (
        <AddStudentModal programs={data.programs} term={term}
          onClose={() => { setAdding(false); setParam("add", null); }}
          onCreated={(msg) => { setAdding(false); setNotice(msg); reload(); }} />
      )}
    </>
  );
}
