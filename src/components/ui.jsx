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
  return <img src="/ccs.png" alt="" width={size} height={size} className={`shrink-0 rounded-full ${className}`} />;
}

export function Badge({ tone = "neutral", dot = false, children, className = "" }) {
  return <span className={`badge tone-${tone} ${dot ? "badge-dot" : ""} ${className}`}>{children}</span>;
}

export const StandingBadge = ({ standing }) =>
  standing === "irregular" ? <Badge tone="warn" dot>Irregular</Badge> : <Badge tone="ok" dot>Regular</Badge>;

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] || status}</Badge>;

// Grade color meanings, used everywhere: red = failing, green = passed,
// yellow = close to the passing line (still passing), grey = INC or Dropped (no final grade).
// Each color always comes with words, so meaning never depends on color alone.
const LEGEND = {
  failing: { color: "var(--bad)", label: "Failing", detail: "5.00" },
  passed: { color: "var(--ok)", label: "Passed", detail: "1.00 – 3.00 · 1.00 is the highest" },
  close: { color: "var(--warn)", label: "Close to the passing line", detail: "Midterm of 2.75 – 3.00" },
  other: { color: "var(--ink-3)", label: "INC or Dropped", detail: "No final grade" },
};

function LegendRow({ color, label, detail }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-[9px] h-1 w-7 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[12px] text-ink-3">{detail}</span>
      </span>
    </li>
  );
}

// `compact`: vertical list for side panels. `warnings`: include the midterm warning color.
export function GradeLegend({ className = "", warnings = false, compact = false }) {
  if (compact) {
    return (
      <div className={className}>
        <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">What the colors mean</div>
        <ul className="flex flex-col gap-2.5">
          {[LEGEND.failing, LEGEND.passed, LEGEND.close, LEGEND.other].map((r) => <LegendRow key={r.label} {...r} />)}
        </ul>
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap gap-x-10 gap-y-4 ${className}`} aria-label="What the grade colors mean">
      <div>
        <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Final grades</div>
        <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-3">
          <LegendRow {...LEGEND.passed} />
          <LegendRow {...LEGEND.failing} label="Failed" />
          <LegendRow {...LEGEND.other} />
        </ul>
      </div>
      {warnings && (
        <div>
          <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Midterm warnings</div>
          <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            <LegendRow {...LEGEND.close} />
            <LegendRow {...LEGEND.failing} label="Failing at midterm" detail="Midterm of 5.00" />
          </ul>
        </div>
      )}
    </div>
  );
}

// The top bar already shows the page name, so the title here is screen-reader only unless
// `showTitle` is set (e.g. Curriculum, where the title is the program name, i.e. real content).
export function PageHeader({ title, subtitle, actions, showTitle = false }) {
  if (!showTitle && !subtitle && !actions) return <h1 className="sr-only">{title}</h1>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className={showTitle ? "text-[28px] font-bold tracking-tight" : "sr-only"}>{title}</h1>
        {subtitle && <p className={showTitle ? "text-[15px] text-ink-2" : "text-[15px] font-medium text-ink-2"}>{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap gap-2.5">{actions}</div>}
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
