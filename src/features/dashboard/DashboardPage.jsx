import { Link, useOutletContext } from "react-router-dom";
import { Plus, Printer } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listStudents } from "../../services/students";
import { listCurrentSections } from "../../services/sections";
import { countOfferings, getCurriculum, getPrograms } from "../../services/catalog";
import { ErrorState, LoadingState, PageHeader, SectionHeader } from "../../components/ui";
import { shortProgramName, sumUnits, yearLabel } from "../../lib/format";

function Kpi({ to, label, value, sub, children }) {
  return (
    <Link to={to} className="card flex flex-col gap-2.5 p-5 text-ink hover:border-accent">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <span className="font-display text-[34px] font-bold tracking-tight text-ink">{value}</span>
      {sub && <span className="text-[13px] text-ink-3">{sub}</span>}
      {children}
    </Link>
  );
}

export default function Dashboard() {
  const { term } = useOutletContext();
  const { data, error, loading, reload } = useAsync(async () => {
    const [students, sections, curriculum, programs, offerings] = await Promise.all([
      listStudents(), listCurrentSections(), getCurriculum(), getPrograms(), term ? countOfferings(term.id) : 0,
    ]);
    return { students, sections, curriculum, programs, offerings };
  }, [term?.id]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { students, sections, curriculum, programs, offerings } = data;
  const byProgram = (code) => students.filter((s) => s.program_code === code);
  const seats = sections.reduce((t, s) => t + s.capacity, 0);
  const filled = sections.reduce((t, s) => t + s.enrolled, 0);
  const maxYears = Math.max(...programs.map((p) => p.duration_years), 4);
  const sectionFor = (code, y) => sections.find((s) => s.program_code === code && s.year_level === y);

  return (
    <>
      <PageHeader
        title="Department overview"
        actions={<>
          <button className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print summary</button>
          <Link className="btn btn-primary no-print" to="/students?add=1"><Plus size={16} aria-hidden="true" />Add student</Link>
        </>}
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <Kpi to="/students" label="Students" value={students.length} sub={programs.map((p) => `${p.code} ${byProgram(p.code).length}`).join(" · ")} />
        <Kpi to="/sections" label="Sections" value={sections.length} sub="This semester" />
        <Kpi to="/sections" label="Seats filled" value={<>{filled}<span className="text-[18px] font-semibold text-ink-3"> / {seats}</span></>}>
          <div className="bar" role="img" aria-label={`${seats ? Math.round((filled / seats) * 100) : 0} percent of seats filled`}>
            <span style={{ width: `${seats ? (filled / seats) * 100 : 0}%` }} />
          </div>
        </Kpi>
        <Kpi to="/sections" label="Classes offered" value={offerings} sub="Subjects scheduled this semester" />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section className="card min-w-0 flex-[999_1_560px] overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
            <div>
              <h2 className="text-[17px] font-bold">Enrollment by year level</h2>
              <p className="mt-1 text-[13px] text-ink-3">Students in each program and year, and seats filled in their block section</p>
            </div>
            <Link to="/students" className="inline-flex min-h-10 items-center whitespace-nowrap text-[14px] font-semibold">Open registry</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-y border-line bg-surface-2 text-[12px] font-semibold text-ink-3">
                  <th className="px-5 py-2.5 font-semibold">Program</th>
                  {Array.from({ length: maxYears }, (_, i) => (
                    <th key={i} className="px-3 py-2.5 font-semibold">
                      <span className="block text-ink-2">{yearLabel(i + 1)}</span>
                      <span className="block font-medium">{students.filter((s) => s.year_level === i + 1).length} students</span>
                    </th>
                  ))}
                  <th className="px-5 py-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.code} className="border-b border-line-2 last:border-b-0">
                    <th scope="row" className="px-5 py-3 align-top">
                      <span className="block text-[14px] font-bold text-ink">{p.code}</span>
                      <span className="block text-[12px] font-medium text-ink-3">{p.duration_years}-year program</span>
                    </th>
                    {Array.from({ length: maxYears }, (_, i) => {
                      const y = i + 1;
                      if (y > p.duration_years) {
                        return <td key={y} className="px-3 py-3 align-top text-[13px] text-ink-3"><span className="inline-block pt-1">—</span></td>;
                      }
                      const n = students.filter((s) => s.program_code === p.code && s.year_level === y).length;
                      const sec = sectionFor(p.code, y);
                      const pct = sec ? Math.min(100, Math.round((sec.enrolled / sec.capacity) * 100)) : 0;
                      return (
                        <td key={y} className="px-1.5 py-1.5 align-top">
                          <Link to={`/students?year=${y}&program=${p.code}`}
                            aria-label={`${p.code} ${yearLabel(y)}: ${n} students${sec ? `, section ${sec.name}, ${sec.enrolled} of ${sec.capacity} seats filled` : ", no section this semester"}`}
                            className="flex flex-col gap-1.5 rounded-lg px-1.5 py-1.5 text-ink transition-colors hover:bg-hover">
                            <span className="flex items-baseline gap-1.5">
                              <span className="font-display text-[20px] font-bold leading-none">{n}</span>
                              <span className="text-[12px] text-ink-3">students</span>
                            </span>
                            {sec ? (
                              <>
                                <span className="text-[12px] font-medium text-ink-2">{sec.name}</span>
                                <span className="flex items-center gap-2">
                                  <span className="bar flex-1"><span style={{ width: `${pct}%` }} /></span>
                                  <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">{sec.enrolled}/{sec.capacity}</span>
                                </span>
                              </>
                            ) : <span className="text-[12px] text-ink-3">No section yet</span>}
                          </Link>
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-right align-top">
                      <span className="font-display text-[20px] font-bold leading-none text-ink">{byProgram(p.code).length}</span>
                      <span className="block text-[12px] text-ink-3">students</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-[12px] text-ink-3">Bar = seats filled in the year's block section. Select a cell to see those students.</p>
        </section>

        <section className="card flex-[1_1_300px] p-5">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div>
              <h2 className="text-[17px] font-bold">Curriculum</h2>
              <p className="mt-1 text-[13px] text-ink-3">Subjects and units per program</p>
            </div>
            <Link to="/curriculum" className="inline-flex min-h-10 items-center text-[14px] font-semibold">View</Link>
          </div>
          {programs.map((p) => {
            const subs = curriculum.filter((c) => c.curricula.programs.code === p.code);
            return (
              <Link key={p.code} to={`/curriculum?program=${p.code}`} className="flex items-center justify-between gap-3 rounded-md border-t border-line-2 py-3 text-ink hover:text-ink">
                <span className="flex min-w-0 flex-col gap-0.5"><span className="text-[14px] font-semibold">{shortProgramName(p.name)}</span><span className="text-[13px] text-ink-3">{p.duration_years} years</span></span>
                <span className="shrink-0 whitespace-nowrap text-right font-mono text-[13px] text-ink-2">{subs.length} subjects<br />{sumUnits(subs)} units</span>
              </Link>
            );
          })}
        </section>
      </div>

      <section className="card overflow-hidden">
        <SectionHeader title="Sections this semester" subtitle="Block sections and seats filled" action={<Link to="/sections" className="inline-flex min-h-10 items-center whitespace-nowrap text-[14px] font-semibold">Manage sections</Link>} />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Section</th><th>Program</th><th>Year</th><th className="w-[40%]">Seats</th></tr></thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-ink-2">{s.program_code}</td>
                  <td className="text-ink-2">{yearLabel(s.year_level)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="bar flex-1"><span style={{ width: `${(s.enrolled / s.capacity) * 100}%` }} /></div>
                      <span className="min-w-[56px] text-right font-mono text-[13px]">{s.enrolled} / {s.capacity}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
