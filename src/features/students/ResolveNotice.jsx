import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

// Home's short "subjects to resolve" notice: only the count, with the way to the details. Red if anything failed
// (or was not credited), else amber.
export default function ResolveNotice({ items }) {
  const color = items.some((d) => d.status === "failed") ? "bad" : "warn";
  return (
    <section className="no-print card flex items-start gap-3.5 px-5 py-4" style={{ background: `var(--${color}-bg)`, borderColor: `var(--${color})` }}>
      <AlertTriangle size={20} className={`mt-0.5 shrink-0 ${color === "bad" ? "text-bad" : "text-warn"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className={`text-[15px] font-bold ${color === "bad" ? "text-bad" : "text-warn"}`}>{items.length} {items.length === 1 ? "subject" : "subjects"} to resolve</h2>
        <p className="mt-1 text-[14px] text-ink-2"><Link to="/record" className="inline-flex min-h-10 items-center font-semibold">See the details on your Academic record</Link></p>
      </div>
    </section>
  );
}
