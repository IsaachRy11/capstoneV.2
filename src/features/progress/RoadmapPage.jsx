import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Check, ChevronDown, Flag, GraduationCap } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { curriculumPlace, semesterLabel, sumUnits, yearLabel, yearSemesterLabel } from "../../lib/format";
import { blockingPrereqs, prerequisiteStatus, prerequisiteText, termsLeft } from "../../lib/progress";
import ProgressDetail from "./ProgressDetail";
import SubjectLink from "./SubjectLink";
import { CurriculumLink, TrackerSwitch } from "./TrackerParts";
import { VIEWS } from "./progressViews";
import { useProgress } from "./useProgress";

// "Roadmap": the whole path to graduation. What is already achieved (by year), then every semester still ahead.
const ROADMAP_VIEWS = ["units", "passed"];
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Stat({ to, label, value, sub }) {
  const body = (
    <>
      <span className="text-[12px] font-semibold text-ink-3">{label}</span>
      <span className="font-display text-[26px] font-bold leading-none tracking-tight text-ink">{value}</span>
      <span className="text-[12px] text-ink-3">{sub}</span>
    </>
  );
  const cls = "flex flex-col gap-1.5 rounded-xl border border-line-2 bg-surface-2 px-4 py-3.5";
  return to ? <Link to={to} className={`${cls} press hover:border-accent`}>{body}</Link> : <div className={cls}>{body}</div>;
}

// A semester ahead. The first one (next semester) starts open; the rest open on tap.
// What stands in the way, as a red label that can't be missed.
function ToClear({ codes }) {
  if (!codes) return null;
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] font-bold tone-bad" style={{ borderColor: "var(--bad)" }}>
      <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />{codes} to clear first
    </span>
  );
}

function AheadTerm({ t, isNext, pos }) {
  const units = sumUnits(t.subjects);
  const statuses = t.subjects.map((s) => prerequisiteStatus(s, pos));
  const blocked = statuses.filter((x) => x === "blocked").length;
  return (
    <li className="relative pb-5 pl-9 last:pb-0">
      <span className={`absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${isNext ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-3"}`} aria-hidden="true">
        {isNext ? <Flag size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <details open={isNext} className="card group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            {isNext && <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">Next semester</span>}
            <span className="block text-[15px] font-bold">{yearSemesterLabel(t.year, t.semester)}</span>
            <span className="block text-[13px] text-ink-3">
              {count(t.subjects.length, "subject", "subjects")} · {units} units
              {blocked > 0 && <span className="text-warn"> · {blocked} blocked</span>}
            </span>
          </span>
          <ChevronDown size={20} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <thead>
              <tr><th className="w-[128px]">Course No.</th><th>Description</th><th className="w-px !text-center">Units</th><th className="hidden md:table-cell">Prerequisite</th></tr>
            </thead>
            <tbody>
              {t.subjects.map((s) => {
                const text = prerequisiteText(s);
                const blocked = prerequisiteStatus(s, pos) === "blocked";
                const inTheWay = blocked ? blockingPrereqs(s, pos).map((p) => p.code).join(", ") : "";
                return (
                  <tr key={s.id} style={blocked ? { background: "var(--bad-bg)" } : undefined}>
                    <td className="whitespace-nowrap align-top font-mono text-[13px] text-accent">{s.code}</td>
                    <td className="min-w-0 align-top font-medium">
                      {s.title}
                      {text && <span className="mt-0.5 block text-[12px] font-normal text-ink-3 md:hidden">Prerequisite: {text}</span>}
                      <span className="block md:hidden"><ToClear codes={inTheWay} /></span>
                    </td>
                    <td className="num align-top">{Number(s.units)}</td>
                    <td className={`hidden align-top text-[13px] leading-snug md:table-cell ${blocked ? "font-semibold text-bad" : "text-ink-2"}`}>
                      {text || <span className="text-ink-3">—</span>}
                      <span className="block"><ToClear codes={inTheWay} /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>Total · {count(t.subjects.length, "subject", "subjects")}</td><td className="num">{units}</td><td className="hidden md:table-cell" /></tr>
            </tfoot>
          </table>
        </div>
      </details>
    </li>
  );
}

// One finished year: opens on its 1st semester so the table stays short; the next semester is one click away.
function CompletedYear({ year, inYear, done, defaultOpen }) {
  const [shown, setShown] = useState(1); // how many of this year's semesters are listed, first semester first
  const sems = [...new Set(done.map((s) => s.semester))].sort((a, b) => a - b);
  const visible = sems.slice(0, shown);
  const rows = done.filter((s) => visible.includes(s.semester)).sort((x, z) => x.semester - z.semester || x.sort_order - z.sort_order);
  const all = shown >= sems.length;
  const nextSem = sems[shown];
  const nextRows = nextSem ? done.filter((s) => s.semester === nextSem) : [];
  return (
    <details open={defaultOpen} className="card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full tone-ok" aria-hidden="true"><Check size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{yearLabel(year)}</span>
          <span className="block text-[13px] text-ink-3">{done.length} of {inYear.length} subjects passed · {sumUnits(done)} units</span>
        </span>
        <ChevronDown size={20} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="data-table">
          <thead>
            <tr><th className="hidden w-[132px] sm:table-cell">Semester</th><th className="w-[128px]">Course No.</th><th>Description</th><th className="w-px !text-center">Units</th><th className="hidden md:table-cell">Prerequisite</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="hidden whitespace-nowrap align-top text-[13px] text-ink-2 sm:table-cell">{semesterLabel(s.semester)}</td>
                <td className="whitespace-nowrap align-top font-mono text-[13px] text-accent">{s.code}</td>
                <td className="min-w-0 align-top font-medium">
                  {s.title}{s.credited && <span className="badge tone-ok ml-2">Credited</span>}
                  <span className="mt-0.5 block text-[12px] font-normal text-ink-3 sm:hidden">{semesterLabel(s.semester)}</span>
                  {prerequisiteText(s) && <span className="mt-0.5 block text-[12px] font-normal text-ink-3 md:hidden">Prerequisite: {prerequisiteText(s)}</span>}
                </td>
                <td className="num align-top">{Number(s.units)}</td>
                <td className="hidden align-top text-[13px] leading-snug text-ink-2 md:table-cell">{prerequisiteText(s) || <span className="text-ink-3">—</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="hidden sm:table-cell" />
              <td colSpan={2}>{all ? "Total" : semesterLabel(visible[visible.length - 1])} · {rows.length} {rows.length === 1 ? "subject" : "subjects"}</td>
              <td className="num">{sumUnits(rows)}</td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
      {sems.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
          <span className="text-[13px] text-ink-3">{shown} of {sems.length} {sems.length === 1 ? "semester" : "semesters"} shown</span>
          {all
            ? <button className="btn btn-secondary btn-sm" onClick={() => setShown(1)}>Show {semesterLabel(sems[0])} only</button>
            : <button className="btn btn-secondary btn-sm" onClick={() => setShown(shown + 1)}>Show {semesterLabel(nextSem)} · {nextRows.length} {nextRows.length === 1 ? "subject" : "subjects"} · {sumUnits(nextRows)} units</button>}
        </div>
      )}
    </details>
  );
}

export default function Roadmap() {
  const [showBasis, setShowBasis] = useState(false); // the small "based on your units" note
  const { data, error, loading, reload } = useProgress();
  const [params] = useSearchParams();
  const view = ROADMAP_VIEWS.includes(params.get("view")) && VIEWS[params.get("view")] ? params.get("view") : null;

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <LoadingState />;

  const { student, progress, ahead, term } = data;
  const pct = progress.totalUnits ? Math.round((progress.unitsEarned / progress.totalUnits) * 100) : 0;
  const unitsLeft = progress.totalUnits - progress.unitsEarned;
  const passed = progress.subjects.filter((s) => s.state === "passed");
  const completedYears = [...new Set(passed.map((s) => s.year_level))].sort();
  // The computation behind the percentage, year by year (curriculum units vs units passed).
  const years = [...new Set(progress.subjects.map((s) => s.year_level))].sort();
  const yearTotals = years.map((y) => sumUnits(progress.subjects.filter((s) => s.year_level === y)));
  const byYear = years.map((y, i) => {
    const all = progress.subjects.filter((s) => s.year_level === y);
    const throughThisYear = yearTotals.slice(0, i + 1).reduce((t, n) => t + n, 0);
    return { y, earned: sumUnits(all.filter((s) => s.state === "passed")), total: yearTotals[i], mark: throughThisYear / progress.totalUnits };
  });
  const exact = progress.totalUnits ? ((progress.unitsEarned / progress.totalUnits) * 100).toFixed(1) : "0.0";

  if (view) return <ProgressDetail view={view} progress={progress} student={student} />;
  const left = termsLeft(ahead);

  return (
    <>
      <PageHeader title="Subject tracker: roadmap" />
      <TrackerSwitch />

      <section className="card flex flex-col gap-5 p-5 sm:p-7" style={{ borderTop: "4px solid var(--accent)" }}>
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Your path to graduation</span>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="text-[24px] font-bold tracking-tight sm:text-[28px]">{pct}% of the way</h2>
            <span className="pb-1 text-[13px] text-ink-3">{student.program_code}</span>
          </div>
          {/* Quiet by default: one small phrase says what the percentage is based on; a click shows the numbers. */}
          <button type="button" className="mt-1 inline-flex min-h-8 items-center text-[13px] text-ink-3 underline decoration-dotted underline-offset-4 hover:text-ink" aria-expanded={showBasis} onClick={() => setShowBasis((v) => !v)}>
            based on your units
          </button>
          {showBasis && (
            <p className="mt-1 rounded-lg bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2" role="note">
              {progress.unitsEarned} of {progress.totalUnits} units passed = {exact}%.{" "}
              {byYear.map((b) => `${yearLabel(b.y)} ${b.earned}/${b.total}`).join(" · ")}.{" "}
              Subjects you're taking now or failed don't count until you pass them.
            </p>
          )}
          {/* The track: a marker where the student is, a tick where each year ends, a flag at the finish line. */}
          <div className="relative mb-9 mt-7 pr-3" role="img" aria-label={`${progress.unitsEarned} of ${progress.totalUnits} units earned: ${exact} percent. Finish line at ${progress.totalUnits} units.`}>
            <div className="h-3 rounded-full" style={{ background: "var(--track)" }}>
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
            </div>
            {byYear.slice(0, -1).map((b) => (
              <span key={b.y} className="absolute top-0 h-3 w-0.5 bg-ink-3 opacity-50" style={{ left: `calc((100% - 12px) * ${b.mark})` }} aria-hidden="true" />
            ))}
            {byYear.slice(0, -1).map((b, i) => (
              <span key={`l${b.y}`} className="absolute top-5 -translate-x-full whitespace-nowrap pr-1.5 text-[11px] text-ink-3" style={{ left: `calc((100% - 12px) * ${b.mark})` }} aria-hidden="true">{`${byYear.slice(0, i + 1).reduce((n, x) => n + x.total, 0)} units`}</span>
            ))}
            <span className="absolute -top-0.5 h-4 w-4 -translate-x-1/2 rounded-full border-[3px] bg-surface" style={{ left: `calc((100% - 12px) * ${progress.totalUnits ? progress.unitsEarned / progress.totalUnits : 0})`, borderColor: "var(--accent)" }} aria-hidden="true" />
            <span className="absolute -top-6 right-0 flex items-center gap-1 text-[11px] font-bold text-ink" aria-hidden="true">
              <Flag size={14} />Graduation
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat to="/progress/roadmap?view=units" label="Units earned" value={progress.unitsEarned} sub={`of ${progress.totalUnits} units`} />
          <Stat to="/progress/roadmap?view=passed" label="Subjects passed" value={progress.passedCount} sub={`of ${progress.total} subjects`} />
          <Stat label="Units left" value={unitsLeft} sub="to graduate" />
          <Stat label="Left after this one" value={left.semesters} sub={left.words} />
        </div>
      </section>

      <section aria-labelledby="done-title" className="flex flex-col gap-3">
        <h2 id="done-title" className="flex items-center gap-2 text-[19px] font-bold"><Check size={18} className="text-ok" aria-hidden="true" />Completed</h2>
        {completedYears.length === 0 ? (
          <div className="card"><EmptyState>Subjects you pass will appear here, year by year.</EmptyState></div>
        ) : (
          <div className="flex flex-col gap-3">
            {completedYears.map((y) => (
              <CompletedYear key={y} year={y} inYear={progress.subjects.filter((s) => s.year_level === y)} done={passed.filter((s) => s.year_level === y)}
                defaultOpen={y === completedYears[completedYears.length - 1]} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="ahead-title" className="flex flex-col gap-3">
        <h2 id="ahead-title" className="flex items-center gap-2 text-[19px] font-bold"><GraduationCap size={18} className="text-accent" aria-hidden="true" />Ahead</h2>
        {progress.back.length > 0 && (() => {
          const tone = progress.back.some((x) => x.backReason === "Failed") ? "bad" : "warn"; // red if anything failed, else amber
          return (
            <div className="card px-5 py-4" style={{ background: `var(--${tone}-bg)`, borderColor: `var(--${tone})` }}>
              <h3 className={`text-[15px] font-bold ${tone === "bad" ? "text-bad" : "text-warn"}`}>Carry-over: {count(progress.back.length, "subject", "subjects")} to resolve or retake</h3>
              <ul className="mt-1 text-[14px] text-ink-2">
                {progress.back.map((s) => <li key={s.id} className="py-0.5"><span className={`badge mr-2 ${s.backReason === "Failed" ? "tone-bad" : s.backReason === "NC" ? "tone-warn" : "tone-neutral"}`}>{s.backReason}</span><span className="font-mono">{s.code}</span> {s.title} · In your curriculum: {curriculumPlace(s.year_level, s.semester)} <SubjectLink subject={s} student={student} /></li>)}
              </ul>
            </div>
          );
        })()}
        {ahead.length === 0 ? (
          <div className="card"><EmptyState>This is your last semester. Resolve any pending subjects to finish on time.</EmptyState></div>
        ) : (
          <ol className="relative">
            <span className="absolute bottom-3 left-[11px] top-5 w-0.5 bg-line" aria-hidden="true" />
            {ahead.map((t, i) => <AheadTerm key={`${t.year}-${t.semester}`} t={t} isNext={i === 0} pos={{ year: student.year_level, semester: term.semester }} />)}
          </ol>
        )}
      </section>

      <Link to="/progress" className="inline-flex min-h-10 items-center self-start text-[14px] font-semibold">Back to this semester</Link>
      <CurriculumLink />
    </>
  );
}
