import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronRight, CircleHelp, LogOut, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui";

const row = (active) =>
  `group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14px] transition-colors focus:outline-none ${
    active ? "bg-tint font-semibold text-tint-ink" : "text-ink hover:bg-hover focus-visible:bg-hover"}`;
const chip = (active) => `flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-surface text-tint-ink" : "bg-hover text-ink-2"}`;

function PageLink({ to, icon: Icon, label, active, onClick }) {
  return (
    <Link to={to} role="menuitem" aria-current={active ? "page" : undefined} className={row(active)} onClick={onClick}>
      <span className={chip(active)}><Icon size={18} aria-hidden="true" /></span>
      <span className="flex-1">{label}</span>
      <ChevronRight size={16} className="text-ink-3" aria-hidden="true" />
    </Link>
  );
}

// Account menu in the top bar: profile card, settings, appearance, help, privacy, sign out.
// The page you're on is highlighted with the same tint as the active sidebar link.
export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menu = useRef(null);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(menu.current?.querySelectorAll('[role="menuitem"]') || [])];
    items()[0]?.focus();
    const onDown = (e) => !wrap.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === "Escape") { setOpen(false); wrap.current?.querySelector("button")?.focus(); }
      if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const isSecretary = user.role === "secretary";
  const here = (to) => pathname === to;

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="relative rounded-full hover:ring-2 hover:ring-line"
      >
        <Avatar name={user.name} url={user.avatarUrl} size={40} />
        {/* small down arrow, like Facebook's account button */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface bg-hover text-ink-2" aria-hidden="true">
          <ChevronDown size={12} strokeWidth={2.5} className={`transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div ref={menu} role="menu" aria-label="Account" className="menu-in card absolute right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-2rem)] p-2 shadow-xl">
          <Link to="/profile" role="menuitem" aria-current={here("/profile") ? "page" : undefined} onClick={close}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors focus:outline-none ${here("/profile") ? "border-transparent bg-tint" : "border-line bg-surface-2 hover:bg-hover focus-visible:bg-hover"}`}>
            <Avatar name={user.name} url={user.avatarUrl} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-[12px] text-ink-3">{isSecretary ? "Secretary" : `Student · ${user.studentId}`}</span>
            </span>
            <span className={`text-[12px] font-semibold ${here("/profile") ? "text-tint-ink" : "text-accent"}`}>Profile</span>
          </Link>

          <div className="mt-2 flex flex-col gap-0.5">
            <PageLink active={here("/settings")} onClick={close} to="/settings" icon={Settings} label="Settings" />
            <button role="menuitem" className={row(false)} onClick={toggleTheme}>
              <span className={chip(false)}>{theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</span>
              <span className="flex-1">Appearance</span>
              <span className="text-[12px] text-ink-3">{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
            <PageLink active={here("/calendar")} onClick={close} to="/calendar" icon={CalendarDays} label="Calendar" />
            <PageLink active={here("/help")} onClick={close} to="/help" icon={CircleHelp} label="Help center" />
            <PageLink active={here("/privacy")} onClick={close} to="/privacy" icon={ShieldCheck} label="Privacy" />
          </div>

          <div className="my-2 h-px bg-line" />
          <button role="menuitem" onClick={() => { close(); signOut(); }}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14px] text-ink transition-colors hover:bg-[var(--bad-bg)] hover:text-bad focus:outline-none focus-visible:bg-[var(--bad-bg)] focus-visible:text-bad">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hover text-ink-2 group-hover:text-bad"><LogOut size={18} aria-hidden="true" /></span>
            Sign out
          </button>

          <p className="px-2 pb-1 pt-2 text-[12px] text-ink-3">CCS Subject Monitoring System · Saint Joseph College</p>
        </div>
      )}
    </div>
  );
}
