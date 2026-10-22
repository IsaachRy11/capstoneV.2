import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "../components/ProfileModal";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Menu,
  ChevronLeft,
  ChevronDown,
  Layers,
  LogOut,
  BookOpen,
  Settings,
  AlertCircle,
  BookMarked
} from "lucide-react";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [studentsMenuOpen, setStudentsMenuOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isStudent = user?.role === "student";

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  // Helper to check if a student sub-menu item is active based on path and search param
  const isSubItemActive = (yearParam) => {
    if (location.pathname !== "/students") return false;
    const params = new URLSearchParams(location.search);
    const activeYr = params.get("year") || "all";
    return activeYr === yearParam;
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans selection:bg-orange-100 selection:text-orange-900">
      
      {/* Sidebar Navigation Panel */}
      <aside
        className={`${
          isOpen ? "w-[240px]" : "w-[72px]"
        } bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 transition-all duration-300 relative shadow-sm z-20`}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-5 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 rounded-full p-1 z-20 shadow-xs transition-colors"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={13} /> : <Menu size={13} />}
        </button>

        {/* Logo Branding */}
        <div className={`px-4 py-4 border-b border-slate-100 flex items-center ${isOpen ? "gap-3" : "justify-center px-0"}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#f97316] flex items-center justify-center flex-shrink-0 shadow-sm shadow-orange-500/20">
            <GraduationCap size={19} color="white" />
          </div>
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-[14px] font-bold text-slate-900 tracking-tight leading-tight">CCS Monitor</p>
              <p className="text-[11px] font-semibold text-orange-600 mt-0.5">Saint Joseph College</p>
            </div>
          )}
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 py-4 px-2.5 overflow-y-auto">
          {isOpen && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-2.5">
              {isStudent ? "Student Portal" : "Main Navigation"}
            </p>
          )}

          <div className="flex flex-col gap-1">
            
            {/* Dashboard Link */}
            <NavLink
              to="/"
              end
              title={!isOpen ? "Dashboard" : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-[13.5px] transition-all duration-150 ${
                  isOpen ? "px-3 py-2 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                } ${
                  isActive
                    ? "bg-orange-50/80 text-orange-700 font-semibold border-orange-500 shadow-xs"
                    : "text-slate-600 font-medium border-transparent hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <LayoutDashboard size={isOpen ? 17 : 20} className="flex-shrink-0" />
              {isOpen && <span className="whitespace-nowrap overflow-hidden">Dashboard</span>}
            </NavLink>

            {/* STUDENT ROLE NAV */}
            {isStudent ? (
              <>
                <NavLink
                  to={`/students/${user?.id || "2025-0014"}`}
                  title={!isOpen ? "Academic Record" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[13.5px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-orange-50/80 text-orange-700 font-semibold border-orange-500 shadow-xs"
                        : "text-slate-600 font-medium border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <BookOpen size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Academic Record</span>}
                </NavLink>

                <NavLink
                  to="/subjects"
                  title={!isOpen ? "Curriculum" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[13.5px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-orange-50/80 text-orange-700 font-semibold border-orange-500 shadow-xs"
                        : "text-slate-600 font-medium border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <BookMarked size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Curriculum</span>}
                </NavLink>
              </>
            ) : (
              /* SECRETARY NAV */
              <>
                <div>
                  <button
                    onClick={() => {
                      if (!isOpen) setIsOpen(true);
                      setStudentsMenuOpen(!studentsMenuOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl text-[13.5px] font-medium transition-all duration-150 ${
                      isOpen ? "px-3 py-2 gap-2.5 border-l-2 border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900" : "p-2.5 justify-center border-l-2 border-transparent mx-1 text-slate-600"
                    }`}
                    title={!isOpen ? "Student List" : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users size={isOpen ? 17 : 20} className="flex-shrink-0" />
                      {isOpen && <span className="whitespace-nowrap font-semibold">Student List</span>}
                    </div>
                    {isOpen && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 text-slate-400 ${studentsMenuOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {/* Sub-menu Dropdown Items */}
                  {isOpen && studentsMenuOpen && (
                    <div className="ml-5 pl-2 border-l border-orange-200/70 mt-1 flex flex-col gap-0.5">
                      
                      <NavLink
                        to="/students"
                        end
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors block ${
                            isSubItemActive("all")
                              ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`
                        }
                      >
                        All Student Registry
                      </NavLink>

                      <NavLink
                        to="/students?year=1"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("1")
                              ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`
                        }
                      >
                        <span>1st Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isSubItemActive("1") ? "bg-orange-600 text-white" : "bg-orange-100/70 text-orange-700"
                        }`}>1st Yr</span>
                      </NavLink>

                      <NavLink
                        to="/students?year=2"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("2")
                              ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`
                        }
                      >
                        <span>2nd Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isSubItemActive("2") ? "bg-orange-600 text-white" : "bg-orange-100/70 text-orange-700"
                        }`}>2nd Yr</span>
                      </NavLink>

                      <NavLink
                        to="/students?year=3"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("3")
                              ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`
                        }
                      >
                        <span>3rd Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isSubItemActive("3") ? "bg-orange-600 text-white" : "bg-orange-100/70 text-orange-700"
                        }`}>3rd Yr</span>
                      </NavLink>

                      <NavLink
                        to="/students?year=4"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("4")
                              ? "bg-orange-50 text-orange-700 font-semibold shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`
                        }
                      >
                        <span>4th Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                          isSubItemActive("4") ? "bg-orange-600 text-white" : "bg-orange-100/70 text-orange-700"
                        }`}>4th Yr</span>
                      </NavLink>

                    </div>
                  )}
                </div>

                {/* SJC RGDPD Section Allocations */}
                <NavLink
                  to="/sections"
                  title={!isOpen ? "Sections & Capacities" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[13.5px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-orange-50/80 text-orange-700 font-semibold border-orange-500 shadow-xs"
                        : "text-slate-600 font-medium border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <Layers size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Section Allocations</span>}
                </NavLink>

                {/* Curriculum Link */}
                <NavLink
                  to="/subjects"
                  title={!isOpen ? "Curriculum" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[13.5px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-orange-50/80 text-orange-700 font-semibold border-orange-500 shadow-xs"
                        : "text-slate-600 font-medium border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`
                  }
                >
                  <BookMarked size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Curriculum</span>}
                </NavLink>
              </>
            )}

          </div>
        </nav>

        {/* Sidebar Bottom Footer: User Profile & Environmental Log Out */}
        <div className="border-t border-slate-100 p-3 flex flex-col gap-1.5">
          
          {/* User Profile Card */}
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-orange-50/60 cursor-pointer transition-colors group"
            title="Click to edit profile"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ea580c] to-[#f97316] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-xs">
              {user?.avatar || "US"}
            </div>
            {isOpen && (
              <div className="overflow-hidden whitespace-nowrap min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                  {user?.name || "Guest User"}
                </p>
                <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider truncate">
                  {user?.role === "secretary" ? "Dept. Secretary" : "Student View"}
                </p>
              </div>
            )}
          </div>

          {/* Environmental Log Out Button - Sleek & Harmonized with Sidebar Environment */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-2 rounded-xl text-[12.5px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 border border-transparent hover:border-rose-200/60 transition-all duration-150 ${
              isOpen ? "px-2.5 py-1.5 justify-start" : "p-2 justify-center"
            }`}
            title="Sign Out"
          >
            <LogOut size={15} className="flex-shrink-0 transition-colors" />
            {isOpen && <span>Sign Out</span>}
          </button>

        </div>

      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar Header */}
        <header className="h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
            <span>Saint Joseph College</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">CCS Subject Monitoring System</span>
          </div>

          {/* TOP RIGHT CORNER SETTINGS BUTTON */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200/80 text-orange-700 px-3 py-1.5 rounded-full transition-all duration-150 shadow-xs group"
            title="Profile & Settings"
          >
            <Settings size={14} className="text-orange-600 group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-[12.5px] font-semibold text-orange-800">
              Settings
            </span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto px-8 py-7 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>

      {/* Interactive Profile & Password Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Accidental Click Prevention: Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={20} />
            </div>
            <h3 className="text-[15.5px] font-bold text-slate-900 mb-1">Confirm Sign Out</h3>
            <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to end your current session and sign out of the portal?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-9 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-[13px] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[13px] rounded-lg transition-all shadow-xs active:scale-95"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}