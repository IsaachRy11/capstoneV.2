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
    <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans">
      
      {/* Sidebar Navigation Panel */}
      <aside
        className={`${
          isOpen ? "w-[240px]" : "w-[72px]"
        } bg-white border-r border-[#e5e7eb] flex flex-col flex-shrink-0 transition-all duration-300 relative shadow-sm z-20`}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-5 bg-white border border-[#e5e7eb] text-[#4b5563] hover:text-[#111827] rounded-full p-1 z-20 shadow-sm transition-colors"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={14} /> : <Menu size={14} />}
        </button>

        {/* Logo Branding */}
        <div className={`px-4 py-4 border-b border-[#f3f4f6] flex items-center ${isOpen ? "gap-3" : "justify-center px-0"}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center flex-shrink-0 shadow-md">
            <GraduationCap size={19} color="white" />
          </div>
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-[14px] font-bold text-[#111827] leading-tight">CCS Monitor</p>
              <p className="text-[11px] font-semibold text-[#ea580c] mt-0.5">Saint Joseph College</p>
            </div>
          )}
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {isOpen && (
            <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest px-2 mb-3">
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
                `flex items-center rounded-xl text-[14px] transition-all duration-150 ${
                  isOpen ? "px-3 py-2.5 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                } ${
                  isActive
                    ? "bg-[#fff7ed] text-[#ea580c] font-bold border-[#ea580c] shadow-sm"
                    : "text-[#4b5563] font-medium border-transparent hover:bg-[#fafafa] hover:text-[#111827]"
                }`
              }
            >
              <LayoutDashboard size={isOpen ? 17 : 20} className="flex-shrink-0" />
              {isOpen && <span className="whitespace-nowrap overflow-hidden">{isStudent ? "My Dashboard" : "Dashboard"}</span>}
            </NavLink>

            {/* STUDENT ROLE NAV */}
            {isStudent ? (
              <>
                <NavLink
                  to={`/students/${user?.id || "2025-0014"}`}
                  title={!isOpen ? "My Academic Record" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[14px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2.5 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-[#fff7ed] text-[#ea580c] font-bold border-[#ea580c] shadow-sm"
                        : "text-[#4b5563] font-medium border-transparent hover:bg-[#fafafa] hover:text-[#111827]"
                    }`
                  }
                >
                  <BookOpen size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">My Academic Record</span>}
                </NavLink>

                <NavLink
                  to="/subjects"
                  title={!isOpen ? "Curriculum & Subjects" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[14px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2.5 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-[#fff7ed] text-[#ea580c] font-bold border-[#ea580c] shadow-sm"
                        : "text-[#4b5563] font-medium border-transparent hover:bg-[#fafafa] hover:text-[#111827]"
                    }`
                  }
                >
                  <BookMarked size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Curriculum & Subjects</span>}
                </NavLink>
              </>
            ) : (
              /* ADVISER / SECRETARY NAV */
              <>
                <div>
                  <button
                    onClick={() => {
                      if (!isOpen) setIsOpen(true);
                      setStudentsMenuOpen(!studentsMenuOpen);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl text-[14px] font-medium transition-all duration-150 ${
                      isOpen ? "px-3 py-2.5 gap-2.5 border-l-2 border-transparent text-[#4b5563] hover:bg-[#fafafa] hover:text-[#111827]" : "p-2.5 justify-center border-l-2 border-transparent mx-1 text-[#4b5563]"
                    }`}
                    title={!isOpen ? "STUDENT LIST" : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users size={isOpen ? 17 : 20} className="flex-shrink-0" />
                      {isOpen && <span className="whitespace-nowrap font-bold">STUDENT LIST</span>}
                    </div>
                    {isOpen && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${studentsMenuOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {/* Sub-menu Dropdown Items with PERFECT SYNCHRONIZED HIGHLIGHT */}
                  {isOpen && studentsMenuOpen && (
                    <div className="ml-5 pl-2 border-l-2 border-[#ffedd5] mt-1 flex flex-col gap-0.5">
                      
                      <NavLink
                        to="/students"
                        end
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors block ${
                            isSubItemActive("all")
                              ? "bg-[#fff7ed] text-[#ea580c] font-bold shadow-sm"
                              : "text-[#4b5563] hover:text-[#111827] hover:bg-[#fafafa]"
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
                              ? "bg-[#fff7ed] text-[#ea580c] font-bold shadow-sm"
                              : "text-[#4b5563] hover:text-[#111827] hover:bg-[#fafafa]"
                          }`
                        }
                      >
                        <span>1st Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isSubItemActive("1") ? "bg-[#ea580c] text-white" : "bg-[#ffedd5] text-[#c2410c]"
                        }`}>1st Yr</span>
                      </NavLink>

                      <NavLink
                        to="/students?year=2"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("2")
                              ? "bg-[#fff7ed] text-[#ea580c] font-bold shadow-sm"
                              : "text-[#4b5563] hover:text-[#111827] hover:bg-[#fafafa]"
                          }`
                        }
                      >
                        <span>2nd Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isSubItemActive("2") ? "bg-[#ea580c] text-white" : "bg-[#ffedd5] text-[#c2410c]"
                        }`}>2nd Yr</span>
                      </NavLink>

                      <NavLink
                        to="/students?year=3"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("3")
                              ? "bg-[#fff7ed] text-[#ea580c] font-bold shadow-sm"
                              : "text-[#4b5563] hover:text-[#111827] hover:bg-[#fafafa]"
                          }`
                        }
                      >
                        <span>3rd Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isSubItemActive("3") ? "bg-[#ea580c] text-white" : "bg-[#ffedd5] text-[#c2410c]"
                        }`}>3rd Yr</span>
                      </NavLink>

                      <NavLink
                        to="/students?year=4"
                        className={() =>
                          `px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center justify-between transition-colors ${
                            isSubItemActive("4")
                              ? "bg-[#fff7ed] text-[#ea580c] font-bold shadow-sm"
                              : "text-[#4b5563] hover:text-[#111827] hover:bg-[#fafafa]"
                          }`
                        }
                      >
                        <span>4th Year Students</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          isSubItemActive("4") ? "bg-[#ea580c] text-white" : "bg-[#ffedd5] text-[#c2410c]"
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
                    `flex items-center rounded-xl text-[14px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2.5 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-[#fff7ed] text-[#ea580c] font-bold border-[#ea580c] shadow-sm"
                        : "text-[#4b5563] font-medium border-transparent hover:bg-[#fafafa] hover:text-[#111827]"
                    }`
                  }
                >
                  <Layers size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Section Allocations</span>}
                </NavLink>

                {/* Curriculum & Subjects Link */}
                <NavLink
                  to="/subjects"
                  title={!isOpen ? "Curriculum & Subjects" : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-[14px] transition-all duration-150 ${
                      isOpen ? "px-3 py-2.5 gap-2.5 border-l-2" : "p-2.5 justify-center border-l-2 mx-1"
                    } ${
                      isActive
                        ? "bg-[#fff7ed] text-[#ea580c] font-bold border-[#ea580c] shadow-sm"
                        : "text-[#4b5563] font-medium border-transparent hover:bg-[#fafafa] hover:text-[#111827]"
                    }`
                  }
                >
                  <BookMarked size={isOpen ? 17 : 20} className="flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap overflow-hidden">Curriculum & Subjects</span>}
                </NavLink>
              </>
            )}

          </div>
        </nav>

        {/* Sidebar Bottom Footer: Separate User Profile & Prominent Log Out */}
        <div className="border-t border-[#e5e7eb] p-3 flex flex-col gap-2">
          
          {/* User Profile Card */}
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#fff7ed] cursor-pointer transition-colors group"
            title="Click to edit profile"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-sm">
              {user?.avatar || "US"}
            </div>
            {isOpen && (
              <div className="overflow-hidden whitespace-nowrap min-w-0">
                <p className="text-[13px] font-bold text-[#111827] group-hover:text-[#ea580c] transition-colors truncate">
                  {user?.name || "Guest User"}
                </p>
                <p className="text-[10px] font-bold text-[#ea580c] uppercase tracking-wider truncate">
                  {user?.role === "secretary" ? "Dept. Secretary" : user?.role === "adviser" ? "Academic Adviser" : "Student View"}
                </p>
              </div>
            )}
          </div>

          {/* Prominent & Safe Log Out Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-2 rounded-xl text-[13px] font-bold text-[#dc2626] bg-[#fef2f2] hover:bg-[#fee2e2] border border-[#fecaca] transition-all shadow-sm ${
              isOpen ? "px-3 py-2 justify-center" : "p-2 justify-center"
            }`}
            title="Log Out"
          >
            <LogOut size={16} className="flex-shrink-0 text-[#dc2626]" />
            {isOpen && <span>Sign Out / Log Out</span>}
          </button>

        </div>

      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar Header */}
        <header className="h-14 bg-white border-b border-[#e5e7eb] px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#6b7280]">
            <span>Saint Joseph College</span>
            <span className="text-[#d1d5db]">/</span>
            <span className="text-[#111827] font-bold">CCS Subject Monitoring System</span>
          </div>

          {/* TOP RIGHT CORNER SETTINGS BUTTON */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#fff7ed] to-[#ffedd5] hover:from-[#ffedd5] hover:to-[#fed7aa] border-2 border-[#fdba74] text-[#c2410c] px-3.5 py-1.5 rounded-full transition-all shadow-sm group"
            title="Profile & Settings"
          >
            <Settings size={15} className="text-[#ea580c] group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-[13px] font-bold text-[#c2410c]">
              Settings
            </span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto px-10 py-8 bg-[#fafafa]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border-2 border-[#e5e7eb] text-center">
            <div className="w-12 h-12 rounded-full bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-[17px] font-bold text-[#111827] mb-1">Confirm Log Out</h3>
            <p className="text-[13px] text-[#6b7280] mb-5">
              Are you sure you want to end your current session and sign out?
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-10 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#4b5563] font-bold text-[13px] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-[13px] rounded-xl transition-colors shadow-sm"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}