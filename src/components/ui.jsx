import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { STATUS_LABEL, STATUS_TONE, STUDENT_STATUS_LABEL, STUDENT_STATUS_TONE, colorIndex, initials, studentStatusKey } from "../lib/format";


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
// grey = NC or Dropped (no final grade).
// Each color always comes with words, so meaning never depends on color alone.
const LEGEND = {
  passed: { color: "var(--mark-ok)", label: "Passed", detail: "1.00 – 3.00" },
  failing: { color: "var(--mark-bad)", label: "Failed", detail: "5.00" },
  other: { color: "var(--mark-none)", label: "NC or Dropped", detail: "No grade" },
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
    <div className="card-head flex items-start justify-between gap-3 px-5 py-4">
      <div>
        <h2 className="text-[17px] font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Placeholder shapes shown while data loads, like the gray cards social apps show before a feed appears.
// "page" (default): a title bar, summary cards and a list card. "list": only rows, for inside a card or dialog.
// Screen readers hear the label; the shapes themselves are hidden from them.
const SKEL_ROWS = ["72%", "58%", "66%", "50%", "62%"];
function SkelRows({ count = 4 }) {
  return SKEL_ROWS.slice(0, count).map((w, i) => (
    <div key={i} className="flex items-center gap-3 px-4 py-3">
      <span className="skel skel-round h-9 w-9 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="skel h-3.5" style={{ width: w }} />
        <span className="skel h-3" style={{ width: "34%" }} />
      </span>
    </div>
  ));
}
export function LoadingState({ label = "Loading…", variant = "page" }) {
  if (variant === "list") {
    return (
      <div role="status" aria-busy="true" className="divide-y divide-line-2 py-1">
        <span className="sr-only">{label}</span>
        <div aria-hidden="true"><SkelRows count={3} /></div>
      </div>
    );
  }
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 sm:gap-5">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        <span className="skel h-7 w-48 max-w-[60%]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card flex flex-col gap-3 p-4">
              <span className="skel h-3 w-1/2" />
              <span className="skel h-7 w-2/5" />
              <span className="skel h-3 w-3/4" />
            </div>
          ))}
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-line px-4 py-4"><span className="skel h-4 w-40" /></div>
          <div className="divide-y divide-line-2"><SkelRows count={5} /></div>
        </div>
      </div>
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
        <div className="card-head flex items-center justify-between px-5 py-3 sm:py-4">
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
