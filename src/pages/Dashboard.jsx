import { Link, useOutletContext } from "react-router-dom";
import { Plus, Printer } from "lucide-react";
import { useAsync } from "../hooks/useAsync";
import { listStudents } from "../services/students";
import { listCurrentSections } from "../services/sections";
import { countOfferings, getCurriculum, getPrograms } from "../services/catalog";
import { ErrorState, LoadingState, PageHeader, SectionHeader } from "../components/ui";
import { shortProgramName, sumUnits, yearLabel } from "../lib/format";

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
        <section className="card min-w-0 flex-[999_1_560px] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold">Enrolment by year level</h2>
              <p className="mt-1 text-[13px] text-ink-3">Students per program and year · seats filled in each block section</p>
            </div>
            <Link to="/students" className="whitespace-nowrap text-[14px] font-semibold">Open registry</Link>
          </div>
          <div className="overflow-x-auto">
            <div className="grid min-w-[560px] gap-2.5" style={{ gridTemplateColumns: `150px repeat(${maxYears}, minmax(96px, 1fr))` }}>
              <span />
              {Array.from({ length: maxYears }, (_, i) => <span key={i} className="pb-1 text-center text-[12px] font-semibold text-ink-3">{yearLabel(i + 1)}</span>)}
              {programs.map((p) => (
                <div key={p.code} className="contents">
                  <div className="flex flex-col justify-center gap-0.5 text-[14px] font-bold">{p.code}<span className="text-[12px] font-medium text-ink-3">{p.name.replace(/^Bachelor of Science in |^Associate in /, "")}</span></div>
                  {Array.from({ length: maxYears }, (_, i) => {
                    const y = i + 1;
                    if (y > p.duration_years) {
                      return <div key={y} className="flex min-h-[76px] items-center justify-center rounded-[10px] border border-dashed border-line text-[12px] text-ink-3">{p.duration_years}-year program</div>;
                    }
                    const n = students.filter((s) => s.program_code === p.code && s.year_level === y).length;
                    const sec = sectionFor(p.code, y);
                    return (
                      <Link key={y} to={`/students?year=${y}&program=${p.code}`} className="flex min-h-[76px] flex-col gap-2 rounded-[10px] border border-line-2 bg-surface-2 px-4 py-3.5 text-ink hover:border-accent">
                        <span className="font-display text-[22px] font-bold">{n}</span>
                        <div className="bar" aria-hidden="true"><span style={{ width: sec ? `${(sec.enrolled / sec.capacity) * 100}%` : "0%" }} /></div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card flex-[1_1_300px] p-5">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div>
              <h2 className="text-[17px] font-bold">Curriculum</h2>
              <p className="mt-1 text-[13px] text-ink-3">Subjects and units per program</p>
            </div>
            <Link to="/curriculum" className="text-[14px] font-semibold">View</Link>
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
        <SectionHeader title="Sections this semester" subtitle="Block sections, rooms and seats" action={<Link to="/sections" className="whitespace-nowrap text-[14px] font-semibold">Manage sections</Link>} />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Section</th><th>Program</th><th>Year</th><th>Room</th><th className="w-[32%]">Seats</th></tr></thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-ink-2">{s.program_code}</td>
                  <td className="text-ink-2">{yearLabel(s.year_level)}</td>
                  <td className="text-ink-2">{s.home_room || "TBA"}</td>
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
