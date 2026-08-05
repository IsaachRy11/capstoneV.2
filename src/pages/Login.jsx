import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, ShieldCheck, UserCheck, BookOpen, ArrowRight } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { loginAs } = useAuth();
  const [selectedRole, setSelectedRole] = useState("secretary");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    loginAs(selectedRole);
    navigate("/");
  };

  const quickDemoLogin = (roleKey) => {
    loginAs(roleKey);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#ffedd5] rounded-full blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#fed7aa] rounded-full blur-3xl opacity-70 pointer-events-none" />

      <div className="w-full max-w-4xl bg-white border-2 border-[#e5e7eb] rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10">
        
        {/* Left Side: CCS Brand Orange Gradient Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#d97706] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Circuit / Tech Motif Backdrop Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          <div className="relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner border border-white/30">
              <GraduationCap size={28} color="white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">CCS Subject Monitor</h1>
            <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#ffedd5] mb-2">
              Saint Joseph College
            </p>
            <p className="text-[11px] font-bold text-white/90 tracking-wide uppercase bg-black/10 px-3 py-1 rounded-full inline-block border border-white/20 mb-6">
              CODE. INNOVATE. TRANSFORM.
            </p>

            <div className="border-t border-white/20 pt-6">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#ffedd5] mb-3">
                Select Persona / Access Role
              </p>
              
              <div className="flex flex-col gap-2.5">
                {[
                  { key: "student", label: "Student Role", sub: "Read-only personal academic record & GWA", icon: BookOpen },
                  { key: "adviser", label: "Academic Adviser / Teacher", sub: "Encode grades & advising reports", icon: UserCheck },
                  { key: "secretary", label: "Department Secretary", sub: "Full admin & section capacity controls", icon: ShieldCheck }
                ].map((item) => {
                  const Icon = item.icon;
                  const active = selectedRole === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedRole(item.key)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        active
                          ? "bg-white text-[#111827] border-white shadow-lg font-semibold"
                          : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${active ? "text-[#ea580c]" : "text-[#ffedd5]"}`} />
                      <div>
                        <p className="text-[13px] font-bold leading-snug">{item.label}</p>
                        <p className={`text-[11px] leading-tight mt-0.5 ${active ? "text-[#4b5563]" : "text-[#ffedd5]/80"}`}>
                          {item.sub}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 relative z-10">
            <p className="text-[11px] text-[#ffedd5] font-medium">
              System v2.4 · Auto-GWA Computation & Prerequisite Validation Enabled
            </p>
          </div>
        </div>

        {/* Right Side: Login Form & One-Click Demo Login */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#111827] tracking-tight">System Sign In</h2>
              <p className="text-[13px] text-[#6b7280] mt-1">
                Enter your credentials or choose a quick evaluator account below.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-wide mb-1.5">
                  Student / User ID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === "student" ? "e.g., 2025-0014" : selectedRole === "adviser" ? "e.g., ADV-101" : "e.g., SEC-001"}
                  className="w-full h-11 px-3.5 border-2 border-[#e5e7eb] rounded-xl text-[14px] outline-none focus:border-[#ea580c] font-medium transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 px-3.5 border-2 border-[#e5e7eb] rounded-xl text-[14px] outline-none focus:border-[#ea580c] font-medium transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white text-[14px] font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2"
              >
                Sign In as {selectedRole === "student" ? "Student" : selectedRole === "adviser" ? "Adviser" : "Secretary"}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f3f4f6]" /></div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-3 font-bold text-[#9ca3af]">Or Quick Access Demo</span>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => quickDemoLogin("student")}
                className="p-3 bg-[#fafafa] hover:bg-[#fff7ed] border-2 border-[#e5e7eb] hover:border-[#ea580c] rounded-2xl text-center transition-all group"
              >
                <p className="text-[12px] font-bold text-[#111827] group-hover:text-[#ea580c]">Student Demo</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5">Andrea Tan</p>
              </button>

              <button
                onClick={() => quickDemoLogin("adviser")}
                className="p-3 bg-[#fafafa] hover:bg-[#fff7ed] border-2 border-[#e5e7eb] hover:border-[#ea580c] rounded-2xl text-center transition-all group"
              >
                <p className="text-[12px] font-bold text-[#111827] group-hover:text-[#ea580c]">Adviser Demo</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5">Dr. A. Reyes</p>
              </button>

              <button
                onClick={() => quickDemoLogin("secretary")}
                className="p-3 bg-[#fafafa] hover:bg-[#fff7ed] border-2 border-[#e5e7eb] hover:border-[#ea580c] rounded-2xl text-center transition-all group"
              >
                <p className="text-[12px] font-bold text-[#111827] group-hover:text-[#ea580c]">Secretary Demo</p>
                <p className="text-[10px] text-[#6b7280] mt-0.5">Engr. M. Cruz</p>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#9ca3af] text-center mt-6">
            Authorized Personnel & Enrolled Students Only · Saint Joseph College CCS
          </p>
        </div>

      </div>
    </div>
  );
}
