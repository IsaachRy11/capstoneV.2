import { Link, NavLink } from "react-router-dom";
import { ChevronRight, LayoutGrid } from "lucide-react";

// Phones have no sidebar dropdown, so the two tracker views are a switch at the top of each page.
export function TrackerSwitch() {
  const tab = ({ isActive }) => `flex h-10 flex-1 items-center justify-center rounded-md px-3 text-[13px] font-semibold ${isActive ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`;
  return (
    <nav aria-label="Subject tracker views" className="seg seg-fill no-print lg:hidden">
      <NavLink to="/progress" end className={tab}>This semester</NavLink>
      <NavLink to="/progress/roadmap" className={tab}>Roadmap</NavLink>
      <NavLink to="/curriculum" className={tab}>Curriculum</NavLink>
    </nav>
  );
}

// The end of both tracker pages: the full, official curriculum is one tap away.
export function CurriculumLink() {
  return (
    <Link to="/curriculum" className="card press group flex items-center gap-4 p-5 text-ink hover:border-accent">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint text-accent"><LayoutGrid size={20} aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-bold">Want a clear view of your curriculum?</span>
        <span className="text-[13px] text-ink-3">Every subject, semester by semester, with its prerequisites.</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
    </Link>
  );
}
