import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Layers } from "lucide-react";
import { ErrorState, LoadingState, PageHeader, StandingBadge } from "../../components/ui";
import { colorIndex, semesterLabel, sumUnits, termLabel, yearLabel } from "../../lib/format";
import ProgressDetail from "./ProgressDetail";
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

function SubjectCard({ s }) {
  const prefix = s.code.split(/\s+/)[0];
  const opens = s.unlocks;
  return (
    <li className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <span className={`av-${colorIndex(prefix)} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-bold`} aria-hidden="true">{prefix.slice(0, 5)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[13px] text-accent">{s.code}</span>
            <span className="whitespace-nowrap text-[12px] text-ink-3">{Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
          </div>
          <h3 className="mt-0.5 text-[15px] font-bold leading-snug text-ink">{s.title}</h3>
        </div>
      </div>
      <div className="mt-auto border-t border-line-2 pt-3 text-[13px]">
        {opens.length ? (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink-2">
            <span className="inline-flex items-center gap-1 font-semibold text-ink"><ArrowRight size={13} aria-hidden="true" />Passing opens</span>
            {opens.map((o, i) => <span key={o.id} className="font-mono text-[12px] text-accent">{o.code}{i < opens.length - 1 ? "," : ""}</span>)}
          </p>
        ) : (
          <p className="text-ink-3">No other subject depends on this one.</p>
        )}
      </div>
    </li>
  );
}

export default function Progress() {
  const { data, error, loading, reload } = useProgress();
  const [params] = useSearchParams();
  const view = CURRENT_VIEWS.includes(params.get("view")) && VIEWS[params.get("view")] ? params.get("view") : null;

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <LoadingState />;

  const { student, progress, term, next } = data;
  const taking = progress.inProgress;
  const units = sumUnits(taking);
  // Distinct future subjects that open once the current ones are passed.
  const opening = new Map(taking.flatMap((s) => s.unlocks).map((u) => [u.id, u]));
  const retakeNext = next ? progress.back.filter((s) => s.semester === next.semester) : [];

  if (view) return <ProgressDetail view={view} progress={progress} retakeNext={retakeNext} backTo="/progress" backLabel="Back to this semester" />;

  return (
    <>
      <PageHeader title="Subject tracker: this semester" />
      <TrackerSwitch />

      <section className="card flex flex-col gap-5 p-5 sm:p-7" style={{ borderTop: "4px solid var(--accent)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">This semester</span>
            <h2 className="mt-1 text-[24px] font-bold tracking-tight sm:text-[28px]">{yearLabel(student.year_level)} · {semesterLabel(term.semester)}</h2>
            <p className="mt-1 text-[14px] text-ink-2">{termLabel(term)}{student.section_name ? ` · ${student.section_name}` : ""}</p>
          </div>
          <StandingBadge standing={student.standing} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile to="/progress?view=enrolled" label="Subjects" value={taking.length} sub="you're taking" />
          <Tile label="Load" value={units} sub="units this semester" />
          <Tile label="Opens next" value={opening.size} sub={opening.size === 1 ? "subject after you pass" : "subjects after you pass"} />
          <Tile to="/progress?view=failed" label="To clear" value={progress.back.length} sub={progress.back.length ? "failed, INC or dropped" : "nothing left over"} tone={progress.back.length ? "text-bad" : undefined} />
        </div>
      </section>

      {progress.back.length > 0 ? (
        <section className="card flex items-start gap-3.5 px-5 py-4" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)" }}>
          <AlertTriangle size={22} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-bad">{progress.back.length === 1 ? "1 subject to clear" : `${progress.back.length} subjects to clear`}</h2>
            <ul className="mt-1 text-[14px] text-ink-2">
              {progress.back.map((s) => (
                <li key={s.id}><span className="font-mono">{s.code}</span> {s.title} · {s.backReason}{retakeNext.some((x) => x.id === s.id) ? " · offered again next semester" : ""}</li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-ink-3">Talk to the CCS office about retaking them.</p>
          </div>
        </section>
      ) : (
        <section className="card flex items-center gap-3.5 px-5 py-4" style={{ background: "var(--ok-bg)", borderColor: "var(--ok-line)" }}>
          <CheckCircle2 size={22} className="shrink-0 text-ok" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold text-ok">Nothing to clear</h2>
            <p className="text-[14px] text-ink-2">Every subject you've finished is passed.</p>
          </div>
        </section>
      )}

      <section aria-labelledby="taking-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="taking-title" className="flex items-center gap-2 text-[19px] font-bold"><Layers size={18} className="text-accent" aria-hidden="true" />What you're taking</h2>
          <Link to="/schedule" className="text-[13px] font-semibold">See your week</Link>
        </div>
        {taking.length === 0 ? (
          <div className="card px-5 py-10 text-center text-[14px] text-ink-3">You're not enrolled in any subjects this semester.</div>
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
            {taking.map((s) => <SubjectCard key={s.id} s={s} />)}
          </ul>
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
