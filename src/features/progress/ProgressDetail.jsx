import { BackButton, Badge, EmptyState, PageHeader } from "../../components/ui";
import { sumUnits, yearSemesterLabel } from "../../lib/format";
import { SUBJECT_STATE } from "../../lib/progress";
import { VIEWS } from "./progressViews";

// The list behind each summary card on the subject tracker (opened with ?view=units|passed|enrolled|failed).
// Grades live on the Academic record, so these lists show the subject, where it sits in the curriculum, and its status.
export default function ProgressDetail({ view, progress, retakeNext, backTo = "/progress", backLabel = "Back to subject tracker" }) {
  const cfg = VIEWS[view];
  const rows = cfg.pick(progress);
  const offeredAgain = new Set(retakeNext.map((s) => s.id));

  return (
    <>
      <BackButton to={backTo} label={backLabel} />
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
                  <th className="w-[128px]">Course No.</th><th>Description</th><th className="hidden sm:table-cell">Curriculum</th><th className="hidden !text-center sm:table-cell">Units</th><th className="hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap align-top font-mono text-[13px] text-accent">{s.code}</td>
                    <td className="min-w-0 align-top sm:min-w-[200px]">
                      <span className="block font-medium">{s.title}</span>
                      {s.state === "back" && s.attempts > 1 && <span className="mt-0.5 block text-[12px] text-ink-3">{s.attempts} attempts</span>}
                      {/* Phones: the hidden columns are folded in here. */}
                      <span className="mt-0.5 block text-[12px] text-ink-3 sm:hidden">{yearSemesterLabel(s.year_level, s.semester)} · {Number(s.units)} {Number(s.units) === 1 ? "unit" : "units"}</span>
                      <span className="mt-1.5 block sm:hidden">
                        <Badge tone={SUBJECT_STATE[s.state].tone} dot>{s.state === "back" ? s.backReason : SUBJECT_STATE[s.state].label}</Badge>
                        {offeredAgain.has(s.id) && <span className="mt-1 block text-[12px] text-ink-3">Offered again next semester</span>}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap text-[13px] text-ink-2 sm:table-cell">{yearSemesterLabel(s.year_level, s.semester)}</td>
                    <td className="num hidden sm:table-cell">{Number(s.units)}</td>
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
    </>
  );
}
