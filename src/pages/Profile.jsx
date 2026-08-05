import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Key, CheckCircle2, ShieldCheck, Mail, Save, Lock, GraduationCap } from "lucide-react";

export default function Profile() {
  const { user, updateUserProfile } = useAuth();

  // Profile Form State
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  return (
    <div className="w-full max-w-4xl pb-12">
      
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#1f2328] tracking-tight mb-1">Account & Profile Settings</h1>
        <p className="text-[14px] text-[#656d76]">
          Manage your personal details, contact information, and account security passwords
        </p>
      </div>

      {/* Main Profile Summary Card */}
      <div className="bg-white border-2 border-[#d0d7de] rounded-2xl p-6 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#dafbe1] border-2 border-[#a4e8b4] text-[#1a7f37] font-bold text-[22px] flex items-center justify-center flex-shrink-0 shadow-sm">
            {user?.avatar || "US"}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[20px] font-bold text-[#1f2328]">{user?.name}</h2>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-[#dafbe1] text-[#1a7f37] border border-[#a4e8b4] px-2.5 py-0.5 rounded-md">
                {user?.role === "secretary" ? "Department Secretary" : user?.role === "adviser" ? "Academic Adviser" : "Enrolled Student"}
              </span>
            </div>
            <p className="text-[13px] text-[#656d76]">
              {user?.email} &nbsp;·&nbsp; ID: <span className="font-mono font-bold text-[#1f2328]">{user?.id}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Details Card */}
        <div className="bg-white border-2 border-[#d0d7de] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e8ecf0]">
            <User size={18} className="text-[#1a7f37]" />
            <h3 className="text-[16px] font-bold text-[#1f2328]">Personal Information</h3>
          </div>

          {profileSuccess && (
            <div className="mb-4 p-3 bg-[#dafbe1] border border-[#a4e8b4] rounded-xl text-[#1a7f37] text-[13px] font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Profile details saved successfully!
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                Full Display Name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[14px] outline-none focus:border-[#1a7f37] font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[14px] outline-none focus:border-[#1a7f37] font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                System Assigned Role
              </label>
              <input
                disabled
                type="text"
                value={user?.role === "secretary" ? "Department Secretary (Admin)" : user?.role === "adviser" ? "Academic Adviser & Teacher" : "Enrolled Student (Read-only)"}
                className="w-full h-10 px-3.5 border-2 border-[#e8ecf0] bg-[#f6f8fa] text-[#656d76] rounded-xl text-[13px] font-semibold cursor-not-allowed"
              />
            </div>

            {user?.course && (
              <div>
                <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                  Academic Program
                </label>
                <input
                  disabled
                  type="text"
                  value={user.course}
                  className="w-full h-10 px-3.5 border-2 border-[#e8ecf0] bg-[#f6f8fa] text-[#656d76] rounded-xl text-[13px] font-semibold cursor-not-allowed"
                />
              </div>
            )}

            <button
              type="submit"
              className="mt-2 w-full h-10 bg-[#1a7f37] hover:bg-[#166d30] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Save size={15} /> Save Profile Changes
            </button>
          </form>
        </div>

        {/* Security & Password Management Card */}
        <div className="bg-white border-2 border-[#d0d7de] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e8ecf0]">
            <Key size={18} className="text-[#1a7f37]" />
            <h3 className="text-[16px] font-bold text-[#1f2328]">Security & Password</h3>
          </div>

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-[#dafbe1] border border-[#a4e8b4] rounded-xl text-[#1a7f37] text-[13px] font-bold flex items-center gap-2">
              <CheckCircle2 size={16} /> Account password updated successfully!
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 bg-[#ffebe9] border border-[#ffb8b0] rounded-xl text-[#cf222e] text-[13px] font-bold">
              ⚠️ {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                Current Password
              </label>
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[14px] outline-none focus:border-[#1a7f37] font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[14px] outline-none focus:border-[#1a7f37] font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#656d76] uppercase tracking-wide mb-1.5">
                Confirm New Password
              </label>
              <input
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 px-3.5 border-2 border-[#d0d7de] rounded-xl text-[14px] outline-none focus:border-[#1a7f37] font-medium"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full h-10 bg-[#1f2328] hover:bg-[#000000] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Lock size={15} /> Update Password
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
