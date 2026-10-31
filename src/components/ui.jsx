import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { STATUS_LABEL, STATUS_TONE, colorIndex, initials } from "../lib/format";

// Profile photo if there is one, otherwise initials on a colored circle. `size` in px.
export function Avatar({ name, url, size = 40, className = "" }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return url ? (
    <img src={url} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span style={style} className={`av-${colorIndex(name)} flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function SealLogo({ size = 34, className = "" }) {
  return <img src="/sjc-seal.png" alt="" width={size} height={size} className={`shrink-0 rounded-full ${className}`} />;
}

export function Badge({ tone = "neutral", dot = false, children, className = "" }) {
  return <span className={`badge tone-${tone} ${dot ? "badge-dot" : ""} ${className}`}>{children}</span>;
}

export const StandingBadge = ({ standing }) =>
  standing === "irregular" ? <Badge tone="warn" dot>Irregular</Badge> : <Badge tone="ok" dot>Regular</Badge>;

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] || status}</Badge>;

// How to read SJC grades: 1.00 is highest, 3.00 is the lowest passing grade, past 3.00 (5.00) fails.
// `warnings` adds the midterm warning badges shown next to midterm grades.
export function GradeLegend({ className = "", warnings = false }) {
  const item = "inline-flex items-center gap-2";
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-2 ${className}`} aria-label="How grades work">
      <span className="font-semibold text-ink">How grades work:</span>
      <span className={item}><Badge tone="ok">1.00 – 3.00</Badge>Passed (1.00 is the highest)</span>
      <span className={item}><Badge tone="bad">5.00</Badge>Failed</span>
      {warnings && <span className={item}><Badge tone="warn">Close to the passing line</Badge>Midterm of 2.75 – 3.00</span>}
      {warnings && <span className={item}><Badge tone="bad">Failing at midterm</Badge>Midterm of 5.00</span>}
      <span className={item}><Badge tone="warn">INC</Badge>Incomplete</span>
      <span className={item}><Badge tone="neutral">Dropped</Badge>Withdrawn from the class</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[17px] font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div role="status" className="flex min-h-[240px] items-center justify-center gap-3 text-[14px] text-ink-3">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 p-6">
      <div className="flex items-center gap-2 font-semibold text-bad">
        <AlertTriangle size={18} aria-hidden="true" /> Couldn't load this page
      </div>
      <p className="text-[14px] text-ink-2">{error?.message || "Check your connection and try again."}</p>
      {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="px-5 py-12 text-center text-[14px] text-ink-3">{children}</div>;
}

export function Modal({ title, onClose, children, footer, width = "max-w-md" }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector("input, select, textarea, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`card w-full ${width} max-h-[90vh] overflow-auto shadow-xl`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="modal-title" className="text-[17px] font-bold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ error }) {
  if (!error) return null;
  return <p role="alert" className="rounded-lg px-3 py-2 text-[13px] tone-bad">{error}</p>;
}
