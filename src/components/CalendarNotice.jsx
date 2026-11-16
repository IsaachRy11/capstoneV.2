import { CalendarOff, ClipboardList, Flag } from "lucide-react";
import { resumeText } from "../lib/calendar";
import { termLabel } from "../lib/format";

// The first or last day of classes of a semester (edge from useTermEdge()).
function EdgeNotice({ edge }) {
  const start = edge.edge === "start";
  return (
    <section role="status" className="card flex items-start gap-3.5 px-5 py-4" style={{ background: start ? "var(--ok-bg)" : "var(--info-bg)", borderColor: "transparent" }}>
      <Flag size={22} className="mt-0.5 shrink-0" style={{ color: start ? "var(--ok)" : "var(--info)" }} aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-ink">{start ? "First day of classes" : "Last day of classes"}</h2>
        <p className="mt-0.5 text-[14px] text-ink-2">{termLabel(edge.term)} {start ? "starts today." : "ends today."}</p>
      </div>
    </section>
  );
}

// A notice for the top of the schedule pages when the calendar says there are no classes (break, holiday,
// between semesters) or an exam week is on. status comes from useClassStatus(); nothing shows on a normal school day.
export default function CalendarNotice({ status, edge = null, className = "" }) {
  if (edge && (!status || status.kind === "classes")) return <div className={className}><EdgeNotice edge={edge} /></div>;
  if (!status || status.kind === "classes") return null;
  if (edge) return <div className={`flex flex-col gap-3 ${className}`}><EdgeNotice edge={edge} /><CalendarNotice status={status} /></div>;
  const none = status.kind === "none";
  const Icon = none ? CalendarOff : ClipboardList;
  return (
    <section role="status" className={`card flex items-start gap-3.5 px-5 py-4 ${className}`}
      style={{ background: none ? "var(--info-bg)" : "var(--warn-bg)", borderColor: "transparent" }}>
      <Icon size={22} className="mt-0.5 shrink-0" style={{ color: none ? "var(--info)" : "var(--warn)" }} aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-ink">{none ? "No classes today" : `Exam week: ${status.title}`}</h2>
        {none && <p className="mt-0.5 text-[14px] text-ink-2">{status.title}{status.span ? ` · ${status.span}` : ""}</p>}
        {!none && status.span && <p className="mt-0.5 text-[14px] text-ink-2">{status.span}</p>}
        {none && resumeText(status) && <p className="mt-0.5 text-[14px] font-semibold text-ink">{resumeText(status)}</p>}
        <p className="mt-1 text-[12px] text-ink-3">From the school calendar.</p>
      </div>
    </section>
  );
}
