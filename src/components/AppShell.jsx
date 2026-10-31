import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Calendar, FileText, Home, Layers, LayoutDashboard, Menu, Search, Users, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getCurrentTerm } from "../services/catalog";
import { supabase, unwrap } from "../lib/supabase";
import { termLabel, yearLabel } from "../lib/format";
import UserMenu from "./UserMenu";
import { SealLogo } from "./ui";

const PAGE_TITLES = [
  [/^\/$/, "Dashboard"],
  [/^\/students\/[^/]+/, "Student record"],
  [/^\/students/, "Students"],
  [/^\/sections/, "Section allocations"],
  [/^\/curriculum/, "Curriculum"],
  [/^\/record/, "Academic record"],
  [/^\/profile/, "Profile"],
  [/^\/settings/, "Settings"],
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
      <SealLogo size={36} />
      <div>
        <div className="font-display text-[15px] font-bold text-ink">CCS Monitor</div>
        <div className="text-[12px] text-ink-3">Saint Joseph College</div>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const isSecretary = user.role === "secretary";

  const yearCounts = useAsync(
    () => (isSecretary ? unwrap(supabase.from("v_student_overview").select("year_level")) : Promise.resolve([])),
    [isSecretary]
  );
  const counts = (yearCounts.data || []).reduce((acc, r) => ({ ...acc, [r.year_level]: (acc[r.year_level] || 0) + 1 }), {});
  const total = yearCounts.data?.length;
  const activeYear = location.pathname === "/students" ? params.get("year") : null;
  const link = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

  return (
    <aside className="flex h-full w-[248px] flex-col border-r border-line bg-surface">
      <Brand />
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2" onClick={onNavigate}>
        {isSecretary ? (
          <>
            <NavLink to="/" end className={link}><LayoutDashboard size={18} aria-hidden="true" />Dashboard</NavLink>
            <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Records</div>
            <NavLink to="/students" end className={({ isActive }) => link({ isActive: isActive && !activeYear })}>
              <Users size={18} aria-hidden="true" /><span className="flex-1">Students</span>
              {total !== undefined && <span className="font-mono text-[12px] text-ink-3">{total}</span>}
            </NavLink>
            {[1, 2, 3, 4].map((y) => (
              <NavLink key={y} to={`/students?year=${y}`}
                className={`flex min-h-[36px] items-center justify-between rounded-lg pl-10 pr-3 text-[13px] ${activeYear === String(y) ? "bg-tint font-semibold text-tint-ink" : "text-ink-2 hover:bg-hover hover:text-ink"}`}>
                <span>{yearLabel(y)}</span>
                <span className="font-mono text-[12px] text-ink-3">{counts[y] ?? 0}</span>
              </NavLink>
            ))}
            <NavLink to="/sections" className={link}><Layers size={18} aria-hidden="true" />Section allocations</NavLink>
            <NavLink to="/curriculum" className={link}><BookOpen size={18} aria-hidden="true" />Curriculum</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/" end className={link}><Home size={18} aria-hidden="true" />Home</NavLink>
            <NavLink to="/record" className={link}><FileText size={18} aria-hidden="true" />Academic record</NavLink>
            <NavLink to="/curriculum" className={link}><BookOpen size={18} aria-hidden="true" />Curriculum</NavLink>
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

  const title = PAGE_TITLES.find(([re]) => re.test(location.pathname))?.[1] || "";
  const search = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/students?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="flex min-h-screen bg-ground">
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
          <div className="flex-1 text-[14px] font-semibold text-ink">{title}</div>
          {user.role === "secretary" && (
            <form onSubmit={search} role="search" className="relative hidden w-[320px] md:block">
              <label htmlFor="global-search" className="sr-only">Search students</label>
              <Search size={16} className="absolute left-3 top-3 text-ink-3" aria-hidden="true" />
              <input id="global-search" className="field pl-9" placeholder="Search students by name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
          )}
          {term.data && (
            <div className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-line px-3 text-[13px] font-semibold text-ink-2 sm:inline-flex">
              <Calendar size={16} aria-hidden="true" />{termLabel(term.data)}
            </div>
          )}
          <UserMenu />
        </header>

        <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet context={{ term: term.data, termLoading: term.loading }} />
        </main>
      </div>
    </div>
  );
}
