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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2328]/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-2 border-[#d0d7de]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dafbe1] border border-[#a4e8b4] text-[#1a7f37] font-bold text-[14px] flex items-center justify-center">
              {user?.avatar || "US"}
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#1f2328] leading-tight">{user?.name}</h3>
              <p className="text-[11px] text-[#656d76] uppercase tracking-wider font-semibold">
                {user?.role === "secretary" ? "Dept. Secretary" : user?.role === "adviser" ? "Academic Adviser" : "Student View"} · ID: {user?.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#656d76] hover:text-[#1f2328] hover:bg-[#e8ecf0] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tab Controls */}
        <div className="flex border-b border-[#e8ecf0] bg-white px-6">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3 px-4 text-[13px] font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "info"
                ? "border-[#1a7f37] text-[#1a7f37]"
                : "border-transparent text-[#656d76] hover:text-[#1f2328]"
            }`}
          >
            <User size={15} /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`py-3 px-4 text-[13px] font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "password"
                ? "border-[#1a7f37] text-[#1a7f37]"
                : "border-transparent text-[#656d76] hover:text-[#1f2328]"
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
                <div className="p-3 bg-[#dafbe1] border border-[#a4e8b4] rounded-xl text-[#1a7f37] text-[12px] font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Profile changes updated successfully!
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1">
                  Full Display Name
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[13px] outline-none focus:border-[#1a7f37] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[13px] outline-none focus:border-[#1a7f37] font-medium"
                />
              </div>

              {user?.course && (
                <div>
                  <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1">
                    Enrolled Program
                  </label>
                  <input
                    disabled
                    type="text"
                    value={user.course}
                    className="w-full h-10 px-3.5 border-2 border-[#e8ecf0] bg-[#f6f8fa] text-[#656d76] rounded-xl text-[13px] font-semibold cursor-not-allowed"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-[#e8ecf0] mt-2">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 text-[#cf222e] text-[12px] font-bold hover:underline"
                >
                  <LogOut size={14} /> Log Out
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a7f37] hover:bg-[#166d30] text-white text-[13px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={14} /> Save Details
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              {passwordSuccess && (
                <div className="p-3 bg-[#dafbe1] border border-[#a4e8b4] rounded-xl text-[#1a7f37] text-[12px] font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Password updated successfully!
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-[#ffebe9] border border-[#ffb8b0] rounded-xl text-[#cf222e] text-[12px] font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1">
                  Current Password
                </label>
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[13px] outline-none focus:border-[#1a7f37] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1">
                  New Password
                </label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[13px] outline-none focus:border-[#1a7f37] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1">
                  Confirm New Password
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[13px] outline-none focus:border-[#1a7f37] font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end border-t border-[#e8ecf0] mt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1a7f37] hover:bg-[#166d30] text-white text-[13px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
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
