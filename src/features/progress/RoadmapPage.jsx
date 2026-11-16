import { Link, useSearchParams } from "react-router-dom";
import { Check, ChevronDown, Flag, GraduationCap } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui";
import { semesterLabel, sumUnits, yearLabel } from "../../lib/format";
import { prerequisiteStatus, requirementText } from "../../lib/progress";
import ProgressDetail from "./ProgressDetail";
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
function AheadTerm({ t, isNext, pos }) {
  const units = sumUnits(t.subjects);
  const statuses = t.subjects.map((s) => prerequisiteStatus(s, pos));
  const blocked = statuses.filter((x) => x === "blocked").length;
  const waiting = statuses.filter((x) => x === "waiting").length;
  return (
    <li className="relative pb-5 pl-9 last:pb-0">
      <span className={`absolute left-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 ${isNext ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-3"}`} aria-hidden="true">
        {isNext ? <Flag size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <details open={isNext} className="card group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            {isNext && <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">Next semester</span>}
            <span className="block text-[15px] font-bold">{yearLabel(t.year)} · {semesterLabel(t.semester)}</span>
            <span className="block text-[13px] text-ink-3">
              {count(t.subjects.length, "subject", "subjects")} · {units} units
              {blocked > 0 && <span className="text-warn"> · {blocked} blocked</span>}
              {waiting > 0 && <span> · {waiting} waiting on this semester</span>}
            </span>
          </span>
          <ChevronDown size={20} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <ul className="divide-y divide-line-2 border-t border-line">
          {t.subjects.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="min-w-0">
                <span className="block font-mono text-[12px] text-accent">{s.code}</span>
                <span className="block text-[14px] font-medium">{s.title}</span>
                {requirementText(s, t.year) && <span className="mt-0.5 block text-[12px] text-warn">{requirementText(s, t.year)}</span>}
              </span>
              <span className="whitespace-nowrap text-[13px] text-ink-2">{Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function Roadmap() {
  const { data, error, loading, reload } = useProgress();
  const [params] = useSearchParams();
  const view = ROADMAP_VIEWS.includes(params.get("view")) && VIEWS[params.get("view")] ? params.get("view") : null;

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <LoadingState />;

  const { student, progress, next, ahead, term } = data;
  const pct = progress.totalUnits ? Math.round((progress.unitsEarned / progress.totalUnits) * 100) : 0;
  const unitsLeft = progress.totalUnits - progress.unitsEarned;
  const passed = progress.subjects.filter((s) => s.state === "passed");
  const completedYears = [...new Set(passed.map((s) => s.year_level))].sort();
  const retakeNext = next ? progress.back.filter((s) => s.semester === next.semester) : [];

  if (view) return <ProgressDetail view={view} progress={progress} retakeNext={retakeNext} backTo="/progress/roadmap" backLabel="Back to roadmap" />;

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
          <div className="bar mt-3" role="img" aria-label={`${pct} percent of ${student.program_code} units earned`}><span style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat to="/progress/roadmap?view=units" label="Units earned" value={progress.unitsEarned} sub={`of ${progress.totalUnits} units`} />
          <Stat to="/progress/roadmap?view=passed" label="Subjects passed" value={progress.passedCount} sub={`of ${progress.total} subjects`} />
          <Stat label="Units left" value={unitsLeft} sub="to graduate" />
          <Stat label="Semesters left" value={ahead.length} sub="after this one" />
        </div>
      </section>

      <section aria-labelledby="done-title" className="flex flex-col gap-3">
        <h2 id="done-title" className="flex items-center gap-2 text-[19px] font-bold"><Check size={18} className="text-ok" aria-hidden="true" />Completed</h2>
        {completedYears.length === 0 ? (
          <div className="card"><EmptyState>Subjects you pass will appear here, year by year.</EmptyState></div>
        ) : (
          <div className="flex flex-col gap-3">
            {completedYears.map((y) => {
              const inYear = progress.subjects.filter((s) => s.year_level === y);
              const done = passed.filter((s) => s.year_level === y);
              return (
                <details key={y} className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full tone-ok" aria-hidden="true"><Check size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold">{yearLabel(y)}</span>
                      <span className="block text-[13px] text-ink-3">{done.length} of {inYear.length} subjects passed · {sumUnits(done)} units</span>
                    </span>
                    <ChevronDown size={20} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                  </summary>
                  <ul className="grid divide-y divide-line-2 border-t border-line sm:grid-cols-2 sm:divide-y-0">
                    {done.map((s) => (
                      <li key={s.id} className="flex items-start justify-between gap-3 px-4 py-2.5 sm:px-5">
                        <span className="min-w-0"><span className="block font-mono text-[12px] text-accent">{s.code}</span><span className="block text-[14px] font-medium">{s.title}</span></span>
                        <span className="whitespace-nowrap text-[13px] text-ink-3">{Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="ahead-title" className="flex flex-col gap-3">
        <h2 id="ahead-title" className="flex items-center gap-2 text-[19px] font-bold"><GraduationCap size={18} className="text-accent" aria-hidden="true" />Ahead</h2>
        {progress.back.length > 0 && (
          <div className="card px-5 py-4" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)" }}>
            <h3 className="text-[15px] font-bold text-bad">Carry-over: {count(progress.back.length, "subject", "subjects")} to retake</h3>
            <ul className="mt-1 text-[14px] text-ink-2">
              {progress.back.map((s) => <li key={s.id}><span className="font-mono">{s.code}</span> {s.title} · {s.backReason}</li>)}
            </ul>
          </div>
        )}
        {ahead.length === 0 ? (
          <div className="card"><EmptyState>This is your last semester. Clear any failed subjects to finish on time.</EmptyState></div>
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
