import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, GraduationCap } from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
];

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-[#f6f8fa] font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[210px] bg-white border-r border-[#d0d7de] flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#d0d7de]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a7f37] flex items-center justify-center flex-shrink-0">
              <GraduationCap size={16} color="white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1f2328] leading-tight">CCS Subject Monitor</p>
              <p className="text-[10px] text-[#9198a1] tracking-wide mt-0.5">Saint Joseph College</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          <p className="text-[9px] font-semibold text-[#9198a1] uppercase tracking-widest px-2 mb-2">
            Navigation
          </p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] mb-0.5 transition-all duration-100 border-l-2 ` +
                (isActive
                  ? "bg-[#dafbe1] text-[#1a7f37] font-semibold border-[#1a7f37]"
                  : "text-[#656d76] font-normal border-transparent hover:bg-[#f6f8fa] hover:text-[#1f2328]")
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-[#d0d7de]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#dafbe1] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-[#1a7f37]">AR</span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#1f2328]">Dr. A. Reyes</p>
              <p className="text-[10px] text-[#9198a1]">CCS Adviser</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto px-8 py-7">
        <Outlet />
      </main>

    </div>
  );
}