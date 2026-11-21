import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, Printer } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listStudents } from "../../services/students";
import { listCurrentSections } from "../../services/sections";
import { countOfferings, getCurriculum, getPrograms } from "../../services/catalog";
import { ErrorState, LoadingState, PageHeader, SectionHeader } from "../../components/ui";
import WelcomeBanner from "../../components/WelcomeBanner";
import { useAuth } from "../../context/AuthContext";
import { sectionLetter, shortProgramName, sumUnits, termLabel, yearLabel } from "../../lib/format";

function Kpi({ to, label, value, sub, children }) {
  return (
    <Link to={to} className="card hover-lift flex flex-col gap-2 p-4 text-ink sm:gap-2.5 sm:p-5">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <span className="font-display text-[28px] font-bold tracking-tight text-ink sm:text-[34px]">{value}</span>
      {sub && <span className="text-[13px] text-ink-3">{sub}</span>}
      {children}
    </Link>
  );
}

export default function Dashboard() {
  const { term, termLoading } = useOutletContext();
  const { user } = useAuth();
  const [allSections, setAllSections] = useState(false); // the list starts with the first 10
  const { data, error, loading, reload } = useAsync(async () => {
    if (termLoading) return null; // wait for the semester instead of loading everything twice
    const [students, sections, curriculum, programs, offerings] = await Promise.all([
      listStudents(), listCurrentSections(), getCurriculum(), getPrograms(), term ? countOfferings(term.id) : 0,
    ]);
    return { students, sections, curriculum, programs, offerings };
  }, [term?.id, termLoading], "dashboard");

  if (loading || !data) return error ? <ErrorState error={error} onRetry={reload} /> : <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { students: everyone, sections, curriculum, programs, offerings } = data;
  // Graduated and dropped students are counted on their own tabs of the Students page, not in the year counts here.
  const students = everyone.filter((s) => s.status === "active" || s.status === "inactive");
  const graduated = everyone.filter((s) => s.status === "graduated").length;
  const byProgram = (code) => students.filter((s) => s.program_code === code);
  const seats = sections.reduce((t, s) => t + s.capacity, 0);
  const filled = sections.reduce((t, s) => t + s.enrolled, 0);
  const maxYears = Math.max(...programs.map((p) => p.duration_years), 4);
  // In a summer term the one Summer section per program belongs to no year, so the year cells show none.
  const sectionsFor = (code, y) => (term?.semester === 3 ? [] : sections.filter((s) => s.program_code === code && s.year_level === y));

  return (
    <>
      <PageHeader
        title="Department overview"
        actions={<>
          <button className="btn btn-secondary no-print hidden lg:inline-flex" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print summary</button>
          <Link className="btn btn-primary no-print hidden lg:inline-flex" to="/students?add=1"><Plus size={16} aria-hidden="true" />Create student</Link>
        </>}
      />

      <WelcomeBanner tone="a" seed={0} name={user?.name} line="Students, sections and seats for this term."
        facts={[["This term", term ? termLabel(term) : "No current term"], ["Students", `${students.length} students`], ["Sections", `${sections.length} sections`], ["Subjects offered", `${offerings} subjects`]]} />


      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <Kpi to="/students" label="Students" value={students.length} sub={programs.map((p) => `${p.code} ${byProgram(p.code).length}`).join(" · ") + (graduated ? ` · ${graduated} graduated` : "")} />
        <Kpi to="/sections" label="Sections" value={sections.length} sub="This semester" />
        <Kpi to="/sections" label="Seats filled" value={<>{filled}<span className="text-[18px] font-semibold text-ink-3"> / {seats}</span></>}>
          <div className="bar" role="img" aria-label={`${seats ? Math.round((filled / seats) * 100) : 0} percent of seats filled`}>
            <span style={{ width: `${seats ? (filled / seats) * 100 : 0}%` }} />
          </div>
        </Kpi>
        <Kpi to="/sections" label="Subjects offered" value={offerings} sub="Offered this semester" />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section className="card min-w-0 flex-[999_1_560px] overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
            <div>
              <h2 className="text-[17px] font-bold">Enrollment by year level</h2>
              <p className="mt-1 text-[13px] text-ink-3">Students in each program and year, and seats filled across their block sections</p>
            </div>
            <Link to="/students" className="inline-flex min-h-10 items-center whitespace-nowrap text-[14px] font-semibold">Open registry</Link>
          </div>
          {/* Phones: one short list per program instead of a wide table. */}
          <div className="border-t border-line sm:hidden">
            {programs.map((p) => (
              <div key={p.code} className="border-b border-line-2 px-5 py-3 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[14px] font-bold">{p.code}</h3>
                  <span className="text-[12px] text-ink-3">{byProgram(p.code).length} students</span>
                </div>
                <ul className="mt-1">
                  {Array.from({ length: p.duration_years }, (_, i) => {
                    const y = i + 1;
                    const n = students.filter((s) => s.program_code === p.code && s.year_level === y).length;
                    const secs = sectionsFor(p.code, y);
                    const seatsFilled = secs.reduce((t, x) => t + x.enrolled, 0);
                    const seatsTotal = secs.reduce((t, x) => t + x.capacity, 0);
                    return (
                      <li key={y}>
                        <Link to={`/students?year=${y}&program=${p.code}`} className="flex min-h-11 items-center justify-between gap-3 text-ink">
                          <span className="text-[14px] font-medium">{yearLabel(y)}</span>
                          <span className="text-right text-[13px] text-ink-2">{n} students<span className="text-ink-3"> · {secs.length ? `${secs.length === 1 ? "1 section" : `${secs.length} sections`} · ${seatsFilled}/${seatsTotal} seats` : "no section yet"}</span></span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
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
                      const secs = sectionsFor(p.code, y);
                      const seatsFilled = secs.reduce((t, x) => t + x.enrolled, 0);
                      const seatsTotal = secs.reduce((t, x) => t + x.capacity, 0);
                      const pct = seatsTotal ? Math.min(100, Math.round((seatsFilled / seatsTotal) * 100)) : 0;
                      return (
                        <td key={y} className="px-1.5 py-1.5 align-top">
                          <Link to={`/students?year=${y}&program=${p.code}`}
                            aria-label={`${p.code} ${yearLabel(y)}: ${n} students${secs.length ? `, ${secs.length === 1 ? "1 section" : `${secs.length} sections`}, ${seatsFilled} of ${seatsTotal} seats filled` : ", no section this semester"}`}
                            className="flex flex-col gap-1.5 rounded-lg px-1.5 py-1.5 text-ink transition-colors hover:bg-hover">
                            <span className="flex items-baseline gap-1.5">
                              <span className="font-display text-[20px] font-bold leading-none">{n}</span>
                              <span className="text-[12px] text-ink-3">students</span>
                            </span>
                            {secs.length ? (
                              <>
                                <span className="text-[12px] font-medium text-ink-2">{secs.length === 1 ? secs[0].name : `${secs.length} sections · ${secs.map((x) => sectionLetter(x.name)).join(" ")}`}</span>
                                <span className="flex items-center gap-2">
                                  <span className="bar flex-1"><span style={{ width: `${pct}%` }} /></span>
                                  <span className="whitespace-nowrap font-mono text-[12px] text-ink-3">{seatsFilled}/{seatsTotal}</span>
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
          <p className="hidden border-t border-line px-5 py-3 text-[12px] text-ink-3 sm:block"><span className="font-semibold uppercase tracking-[0.08em]">Legend</span> · the bar shows seats filled across the year's block sections. Select a cell to see those students.</p>
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

      {/* Phones skip this long list: the year-level card above and the Sections page already cover it. */}
      <section className="card hidden overflow-hidden sm:block">
        <SectionHeader title="Sections this semester" subtitle="Block sections and seats filled" action={<Link to="/sections" className="inline-flex min-h-10 items-center whitespace-nowrap text-[14px] font-semibold">Manage sections</Link>} />
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Section</th><th className="hidden sm:table-cell">Program</th><th className="hidden sm:table-cell">Year</th><th className="w-[55%] sm:w-[40%]">Seats</th></tr></thead>
            <tbody>
              {(allSections ? sections : sections.slice(0, 10)).map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap font-semibold">{s.name}</td>
                  <td className="hidden text-ink-2 sm:table-cell">{s.program_code}</td>
                  <td className="hidden text-ink-2 sm:table-cell">{yearLabel(s.year_level)}</td>
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
        {sections.length > 10 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-ink-3">
            <span>Showing {allSections ? sections.length : 10} of {sections.length} sections</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setAllSections((v) => !v)} aria-expanded={allSections}>{allSections ? "Show fewer" : `Show all ${sections.length} sections`}</button>
          </div>
        )}
      </section>
    </>
  );
}
