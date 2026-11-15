import { BackButton, Badge, EmptyState, GradeLegend, PageHeader } from "../../components/ui";
import { formatGrade, semesterLabel, sumUnits, yearLabel } from "../../lib/format";
import { SUBJECT_STATE } from "../../lib/progress";
import { VIEWS } from "./progressViews";

// The list behind each summary card on the subject tracker (opened with ?view=units|passed|enrolled|failed).
const dash = <span className="text-ink-3">—</span>;

export function MidtermCell({ s }) {
  if (s.midterm === null) return dash;
  return <span className={`font-mono font-semibold ${Number(s.midterm) > 3 ? "text-bad" : ""}`}>{formatGrade(s.midterm)}</span>;
}

export function FinalCell({ s }) {
  if (s.state === "back" && s.backReason !== "Failed") return <span className="font-semibold text-ink-2">{s.backReason}</span>;
  if (s.final === null) return dash;
  return <span className={`font-mono font-semibold ${Number(s.final) > 3 ? "text-bad" : ""}`}>{formatGrade(s.final)}</span>;
}

export default function ProgressDetail({ view, progress, retakeNext }) {
  const cfg = VIEWS[view];
  const rows = cfg.pick(progress);
  const offeredAgain = new Set(retakeNext.map((s) => s.id));

  return (
    <>
      <BackButton to="/progress" label="Back to subject tracker" />
      <PageHeader title={cfg.title} />
      <section className="card flex flex-col gap-1.5 p-6">
        <h2 className="text-[15px] font-semibold text-ink-2">{cfg.title}</h2>
        <p className={`font-display text-[34px] font-bold tracking-tight ${view === "failed" && rows.length ? "text-bad" : "text-ink"}`}>{cfg.headline(rows, progress)}</p>
        <p className="text-[14px] text-ink-3">{cfg.text}</p>
      </section>

      <section className="card overflow-hidden" aria-label={cfg.title}>
        {rows.length === 0 ? <EmptyState>{cfg.empty}</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th><th className="hidden sm:table-cell">Curriculum</th><th className="hidden !text-center sm:table-cell">Units</th>
                  <th className="!text-center">Midterm</th><th className="!text-center">Final</th><th className="hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="sm:min-w-[200px]">
                      <span className="block font-mono text-[13px] text-accent">{s.code}</span>
                      <span className="block font-medium">{s.title}</span>
                      {s.state === "back" && s.attempts > 1 && <span className="mt-0.5 block text-[12px] text-ink-3">{s.attempts} attempts</span>}
                      {/* Phones: the hidden columns are folded in here. */}
                      <span className="mt-0.5 block text-[12px] text-ink-3 sm:hidden">{yearLabel(s.year_level)} · {semesterLabel(s.semester)} · {Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
                      <span className="mt-1.5 block sm:hidden">
                        <Badge tone={SUBJECT_STATE[s.state].tone} dot>{s.state === "back" ? s.backReason : SUBJECT_STATE[s.state].label}</Badge>
                        {offeredAgain.has(s.id) && <span className="mt-1 block text-[12px] text-ink-3">Offered again next semester</span>}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap text-[13px] text-ink-2 sm:table-cell">{yearLabel(s.year_level)} · {semesterLabel(s.semester)}</td>
                    <td className="num hidden sm:table-cell">{Number(s.units)}</td>
                    <td className="text-center text-[13px]"><MidtermCell s={s} /></td>
                    <td className="text-center text-[13px]"><FinalCell s={s} /></td>
                    <td className="hidden sm:table-cell">
                      <Badge tone={SUBJECT_STATE[s.state].tone} dot>{s.state === "back" ? s.backReason : SUBJECT_STATE[s.state].label}</Badge>
                      {offeredAgain.has(s.id) && <span className="mt-1 block text-[12px] text-ink-3">Offered again next semester</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-5 py-3 text-[13px] font-semibold">
              <span className="text-ink-2">Total</span>
              <span className="font-mono">{rows.length} {rows.length === 1 ? "subject" : "subjects"} · {sumUnits(rows)} units</span>
            </p>
          </div>
        )}
      </section>
      <GradeLegend className="card px-5 py-3.5" />
    </>
  );
}
