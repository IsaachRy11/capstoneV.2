import { useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listStudents } from "../../services/students";
import { getPrograms } from "../../services/catalog";
import { listCurrentSections } from "../../services/sections";
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, StandingBadge } from "../../components/ui";
import { yearLabel, STUDENT_TYPE } from "../../lib/format";
import { downloadFile, toCsv } from "../../lib/csv";
import AddStudentModal from "./AddStudentModal";

const PAGE_SIZES = [10, 25, 50, 100];
const SIZE_KEY = "ccs-students-per-page";
function readPageSize() {
  try { const n = Number(localStorage.getItem(SIZE_KEY)); return PAGE_SIZES.includes(n) ? n : 25; } catch { return 25; }
}

export default function Students() {
  const { term } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const year = params.get("year") || "1";
  const programFilter = params.get("program") || "all";
  const [q, setQ] = useState(params.get("q") || "");
  const [standing, setStanding] = useState("all");
  const [studentType, setStudentType] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(readPageSize);
  const changePageSize = (n) => {
    setPageSize(n);
    setPage(0);
    try { localStorage.setItem(SIZE_KEY, String(n)); } catch { /* not remembered in private mode */ }
  };
  const [adding, setAdding] = useState(params.get("add") === "1");
  const [notice, setNotice] = useState("");

  const { data, error, loading, reload } = useAsync(async () => {
    const [students, programs, sections] = await Promise.all([listStudents(), getPrograms(), listCurrentSections()]);
    return { students, programs, sections };
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
      (studentType === "all" || s.admission_type === studentType) &&
      (!needle || `${s.full_name} ${s.id} ${s.section_name || ""}`.toLowerCase().includes(needle)));
  }, [data, q, programFilter, standing, studentType]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Searching looks across all years; otherwise one year level at a time.
  const searching = q.trim().length > 0;
  const rows = searching ? base : base.filter((s) => String(s.year_level) === year);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const tabs = [["1", "1st Year"], ["2", "2nd Year"], ["3", "3rd Year"], ["4", "4th Year"]];

  const exportCsv = () => downloadFile("ccs-students.csv", toCsv(rows, [
    { label: "Student ID", value: (s) => s.id }, { label: "Last name", value: (s) => s.last_name },
    { label: "First name", value: (s) => s.first_name }, { label: "Program", value: (s) => s.program_code },
    { label: "Year", value: (s) => s.year_level }, { label: "Section", value: (s) => s.section_name },
    { label: "Standing", value: (s) => s.standing }, { label: "Student type", value: (s) => STUDENT_TYPE[s.admission_type] }, { label: "Email", value: (s) => s.email },
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
          <select id="prog" className="field w-auto min-w-0 flex-[1_1_140px] sm:flex-[0_1_220px]" value={programFilter} onChange={(e) => setParam("program", e.target.value)}>
            <option value="all">Program</option>
            {data.programs.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          <label htmlFor="stand" className="sr-only">Standing</label>
          <select id="stand" className="field w-auto min-w-0 flex-[1_1_140px] sm:flex-[0_1_170px]" value={standing} onChange={(e) => { setStanding(e.target.value); setPage(0); }}>
            <option value="all">Standing</option><option value="regular">Regular</option><option value="irregular">Irregular</option>
          </select>
          <label htmlFor="stype" className="sr-only">Student type</label>
          <select id="stype" className="field w-auto min-w-0 flex-[1_1_140px] sm:flex-[0_1_190px]" value={studentType} onChange={(e) => { setStudentType(e.target.value); setPage(0); }}>
            <option value="all">Student type</option>
            {Object.entries(STUDENT_TYPE).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Student</th><th className="hidden md:table-cell">Student ID</th><th className="hidden sm:table-cell">Program</th><th className="hidden md:table-cell">Year</th><th className="hidden md:table-cell">Section</th><th className="hidden lg:table-cell">Student type</th><th>Standing</th><th className="hidden sm:table-cell"><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.full_name} size={34} />
                      <div className="flex min-w-0 flex-col"><Link to={`/students/${s.id}`} className="inline-flex min-h-10 items-center font-semibold text-ink md:min-h-0">{s.last_name}, {s.first_name}</Link><span className="text-[12px] text-ink-3 md:hidden"><span className="font-mono">{s.id}</span><span className="sm:hidden"> · {s.program_code}</span></span></div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap font-mono text-[13px] text-ink-2 md:table-cell">{s.id}</td>
                  <td className="hidden sm:table-cell">{s.program_code}</td>
                  <td className="hidden whitespace-nowrap md:table-cell">{yearLabel(s.year_level)}</td>
                  <td className="hidden whitespace-nowrap md:table-cell">{s.section_name || "—"}</td>
                  <td className="hidden whitespace-nowrap text-ink-2 lg:table-cell">{STUDENT_TYPE[s.admission_type]}</td>
                  <td><StandingBadge standing={s.standing} /></td>
                  <td className="hidden text-right sm:table-cell"><Link to={`/students/${s.id}`} aria-label={`Open ${s.full_name}'s record`} className="icon-btn h-11 w-11"><ChevronRight size={18} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState>No students match these filters.</EmptyState>}
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-ink-3">
            <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length} students</span>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="per-page" className="text-[13px] text-ink-3">Rows</label>
              <select id="per-page" className="field h-[34px] w-auto py-0 pr-8 text-[13px]" value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-secondary btn-sm" disabled={(page + 1) * pageSize >= rows.length} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>

      {adding && (
        <AddStudentModal programs={data.programs} sections={data.sections} term={term}
          onClose={() => { setAdding(false); setParam("add", null); }}
          onCreated={(msg) => { setAdding(false); setNotice(msg); reload(); }} />
      )}
    </>
  );
}
