import { Link, useSearchParams } from "react-router-dom";
import { backTone, isSerious } from "../../lib/progress";
import { AlertTriangle, ArrowRight, CheckCircle2, Layers } from "lucide-react";
import { ErrorState, LoadingState, PageHeader, StudentStatusBadge } from "../../components/ui";
import { sumUnits, termLabel, yearSemesterLabel, curriculumPlace } from "../../lib/format";
import ProgressDetail from "./ProgressDetail";
import SubjectLink from "./SubjectLink";
import { CurriculumLink, TrackerSwitch } from "./TrackerParts";
import { VIEWS } from "./progressViews";
import { useProgress } from "./useProgress";

// "This semester": the student's current situation. What they are taking, how heavy the load is,
// what each subject opens up next, and anything left over from before that needs clearing.
const CURRENT_VIEWS = ["enrolled", "failed"];

function Tile({ to, label, value, sub, tone }) {
  const body = (
    <>
      <span className="text-[12px] font-semibold text-ink-3">{label}</span>
      <span className={`font-display text-[28px] font-bold leading-none tracking-tight ${tone || "text-ink"}`}>{value}</span>
      {sub && <span className="text-[12px] text-ink-3">{sub}</span>}
    </>
  );
  const cls = "flex flex-col gap-1.5 rounded-xl border border-line-2 bg-surface-2 px-4 py-3.5";
  return to ? <Link to={to} className={`${cls} press hover:border-accent`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export default function Progress() {
  const { data, error, loading, reload } = useProgress();
  const [params] = useSearchParams();
  const view = CURRENT_VIEWS.includes(params.get("view")) && VIEWS[params.get("view")] ? params.get("view") : null;

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <LoadingState />;

  const { student, progress, term } = data;
  const taking = progress.inProgress;
  const units = sumUnits(taking);
  // Distinct future subjects that open once the current ones are passed.
  const opening = new Map(taking.flatMap((s) => s.unlocks).map((u) => [u.id, u]));

  if (view) return <ProgressDetail view={view} progress={progress} student={student} />;

  const severe = progress.back.some((x) => isSerious(x.backReason)); // red if anything failed, else amber

  return (
    <>
      <PageHeader title="Subject tracker: this semester" />
      <TrackerSwitch />

      <section className="card flex flex-col gap-5 p-5 sm:p-7" style={{ borderTop: "4px solid var(--accent)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">This semester</span>
            <h2 className="mt-1 text-[24px] font-bold tracking-tight sm:text-[28px]">{yearSemesterLabel(student.year_level, term.semester)}</h2>
            <p className="mt-1 text-[14px] text-ink-2">{termLabel(term)}{student.section_name ? ` · ${student.section_name}` : ""}</p>
          </div>
          <StudentStatusBadge student={student} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile to="/progress?view=enrolled" label="Subjects" value={taking.length} sub="you're taking" />
          <Tile label="Load" value={units} sub="units this semester" />
          <Tile label="Opens next" value={opening.size} sub={opening.size === 1 ? "subject after you pass" : "subjects after you pass"} />
          <Tile to="/progress?view=failed" label="To resolve" value={progress.back.length} sub={progress.back.length ? "not yet cleared" : "nothing left over"} tone={progress.back.length ? (severe ? "text-bad" : "text-warn") : undefined} />
        </div>
      </section>

      {progress.back.length > 0 ? (
        <section className="card flex items-start gap-3.5 px-5 py-4" style={{ background: `var(--${severe ? "bad" : "warn"}-bg)`, borderColor: `var(--${severe ? "bad" : "warn"})` }}>
          <AlertTriangle size={22} className={`mt-0.5 shrink-0 ${severe ? "text-bad" : "text-warn"}`} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className={`text-[15px] font-bold ${severe ? "text-bad" : "text-warn"}`}>{progress.back.length === 1 ? "1 subject to resolve" : `${progress.back.length} subjects to resolve`}</h2>
            <ul className="mt-1 text-[14px] text-ink-2">
              {progress.back.map((s) => (
                <li key={s.id} className="py-0.5"><span className={`badge mr-2 ${backTone(s.backReason)}`}>{s.backReason}</span><span className="font-mono">{s.code}</span> {s.title} · In your curriculum: {curriculumPlace(s.year_level, s.semester)} <SubjectLink subject={s} student={student} /></li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-ink-3">Check with the CCS Secretary's Office how to resolve or retake them.</p>
          </div>
        </section>
      ) : (
        <section className="card flex items-center gap-3.5 px-5 py-4" style={{ background: "var(--ok-bg)", borderColor: "var(--ok-line)" }}>
          <CheckCircle2 size={22} className="shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold text-ok">Nothing to resolve</h2>
            <p className="text-[14px] text-ink-2">Every subject you've finished is passed.</p>
          </div>
        </section>
      )}

      <section aria-labelledby="taking-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="taking-title" className="flex items-center gap-2 text-[19px] font-bold"><Layers size={18} className="text-accent" aria-hidden="true" />What you're taking</h2>
          <Link to="/schedule" className="inline-flex min-h-10 items-center text-[13px] font-semibold">See your week</Link>
        </div>
        {taking.length === 0 ? (
          <div className="card px-5 py-10 text-center text-[14px] text-ink-3">You're not enrolled in any subjects this semester.</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th className="w-[128px]">Course No.</th><th>Description</th><th className="w-px !text-center">Units</th><th className="hidden lg:table-cell">Required for</th></tr>
                </thead>
                <tbody>
                  {taking.map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap align-top font-mono text-[13px] text-accent">{s.code}</td>
                      <td className="min-w-0 align-top font-medium">
                        {s.title}
                        <span className="mt-0.5 block text-[12px] font-normal text-ink-3 lg:hidden">{s.unlocks.length ? `Required for ${s.unlocks.map((o) => o.code).join(", ")}` : "Not required for another subject."}</span>
                      </td>
                      <td className="num align-top">{Number(s.units)}</td>
                      <td className="hidden align-top text-[13px] lg:table-cell">
                        {s.unlocks.length ? <span className="font-mono text-[12px] text-accent">{s.unlocks.map((o) => o.code).join(", ")}</span> : <span className="text-ink-3">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={2}>Total · {taking.length} {taking.length === 1 ? "subject" : "subjects"}</td><td className="num">{units}</td><td className="hidden lg:table-cell" /></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      <Link to="/progress/roadmap" className="card press group flex items-center gap-4 p-5 text-ink hover:border-accent">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">See your roadmap</span>
          <span className="block text-[13px] text-ink-3">What you've completed and every semester still ahead.</span>
        </span>
        <ArrowRight size={20} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </Link>

      <CurriculumLink />
    </>
  );
}
