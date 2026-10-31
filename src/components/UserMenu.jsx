import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "./ui";

// Account menu in the top bar (avatar → profile, settings, theme, sign out).
export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  // Hover and keyboard focus use the same tinted highlight as the active sidebar link.
  const item = "group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] text-ink transition-colors hover:bg-tint hover:text-tint-ink focus:outline-none focus-visible:bg-tint focus-visible:text-tint-ink";
  const danger = "group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] text-ink transition-colors hover:bg-[var(--bad-bg)] hover:text-bad focus:outline-none focus-visible:bg-[var(--bad-bg)] focus-visible:text-bad";
  const icon = "text-ink-3 transition-colors group-hover:text-current group-focus-visible:text-current";
  const isSecretary = user.role === "secretary";

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="rounded-full hover:ring-2 hover:ring-line"
      >
        <Avatar name={user.name} url={user.avatarUrl} size={40} />
      </button>

      {open && (
        <div ref={menu} role="menu" aria-label="Account" className="card absolute right-0 top-12 z-50 w-[260px] p-1.5 shadow-xl">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={user.name} url={user.avatarUrl} size={40} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-ink">{user.name}</div>
              <div className="truncate text-[12px] text-ink-3">{isSecretary ? "Secretary" : `Student · ${user.studentId}`}</div>
            </div>
          </div>
          <div className="my-1.5 h-px bg-line" />

          <Link to="/profile" role="menuitem" className={item} onClick={close}><User size={17} className={icon} aria-hidden="true" />Profile</Link>
          <Link to="/settings" role="menuitem" className={item} onClick={close}><Settings size={17} className={icon} aria-hidden="true" />Settings</Link>
          <button role="menuitem" className={item} onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={17} className={icon} aria-hidden="true" /> : <Moon size={17} className={icon} aria-hidden="true" />}
            <span className="flex-1">Appearance</span>
            <span className="text-[12px] text-ink-3 group-hover:text-current">{theme === "dark" ? "Dark" : "Light"}</span>
          </button>

          <div className="my-1.5 h-px bg-line" />
          <button role="menuitem" className={danger} onClick={() => { close(); signOut(); }}><LogOut size={17} className={icon} aria-hidden="true" />Sign out</button>
        </div>
      )}
    </div>
  );
}
