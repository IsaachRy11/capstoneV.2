import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, GraduationCap, Menu, ChevronLeft } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
];

export default function MainLayout() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#f6f8fa] overflow-hidden">

      {/* Sidebar */}
      <aside 
        className={`${isOpen ? "w-[220px]" : "w-[72px]"} 
        bg-white border-r border-[#d0d7de] flex flex-col flex-shrink-0 transition-all duration-300 relative`}
      >

        {/* Toggle Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-5 bg-white border border-[#d0d7de] text-[#656d76] hover:text-[#1f2328] rounded-full p-1 z-10 shadow-sm"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={14} /> : <Menu size={14} />}
        </button>

        {/* Logo */}
        <div className={`px-4 py-4 border-b border-[#d0d7de] flex items-center ${isOpen ? "gap-3" : "justify-center px-0"}`}>
          <div className="w-9 h-9 rounded-lg bg-[#1a7f37] flex items-center justify-center flex-shrink-0">
            <GraduationCap size={18} color="white" />
          </div>
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-[14px] font-bold text-[#1f2328] leading-tight">CCS Monitor</p>
              <p className="text-[11px] text-[#9198a1] mt-0.5">Saint Joseph College</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-4 ${isOpen ? "px-2" : "px-2"}`}>
          {isOpen && (
            <p className="text-[10px] font-semibold text-[#9198a1] uppercase tracking-widest px-2 mb-3">
              Navigation
            </p>
          )}
          <div className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                title={!isOpen ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-md text-[14px] transition-all duration-100 ${
                    isOpen ? "px-3 py-2 gap-2.5 border-l-2" : "p-2 justify-center border-l-2 mx-1"
                  } ` +
                  (isActive
                    ? "bg-[#dafbe1] text-[#1a7f37] font-semibold border-[#1a7f37]"
                    : "text-[#656d76] font-normal border-transparent hover:bg-[#f6f8fa] hover:text-[#1f2328]")
                }
              >
                <Icon size={isOpen ? 16 : 20} className="flex-shrink-0" />
                {isOpen && <span className="whitespace-nowrap overflow-hidden">{label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User */}
        <div className={`py-4 border-t border-[#d0d7de] ${isOpen ? "px-3" : "px-0 flex justify-center"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#dafbe1] flex items-center justify-center flex-shrink-0" title={!isOpen ? "Dr. A. Reyes" : undefined}>
              <span className="text-[11px] font-bold text-[#1a7f37]">AR</span>
            </div>
            {isOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <p className="text-[13px] font-semibold text-[#1f2328]">Dr. A. Reyes</p>
                <p className="text-[11px] text-[#9198a1]">CCS Adviser</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content — full width, no max-width cap */}
      <main className="flex-1 overflow-auto px-8 py-7 bg-[#f6f8fa]">
        <Outlet />
      </main>

    </div>
  );
}