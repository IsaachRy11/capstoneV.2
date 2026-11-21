import { Fragment, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, CalendarRange, FileText, Home, Layers, LayoutDashboard, ListChecks, Monitor, ChevronDown, PanelLeftClose, PanelLeftOpen, Search, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getCurrentTerm } from "../services/catalog";
import UserMenu from "./UserMenu";
import TermCalendar from "./TermCalendar";
import ErrorBoundary from "./ErrorBoundary";
import { SealLogo } from "./ui";
import Backdrop from "./Backdrop";
import ChromeArt from "./ChromeArt";

const PAGE_TITLES = [
  [/^\/$/, "Dashboard"],
  [/^\/students\/[^/]+/, "Student record"],
  [/^\/students/, "Students"],
  [/^\/sections\/enroll/, "Add students"],
  [/^\/sections/, "Section allocations"],
  [/^\/curriculum/, "Curriculum"],
  [/^\/school-year/, "Start new term"],
  [/^\/record/, "Academic record"],
  [/^\/progress/, "Subject tracker"],
  [/^\/schedules\/edit/, "Edit class times"],
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

// One list drives both navigations: the sidebar on PC and the bottom tab bar on phones.
// "tab" is the short label that fits under a tab icon.
const NAV = {
  secretary: [
    { to: "/", end: true, icon: LayoutDashboard, label: "Dashboard", tab: "Home" },
    { to: "/students", icon: Users, label: "Students", tab: "Students", group: "Records", byList: true,
      children: [{ to: "/students", label: "Enrolled" }, { to: "/students?list=graduated", label: "Graduated" }, { to: "/students?list=dropped", label: "Dropped" }, { to: "/students?list=shifted_out", label: "Shifted out" }] },
    { to: "/sections", icon: Layers, label: "Section allocations", tab: "Sections" },
    { to: "/schedules", icon: CalendarClock, label: "Schedules", tab: "Schedules", children: [{ to: "/schedules", end: true, label: "Timetables" }, { to: "/schedules/edit", label: "Edit class times" }] },
    { to: "/curriculum", icon: BookOpen, label: "Curriculum", tab: "Curriculum" },
    // Not in the phone tab bar: starting a term is done on a computer.
    { to: "/school-year", icon: CalendarRange, label: "New term", noTab: true },
  ],
  student: [
    { to: "/", end: true, icon: Home, label: "Home", tab: "Home" },
    { to: "/schedule", icon: CalendarClock, label: "Schedule", tab: "Schedule" },
    { to: "/progress", icon: ListChecks, label: "Subject tracker", tab: "Tracker", children: [{ to: "/progress", end: true, label: "This semester" }, { to: "/progress/roadmap", label: "Roadmap" }, { to: "/curriculum", label: "Curriculum" }] },
    { to: "/record", icon: FileText, label: "Academic record", tab: "Grades" },
  ],
};

// Phones and tablets: the main pages are one thumb-tap away at the bottom of the screen, like an app.
function BottomTabs() {
  const { user } = useAuth();
  return (
    <nav aria-label="Main" className="tabbar chrome no-print lg:hidden">
      {NAV[user.role].filter((item) => !item.noTab).map(({ to, end, icon: Icon, label, tab }) => (
        <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
          <span className="tab-icon"><Icon size={21} aria-hidden="true" /></span>
          <span>{tab}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// A menu entry with a dropdown (Subject tracker: This semester / Roadmap). It opens by itself while you are
// inside it, and the arrow opens or closes it by hand. In the icon rail only the main icon shows.
function NavGroup({ item, collapsed }) {
  const location = useLocation();
  const inside = item.children.some((c) => location.pathname.startsWith(c.to.split("?")[0]));
  // Some children differ only by query (Students > Graduated is /students?list=graduated): active when the list matches.
  const list = new URLSearchParams(location.search).get("list") || "enrolled";
  const queryActive = (c) => location.pathname === "/students" && (new URLSearchParams(c.to.split("?")[1] || "").get("list") || "enrolled") === list;
  const [manual, setManual] = useState(null); // null = follow the page, true/false = the user chose
  const open = !collapsed && (manual ?? inside);
  const Icon = item.icon;
  return (
    <div>
      <div className="flex items-center gap-1">
        <NavLink to={item.to} className={`nav-link flex-1 ${inside ? "active" : ""}`} title={collapsed ? item.label : undefined} onClick={() => setManual(null)}>
          <Icon size={20} className="shrink-0" aria-hidden="true" /><span className="nav-label">{item.label}</span>
        </NavLink>
        {!collapsed && (
          <button type="button" className="icon-btn" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} ${item.label} views`} onClick={() => setManual(!open)}>
            <ChevronDown size={18} className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <div className="ml-[22px] mt-1 flex flex-col gap-0.5 border-l border-line pl-3">
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} end={c.end} className={({ isActive }) => `nav-sub ${(item.byList ? queryActive(c) : isActive) ? "active" : ""}`}>{c.label}</NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed = false, onToggle }) {
  const { user } = useAuth();

  return (
    <aside className={`chrome relative isolate flex h-full flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "sidebar-collapsed w-[76px]" : "w-[280px]"}`}>
      {!collapsed && <ChromeArt variant="side" />}
      <Brand />
      <nav aria-label="Main" className="flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 py-3">
        {NAV[user.role].map((item) => (
          <Fragment key={item.to}>
            {item.group && <div className="nav-label px-3.5 pb-2 pt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3" aria-hidden={collapsed}>{item.group}</div>}
            {item.children
              ? <NavGroup item={item} collapsed={collapsed} />
              : <NavItem collapsed={collapsed} to={item.to} end={item.end} icon={item.icon} label={item.label} />}
          </Fragment>
        ))}
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
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleSidebar = () => setCollapsed((c) => {
    try { localStorage.setItem(SIDEBAR_KEY, c ? "open" : "collapsed"); } catch { /* private mode: just don't remember */ }
    return !c;
  });
  const [q, setQ] = useState("");
  const term = useAsync(getCurrentTerm, [], "term");

  const title = location.pathname === "/"
    ? (user.role === "secretary" ? "Dashboard" : "Home")
    : PAGE_TITLES.find(([re]) => re.test(location.pathname))?.[1] || "";
  const search = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/students?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-ground">
    <Backdrop />
    <div className="flex flex-1">
      <div className="no-print sticky top-0 hidden h-screen lg:block">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones: the bar stays at the top while the page scrolls; the seal stands in for the sidebar brand. */}
        <header className="chrome no-print sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-2 sm:px-8 lg:min-h-16 lg:py-3 isolate">
          <ChromeArt variant="bar" />
          <span className="shrink-0 lg:hidden"><SealLogo size={30} /></span>
          <div className="min-w-0 flex-1 truncate font-display text-[18px] font-bold tracking-tight text-ink">{title}</div>
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

        <main className="flex w-full flex-1 flex-col gap-4 px-4 pb-28 pt-4 sm:gap-6 sm:px-8 sm:pt-8 lg:pb-8">
          {/* `npm run dev:rehearsal` points the app at the rehearsal copy of the database: say so on every page. */}
          {import.meta.env.MODE === "rehearsal" && (
            <p role="status" className="no-print -mb-1 rounded-lg px-3 py-2 text-[13px] font-semibold tone-warn">
              Rehearsal copy. This is a test database, not the live site: changes here don&apos;t reach real students.
            </p>
          )}
          {/* Secretary on phones and tablets: view only (editing is desktop work). */}
          {user.role === "secretary" && (
            <p className="no-print -mb-1 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-2 lg:hidden">
              <Monitor size={15} className="shrink-0 text-ink-3" aria-hidden="true" />View only on this screen. Use a computer to add, edit or encode.
            </p>
          )}
          <ErrorBoundary key={location.pathname}>
            <div className="page-in flex flex-1 flex-col gap-4 sm:gap-6">
              <Outlet context={{ term: term.data, termLoading: term.loading }} />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>

      <BottomTabs />

      {/* Full-width footer, under the sidebar too (PC only: phones end at the tab bar) */}
      <footer className="no-print hidden border-t border-line bg-surface px-6 py-7 sm:px-10 lg:block">
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
