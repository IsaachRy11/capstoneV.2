import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { X, User, Key, CheckCircle2, Save, Lock, LogOut, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("info"); // 'info' | 'password'

  // Profile fields
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateUserProfile({ name, email });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const handleLogoutClick = () => {
    onClose();
    logout();
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 font-bold text-[13px] flex items-center justify-center shadow-xs">
              {user?.avatar || "US"}
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 leading-tight">{user?.name}</h3>
              <p className="text-[10.5px] text-slate-400 uppercase tracking-wider font-semibold">
                {user?.role === "secretary" ? "Dept. Secretary" : "Student View"} · ID: {user?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tab Controls */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3 px-4 text-[13px] font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "info"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User size={15} /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`py-3 px-4 text-[13px] font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "password"
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Key size={15} /> Security & Password
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeTab === "info" ? (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-700 text-[12px] font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Profile changes updated successfully!
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Display Name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9.5 px-3.5 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9.5 px-3.5 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-slate-800 transition-all"
                />
              </div>

              {user?.course && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Enrolled Program
                  </label>
                  <input
                    disabled
                    type="text"
                    value={user.course}
                    className="w-full h-9.5 px-3.5 border border-slate-200/60 bg-slate-50 text-slate-500 rounded-lg text-[13px] font-medium cursor-not-allowed"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 text-[12px] font-semibold transition-colors"
                >
                  <LogOut size={14} /> Sign Out
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <Save size={14} /> Save Details
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-700 text-[12px] font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Password updated successfully!
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-lg text-rose-700 text-[12px] font-semibold flex items-center gap-2">
                  <AlertCircle size={16} /> {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-9.5 px-3.5 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9.5 px-3.5 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-slate-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-9.5 px-3.5 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium text-slate-800 transition-all"
                />
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-100 mt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <Lock size={14} /> Update Password
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
