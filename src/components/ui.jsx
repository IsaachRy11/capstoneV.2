import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, X } from "lucide-react";
import { STATUS_LABEL, STATUS_TONE, STUDENT_STATUS_LABEL, STUDENT_STATUS_TONE, colorIndex, initials, studentStatusKey } from "../lib/format";

// "Back" for pages you reach by clicking. With `to` it always goes there (a detail view back to its list).
// Without it, it steps back in history, or goes to `fallback` when the page was opened directly.
export function BackButton({ to, fallback = "/", label = "Back" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cls = "no-print -ml-2 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-lg px-2 text-[14px] font-semibold text-ink-2 hover:bg-hover hover:text-ink";
  const icon = <ArrowLeft size={16} aria-hidden="true" />;
  if (to) return <Link to={to} className={cls}>{icon}{label}</Link>;
  return (
    <button type="button" className={cls} onClick={() => (location.key === "default" ? navigate(fallback) : navigate(-1))}>
      {icon}{label}
    </button>
  );
}

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

// A student's status: Regular or Irregular while active, otherwise Graduated, Dropped or Inactive.
// student: anything with { status, standing } (v_student_overview rows have both).
export const StudentStatusBadge = ({ student }) => {
  const key = studentStatusKey(student);
  return <Badge tone={STUDENT_STATUS_TONE[key]} dot>{STUDENT_STATUS_LABEL[key]}</Badge>;
};

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] || status}</Badge>;

// Grade color meanings, used everywhere: red = failing, green = passed,
// grey = INC or Dropped (no final grade).
// Each color always comes with words, so meaning never depends on color alone.
const LEGEND = {
  passed: { color: "var(--mark-ok)", label: "Passed", detail: "1.00 – 3.00" },
  failing: { color: "var(--mark-bad)", label: "Failed", detail: "5.00" },
  other: { color: "var(--mark-none)", label: "INC or Dropped", detail: "No grade" },
};

// Swatches use the brighter --mark-* colors (distinct at a glance); text keeps the darker readable tones.
function LegendRow({ color, label, detail }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="h-1.5 w-8 shrink-0 rounded-full sm:mt-[7px]" style={{ background: color }} aria-hidden="true" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-semibold leading-tight text-ink">{label}</span>
        <span className="text-[12px] text-ink-3">{detail}</span>
      </span>
    </li>
  );
}

// Every legend says it is a legend: a small "Legend" label, then what the colors stand for.
// One legend for midterm and final grades alike: they use the same scale.
// Phones: the three entries sit side by side (one short row); wider screens give each more room.
export function GradeLegend({ className = "", compact = false }) {
  return (
    <section className={className} aria-labelledby="grade-legend-title">
      <h2 id="grade-legend-title" className="mb-2.5 flex items-baseline gap-2 text-[12px] font-semibold text-ink-3">
        <span className="uppercase tracking-[0.08em]">Legend</span>
        <span className="font-medium normal-case tracking-normal">· grade colors</span>
      </h2>
      <ul className={compact ? "flex flex-col gap-2.5" : "grid grid-cols-3 gap-x-3 gap-y-2.5 sm:gap-x-8 sm:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]"}>
        <LegendRow {...LEGEND.passed} />
        <LegendRow {...LEGEND.failing} />
        <LegendRow {...LEGEND.other} />
      </ul>
    </section>
  );
}

// The top bar already shows the page name, so the title here is screen-reader only unless
// `showTitle` is set (e.g. Curriculum, where the title is the program name, i.e. real content).
export function PageHeader({ title, subtitle, actions, showTitle = false }) {
  if (!showTitle && !subtitle && !actions) return <h1 className="sr-only">{title}</h1>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className={showTitle ? "text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]" : "sr-only"}>{title}</h1>
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
    <div className="sheet-wrap fixed inset-0 z-50 bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {/* Phones: a bottom sheet (thumb-reachable, full-width buttons). PC: a centered dialog. See .sheet in index.css. */}
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`card sheet w-full ${width === "max-w-lg" ? "sm:max-w-lg" : "sm:max-w-md"} flex flex-col overflow-hidden shadow-xl`}>
        <span className="sheet-grip" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-line px-5 py-3 sm:py-4">
          <h2 id="modal-title" className="text-[17px] font-bold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {/* Only the body scrolls, so the title and the action buttons stay in reach. */}
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">{children}</div>
        {footer && <div className="sheet-footer border-t border-line px-5 pt-4">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ error }) {
  if (!error) return null;
  return <p role="alert" className="rounded-lg px-3 py-2 text-[13px] tone-bad">{error}</p>;
}
