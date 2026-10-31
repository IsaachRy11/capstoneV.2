import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, FileText, Home, Layers, LayoutDashboard, ListChecks, Menu, Search, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getCurrentTerm } from "../services/catalog";
import UserMenu from "./UserMenu";
import TermCalendar from "./TermCalendar";
import { SealLogo } from "./ui";

const PAGE_TITLES = [
  [/^\/$/, "Dashboard"],
  [/^\/students\/[^/]+/, "Student record"],
  [/^\/students/, "Students"],
  [/^\/sections/, "Section allocations"],
  [/^\/curriculum/, "Curriculum"],
  [/^\/record/, "Academic record"],
  [/^\/progress/, "Subject tracker"],
  [/^\/schedules/, "Schedules"],
  [/^\/schedule/, "Schedule"],
  [/^\/profile/, "Profile"],
  [/^\/settings/, "Settings"],
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
      <SealLogo size={44} />
      <div>
        <div className="font-display text-[16px] font-bold leading-tight text-ink">CCS Subject Monitoring System</div>
        <div className="text-[13px] text-ink-3">Saint Joseph College</div>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const isSecretary = user.role === "secretary";
  const link = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-line bg-surface">
      <Brand />
      <nav aria-label="Main" className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3" onClick={onNavigate}>
        {isSecretary ? (
          <>
            <NavLink to="/" end className={link}><LayoutDashboard size={20} aria-hidden="true" />Dashboard</NavLink>
            <div className="px-3.5 pb-2 pt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Records</div>
            <NavLink to="/students" className={link}>
              <Users size={20} aria-hidden="true" />Students
            </NavLink>
            <NavLink to="/sections" className={link}><Layers size={20} aria-hidden="true" />Section allocations</NavLink>
            <NavLink to="/schedules" className={link}><CalendarClock size={20} aria-hidden="true" />Schedules</NavLink>
            <NavLink to="/curriculum" className={link}><BookOpen size={20} aria-hidden="true" />Curriculum</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/" end className={link}><Home size={20} aria-hidden="true" />Home</NavLink>
            <NavLink to="/schedule" className={link}><CalendarClock size={20} aria-hidden="true" />Schedule</NavLink>
            <NavLink to="/progress" className={link}><ListChecks size={20} aria-hidden="true" />Subject tracker</NavLink>
            <NavLink to="/record" className={link}><FileText size={20} aria-hidden="true" />Academic record</NavLink>
            <NavLink to="/curriculum" className={link}><BookOpen size={20} aria-hidden="true" />Curriculum</NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const term = useAsync(getCurrentTerm, []);

  const title = location.pathname === "/"
    ? (user.role === "secretary" ? "Dashboard" : "Home")
    : PAGE_TITLES.find(([re]) => re.test(location.pathname))?.[1] || "";
  const search = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/students?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-ground">
    <div className="flex flex-1">
      <div className="no-print sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </div>
      {menuOpen && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full shadow-xl"><Sidebar onNavigate={(e) => e.target.closest("a") && setMenuOpen(false)} /></div>
          <button className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-8">
          <button className="icon-btn lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          <div className="flex-1 font-display text-[18px] font-bold tracking-tight text-ink">{title}</div>
          {user.role === "secretary" && (
            <form onSubmit={search} role="search" className="relative hidden w-[320px] md:block">
              <label htmlFor="global-search" className="sr-only">Search students</label>
              <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
              <input id="global-search" className="field pl-9" placeholder="Search students by name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
          <TermCalendar term={term.data} />
          <UserMenu />
        </header>

        <main className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet context={{ term: term.data, termLoading: term.loading }} />
        </main>
      </div>
    </div>

      {/* Full-width footer, under the sidebar too */}
      <footer className="no-print border-t border-line bg-surface px-6 py-7 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-5">
          <div>
            <div className="font-display text-[16px] font-bold text-ink">CCS Subject Monitoring System</div>
            <p className="mt-0.5 text-[13px] text-ink-3">College of Computer Studies · Saint Joseph College, Maasin City, Southern Leyte</p>
          </div>
          <div className="flex flex-col gap-1 text-[13px] text-ink-3 sm:text-right">
            <span>Questions about your records? Visit the CCS office.</span>
            <span>© {new Date().getFullYear()} CCS Subject Monitoring System · Capstone project</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
