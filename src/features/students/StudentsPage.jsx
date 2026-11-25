import { useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Plus, Search, X } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listStudents } from "../../services/students";
import { getPrograms } from "../../services/catalog";
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, StudentStatusBadge } from "../../components/ui";
import { STUDENT_TYPE, studentStatusKey, studentStatusLabel, studentTypeKey, studentTypeLabel, yearLabel } from "../../lib/format";
import { downloadFile, toCsv } from "../../lib/csv";
import { pageList } from "../../lib/pagination";
import AddStudentModal from "./AddStudentModal";
import DeleteStudentModal from "./DeleteStudentModal";

const PAGE_SIZES = [10, 25, 50, 100];
// Enrolled students are listed by year; Graduated, Dropped and Shifted out each have their own list (sidebar: Students),
// so they never mix into a year.
const TABS = [["1", "1st Year"], ["2", "2nd Year"], ["3", "3rd Year"], ["4", "4th Year"]];
const LISTS = {
  graduated: { title: "Graduated", empty: "No graduates yet. A student appears here when the secretary marks them as Graduated on their record." },
  dropped: { title: "Dropped", empty: "No dropped students. A student appears here when the secretary marks them as Dropped on their record." },
  shifted_out: { title: "Shifted out", empty: "No one has shifted out. When a student moves to another program, mark the old record as Shifted out and add them again as a new student." },
};
const isEnrolled = (s) => s.status === "active" || s.status === "inactive";
const inTab = (s, tab) => String(s.year_level) === tab && isEnrolled(s);
const SIZE_KEY = "ccs-students-per-page";
function readPageSize() {
  try { const n = Number(localStorage.getItem(SIZE_KEY)); return PAGE_SIZES.includes(n) ? n : 25; } catch { return 25; }
}

export default function Students() {
  const { term } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const year = params.get("year") || "1";
  const listKey = LISTS[params.get("list")] ? params.get("list") : "enrolled";
  const other = LISTS[listKey]; // undefined while looking at enrolled students
  const programFilter = params.get("program") || "all";
  const [q, setQ] = useState(params.get("q") || "");       // the search that is applied
  const [typed, setTyped] = useState(params.get("q") || ""); // what is in the box; applied on Enter or Search
  const applySearch = (value) => { setTyped(value); setQ(value.trim()); setPage(0); };
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [deleting, setDeleting] = useState(null);
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
    const [students, programs] = await Promise.all([listStudents(), getPrograms()]);
    return { students, programs };
  }, [], "students");

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
      (status === "all" || !!other || studentStatusKey(s) === status) &&
      (type === "all" || listKey === "graduated" || studentTypeKey(s) === type) &&
      (!needle || `${s.full_name} ${s.id} ${s.section_name || ""}`.toLowerCase().includes(needle)));
  }, [data, q, programFilter, status, type, other, listKey]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Searching looks across all years; otherwise one year level at a time.
  const searching = q.trim().length > 0;
  const rows = other ? base.filter((s) => s.status === listKey) : searching ? base.filter(isEnrolled) : base.filter((s) => inTab(s, year));
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const tabLabel = other ? other.title : TABS.find(([k]) => k === year)?.[1] ?? yearLabel(Number(year));
  const total = other ? data.students.filter((s) => s.status === listKey).length : data.students.filter(isEnrolled).length;
  const pages = Math.ceil(rows.length / pageSize);
  // Only 1st year students can be Freshmen, so a 2nd to 4th year tab doesn't offer it.
  const typeOptions = Object.entries(STUDENT_TYPE).filter(([k]) => k !== "freshman" || other || searching || year === "1");
  const hideType = listKey === "graduated"; // for graduates the type no longer matters in the list
  const filtered = q.trim() !== "" || typed !== "" || programFilter !== "all" || type !== "all" || status !== "all";
  const clearFilters = () => {
    applySearch(""); setType("all"); setStatus("all");
    const next = new URLSearchParams(params);
    ["program", "q", "add"].forEach((k) => next.delete(k));
    setParams(next);
  };

  const exportCsv = () => downloadFile("ccs-students.csv", toCsv(rows, [
    { label: "Student ID", value: (s) => s.id }, { label: "Last name", value: (s) => s.last_name },
    { label: "First name", value: (s) => s.first_name }, { label: "Program", value: (s) => s.program_code },
    { label: "Year", value: (s) => s.year_level }, { label: "Section", value: (s) => s.section_name },
    { label: "Student type", value: (s) => studentTypeLabel(s) }, { label: "Status", value: (s) => studentStatusLabel(s) },
  ]));

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={searching && !other ? `Search results from all years · ${rows.length} of ${total} students` : `${tabLabel} · ${rows.length} of ${total} students`}
        actions={<>
          <button className="btn btn-secondary hidden lg:inline-flex" onClick={exportCsv}><Download size={16} aria-hidden="true" />Export CSV</button>
          <button className="btn btn-primary hidden lg:inline-flex" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Create student</button>
        </>}
      />
      {notice && <p role="status" className="rounded-lg px-4 py-3 text-[14px] tone-ok">{notice}</p>}

      <section className="card overflow-hidden">
        {/* Phones have no sidebar dropdown: a switch between the lists instead. */}
        <div className="seg seg-fill m-2 lg:hidden" role="group" aria-label="Student list">
          {[["enrolled", "Enrolled"], ...Object.entries(LISTS).map(([k, v]) => [k, v.title])].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={listKey === k} onClick={() => { applySearch(""); setParam("list", k === "enrolled" ? null : k); }}>{label}</button>
          ))}
        </div>
        {!other && <div role="tablist" aria-label="Year level" className="flex gap-1 overflow-x-auto border-b border-line px-2 sm:gap-6 sm:px-5">
          {TABS.map(([k, label]) => {
            const n = base.filter((s) => inTab(s, k)).length;
            const on = !searching && year === k;
            return (
              <button key={k} role="tab" aria-selected={on} onClick={() => { applySearch(""); if (k !== "1" && type === "freshman") setType("all"); setParam("year", k); }}
                className={`-mb-px inline-flex h-12 flex-none items-center justify-center gap-1.5 whitespace-nowrap border-b-[3px] px-2.5 text-[14px] sm:justify-start sm:gap-2 sm:px-1 ${on ? "border-accent font-bold text-ink" : "border-transparent font-medium text-ink-3 hover:text-ink"}`}>
                <span className="sm:hidden">{label.replace(" Year", "")}</span><span className="hidden sm:inline">{label}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[12px] font-semibold ${on ? "text-white" : "bg-hover text-ink-3"}`} style={on ? { background: "var(--btn)" } : undefined}>{n}</span>
              </button>
            );
          })}
        </div>}

        <div className="flex flex-wrap gap-2.5 border-b border-line bg-surface-2 px-4 py-3 sm:px-5 sm:py-4">
          <form role="search" className="flex flex-[1_1_300px] gap-2" onSubmit={(e) => { e.preventDefault(); applySearch(typed); }}>
            <div className="relative min-w-0 flex-1">
              <label htmlFor="find" className="sr-only">Search students</label>
              <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
              <input id="find" type="search" enterKeyHint="search" className="field pl-9" placeholder="Name, student ID or section" value={typed}
                onChange={(e) => { setTyped(e.target.value); if (!e.target.value) applySearch(""); }} />
            </div>
            <button type="submit" className="btn btn-secondary flex-none">Search</button>
          </form>
          <label htmlFor="prog" className="sr-only">Program</label>
          <select id="prog" className="field w-auto min-w-0 flex-[1_1_140px] sm:flex-[0_1_220px]" value={programFilter} onChange={(e) => setParam("program", e.target.value)}>
            <option value="all">Program</option>
            {data.programs.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
          {!hideType && <>
            <label htmlFor="stype" className="sr-only">Student type</label>
            <select id="stype" className="field w-auto min-w-0 flex-[1_1_140px] sm:flex-[0_1_170px]" value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>
              <option value="all">Student type</option>
              {typeOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </>}
          {!other && <>
            <label htmlFor="stat" className="sr-only">Status</label>
            <select id="stat" className="field w-auto min-w-0 flex-[1_1_140px] sm:flex-[0_1_150px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
              <option value="all">Status</option>
              <option value="regular">Regular</option><option value="irregular">Irregular</option>
            </select>
          </>}
          <button type="button" className="btn btn-secondary flex-none" onClick={clearFilters} disabled={!filtered} aria-label="Clear search and filters">
            <X size={16} aria-hidden="true" />Clear
          </button>
        </div>

        {/* Phones: a list like a contacts app. The whole row opens the record; Delete lives on the record. */}
        <ul className="divide-y divide-line-2 sm:hidden">
          {pageRows.map((s) => (
            <li key={s.id}>
              <Link to={`/students/${s.id}`} className="press flex items-center gap-3 px-4 py-3 text-ink">
                <Avatar name={s.full_name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.last_name}, {s.first_name}</span>
                  <span className="block truncate text-[12px] text-ink-3"><span className="font-mono">{s.id}</span> · {s.program_code} {s.section_name ? s.section_name.replace(/^\S+\s+/, "") : ""}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <StudentStatusBadge student={s} />
                    {!hideType && <span className="badge tone-neutral">{studentTypeLabel(s)}</span>}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="data-table">
            <thead><tr><th>Student</th><th className="hidden md:table-cell">Student ID</th><th className="hidden sm:table-cell">Program</th><th className="hidden md:table-cell">Year</th><th className="hidden md:table-cell">Section</th><th className="hidden lg:table-cell">Student type</th><th>Status</th><th className="hidden text-right sm:table-cell">Actions</th></tr></thead>
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
                  <td className="hidden whitespace-nowrap md:table-cell">{s.year_level}</td>
                  <td className="hidden whitespace-nowrap md:table-cell">{s.section_name ? s.section_name.replace(/^\S+\s+/, "") : "—"}</td>
                  <td className="hidden whitespace-nowrap text-[13px] text-ink-2 lg:table-cell">{hideType ? "—" : studentTypeLabel(s)}</td>
                  <td><StudentStatusBadge student={s} /></td>
                  <td className="hidden text-right sm:table-cell">
                    <div className="flex justify-end gap-2">
                      <Link to={`/students/${s.id}`} aria-label={`View ${s.full_name}'s record`} className="btn btn-secondary btn-sm">View</Link>
                      <button aria-label={`Delete ${s.full_name}`} className="btn btn-danger btn-sm" onClick={() => setDeleting(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <EmptyState>
            {other && !searching ? other.empty : "No students match these filters."}
          </EmptyState>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[13px] text-ink-3 sm:px-5">
            <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} of {rows.length} students</span>
            <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-wrap">
              <label htmlFor="per-page" className="hidden text-[13px] text-ink-3 sm:inline">Rows</label>
              <select id="per-page" className="field hidden h-[34px] w-auto py-0 pr-8 text-[13px] sm:block" value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <nav aria-label="Pages" className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-start">
                <button className="btn btn-secondary btn-sm min-w-10 px-2.5" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft size={16} aria-hidden="true" /><span className="hidden sm:inline">Previous</span>
                </button>
                {/* Phones show the first, current and last page; computers also show the pages next to the current one. */}
                {[["flex sm:hidden", 0], ["hidden sm:flex", 1]].map(([cls, siblings]) => (
                  <span key={siblings} className={`${cls} items-center gap-1`}>
                    {pageList(page, pages, siblings).map((p) => typeof p === "string"
                      ? <span key={p} className="px-1 text-ink-3" aria-hidden="true">…</span>
                      : <button key={p} type="button" onClick={() => setPage(p)} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p + 1}`}
                          className={`btn btn-sm min-w-10 sm:min-w-[34px] px-2 font-mono ${p === page ? "btn-primary" : "btn-secondary"}`}>{p + 1}</button>)}
                  </span>
                ))}
                <button className="btn btn-secondary btn-sm min-w-10 px-2.5" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <span className="hidden sm:inline">Next</span><ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        )}
      </section>

      {deleting && (
        <DeleteStudentModal student={deleting} onClose={() => setDeleting(null)}
          onDeleted={() => { setNotice(`${deleting.full_name} was deleted.`); setDeleting(null); reload(); }} />
      )}

      {adding && (
        <AddStudentModal programs={data.programs} term={term}
          onClose={() => { setAdding(false); setParam("add", null); }}
          onCreated={(msg) => { setAdding(false); setNotice(msg); reload(); }} />
      )}
    </>
  );
}
