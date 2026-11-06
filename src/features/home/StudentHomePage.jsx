import { Link, useOutletContext } from "react-router-dom";
import { AlertTriangle, BookOpen, CalendarClock, CheckCircle2, ChevronRight, FileText, ListChecks } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { getDeficiencies, getStudent, getTermClasses } from "../../services/students";
import { ErrorState, LoadingState, StandingBadge, SectionHeader } from "../../components/ui";
import { sumUnits, yearLabel } from "../../lib/format";
import { scheduleLines } from "../../lib/schedule";

export default function StudentHome() {
  const { user } = useAuth();
  const { term, termLoading } = useOutletContext();

  const { data, error, loading, reload } = useAsync(async () => {
    const student = await getStudent(user.studentId);
    const [classes, deficiencies] = await Promise.all([
      term ? getTermClasses(user.studentId, term.id) : [],
      getDeficiencies(user.studentId),
    ]);
    return { student, classes, deficiencies };
  }, [user.studentId, term?.id]);

  if (loading || termLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { student, classes, deficiencies } = data;
  const active = classes.filter((c) => c.status !== "dropped");
  const units = sumUnits(active.map((c) => c.class_offerings.curriculum_subjects));

  return (
    <>
      <section className="card flex flex-col gap-6 p-7" style={{ borderTop: "4px solid var(--accent)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] text-ink-2">Welcome back,</span>
            <h1 className="text-[30px] font-bold tracking-tight">{student.full_name}</h1>
            <span className="text-[14px] text-ink-2"><span className="font-mono">{student.id}</span> · {student.program_name}</span>
          </div>
          <StandingBadge standing={student.standing} />
        </div>
        <dl className="grid gap-4 border-t border-line-2 pt-5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          {[
            ["Year level", yearLabel(student.year_level)],
            ["Section", student.section_name || "Not registered"],
            ["Subjects this term", `${active.length} subjects`],
            ["Units this term", `${units} units`],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-[12px] font-semibold text-ink-3">{k}</dt><dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd></div>
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section className="card min-w-0 flex-[999_1_560px] overflow-hidden">
          <SectionHeader title="Classes this semester" subtitle={`${active.length} subjects · ${units} units`} action={<Link to="/record" className="inline-flex min-h-10 items-center whitespace-nowrap text-[14px] font-semibold">Full record</Link>} />
          {classes.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-ink-3">You're not enrolled in any classes this semester.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Subject</th><th>Schedule</th><th className="!text-center">Units</th></tr></thead>
                <tbody>
                  {classes.map((c) => {
                    const s = c.class_offerings.curriculum_subjects;
                    const lines = scheduleLines(c.class_offerings.class_meetings);
                    return (
                      <tr key={c.id}>
                        <td className="min-w-[200px]">
                          <span className="block font-mono text-[12px] text-accent">{s.code}</span>
                          <span className="block font-medium">{s.title}</span>
                        </td>
                        <td className="text-[13px]">
                          {lines.length ? lines.map((l) => (
                            <div key={l.days + l.time} className="whitespace-nowrap">
                              <span className="font-medium text-ink">{l.days}</span> <span className="text-ink-2">{l.time}</span>
                              <span className="block text-[12px] text-ink-3">{l.room}</span>
                            </div>
                          )) : <span className="text-ink-3">To be arranged</span>}
                        </td>
                        <td className="num">{Number(s.units)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-[1_1_300px] flex-col gap-5">
          {deficiencies.length === 0 ? (
            <section className="card flex items-start gap-3.5 p-5" style={{ background: "var(--ok-bg)", borderColor: "var(--ok-line)" }}>
              <CheckCircle2 size={22} className="shrink-0 text-ok" aria-hidden="true" />
              <div>
                <h2 className="text-[15px] font-bold text-ok">No back subjects</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">Every subject you've finished is passed.</p>
              </div>
            </section>
          ) : (
            <section className="card flex items-start gap-3.5 p-5" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)" }}>
              <AlertTriangle size={22} className="shrink-0 text-bad" aria-hidden="true" />
              <div>
                <h2 className="text-[15px] font-bold text-bad">{deficiencies.length === 1 ? "1 back subject" : `${deficiencies.length} back subjects`}</h2>
                <ul className="mt-1 text-[14px] leading-relaxed text-ink-2">
                  {deficiencies.map((d) => <li key={d.enrollment_id}><span className="font-mono">{d.code}</span> {d.title}</li>)}
                </ul>
                <p className="mt-2 text-[13px] text-ink-3">
                  <Link to="/progress" className="font-semibold">See when they're offered again</Link>, then talk to the CCS office about retaking them.
                </p>
              </div>
            </section>
          )}

          <section className="card p-2">
            {[
              { to: "/schedule", icon: CalendarClock, title: "Class schedule", sub: "Your week at a glance, with rooms" },
              { to: "/progress", icon: ListChecks, title: "Subject tracker", sub: "What you've passed, what's left, what's next" },
              { to: "/record", icon: FileText, title: "View grades", sub: "Midterm and final, every term" },
              { to: "/curriculum", icon: BookOpen, title: `${student.program_code} curriculum`, sub: "Every subject, year by year" },
            ].map(({ to, icon: Icon, title, sub }) => (
              <Link key={to} to={to} className="flex min-h-14 items-center gap-3.5 rounded-[10px] px-4 py-3.5 text-ink hover:bg-hover">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-accent"><Icon size={18} aria-hidden="true" /></span>
                <span className="flex flex-1 flex-col"><span className="text-[14px] font-semibold">{title}</span><span className="text-[13px] text-ink-3">{sub}</span></span>
                <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
