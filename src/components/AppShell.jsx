import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, FileText, Home, Layers, LayoutDashboard, ListChecks, Menu, PanelLeftClose, PanelLeftOpen, Search, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getCurrentTerm } from "../services/catalog";
import UserMenu from "./UserMenu";
import TermCalendar from "./TermCalendar";
import ErrorBoundary from "./ErrorBoundary";
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
  [/^\/help/, "Help center"],
  [/^\/privacy/, "Privacy"],
  [/^\/calendar/, "Calendar"],
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
      <span className="shrink-0"><SealLogo size={44} /></span>
      {/* fixed width so the text never rewraps while the sidebar animates; it is clipped and faded instead */}
      <div className="nav-label w-[190px] shrink-0 whitespace-normal">
        <div className="font-display text-[16px] font-bold leading-tight text-ink">CCS Subject Monitoring System</div>
        <div className="text-[13px] text-ink-3">Saint Joseph College</div>
      </div>
    </div>
  );
}

// Collapsed (desktop only): an icon rail. Only the width animates; labels fade but keep their place,
// so icons never move and nothing reflows. The label stays in the DOM, so screen readers still read it.
function NavItem({ to, end, icon: Icon, label, collapsed }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} title={collapsed ? label : undefined}>
      <Icon size={20} className="shrink-0" aria-hidden="true" /><span className="nav-label">{label}</span>
    </NavLink>
  );
}

function Sidebar({ onNavigate, collapsed = false, onToggle }) {
  const { user } = useAuth();
  const isSecretary = user.role === "secretary";

  return (
    <aside className={`flex h-full flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "sidebar-collapsed w-[76px]" : "w-[280px]"}`}>
      <Brand />
      <nav aria-label="Main" className="flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 py-3" onClick={onNavigate}>
        {isSecretary ? (
          <>
            <NavItem collapsed={collapsed} to="/" end icon={LayoutDashboard} label="Dashboard" />
            <div className="nav-label px-3.5 pb-2 pt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3" aria-hidden={collapsed}>Records</div>
            <NavItem collapsed={collapsed} to="/students" icon={Users} label="Students" />
            <NavItem collapsed={collapsed} to="/sections" icon={Layers} label="Section allocations" />
            <NavItem collapsed={collapsed} to="/schedules" icon={CalendarClock} label="Schedules" />
            <NavItem collapsed={collapsed} to="/curriculum" icon={BookOpen} label="Curriculum" />
          </>
        ) : (
          <>
            <NavItem collapsed={collapsed} to="/" end icon={Home} label="Home" />
            <NavItem collapsed={collapsed} to="/schedule" icon={CalendarClock} label="Schedule" />
            <NavItem collapsed={collapsed} to="/progress" icon={ListChecks} label="Subject tracker" />
            <NavItem collapsed={collapsed} to="/record" icon={FileText} label="Academic record" />
            <NavItem collapsed={collapsed} to="/curriculum" icon={BookOpen} label="Curriculum" />
          </>
        )}
      </nav>
      {/* Desktop only: collapse control sits at the bottom of the sidebar, not in the top bar */}
      {onToggle && (
        <div className="border-t border-line px-3 py-3">
          <button type="button" className="nav-link w-full" onClick={onToggle} aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : undefined}>
            {collapsed ? <PanelLeftOpen size={20} className="shrink-0" aria-hidden="true" /> : <PanelLeftClose size={20} className="shrink-0" aria-hidden="true" />}
            <span className="nav-label">Collapse</span>
          </button>
        </div>
      )}
    </aside>
  );
}

const SIDEBAR_KEY = "ccs-sidebar";
function readCollapsed() {
  try { return localStorage.getItem(SIDEBAR_KEY) === "collapsed"; } catch { return false; }
}

export default function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleSidebar = () => setCollapsed((c) => {
    try { localStorage.setItem(SIDEBAR_KEY, c ? "open" : "collapsed"); } catch { /* private mode: just don't remember */ }
    return !c;
  });
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
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </div>
      {menuOpen && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div className="h-full shadow-xl"><Sidebar onNavigate={(e) => e.target.closest("a") && setMenuOpen(false)} /></div>
          <button className="flex-1 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex min-h-16 flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-8">
          <button className="icon-btn lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>          <div className="flex-1 font-display text-[18px] font-bold tracking-tight text-ink">{title}</div>
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
          <ErrorBoundary key={location.pathname}>
            <Outlet context={{ term: term.data, termLoading: term.loading }} />
          </ErrorBoundary>
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
