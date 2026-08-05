import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import {
  AlertTriangle,
  Users,
  CheckCircle2,
  ArrowRight,
  Layers,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Clock,
  ChevronRight
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { students, sections } = useData();

  const isStudent = user?.role === "student";
  const isAdviser = user?.role === "adviser";
  const isSecretary = user?.role === "secretary";

  // Shared Stats
  const totalStudents = students.length;
  const regularStudents = students.filter((s) => s.status === "Regular").length;
  const irregularStudents = students.filter((s) => s.status === "Irregular").length;
  const flaggedStudents = students.filter((s) => (s.concerns || []).length > 0);
  const topPerformers = students.filter((s) => Number(s.gwa) > 0 && Number(s.gwa) <= 1.75);

  // Active student object if logged in as student
  const studentProfile = (students && students.length > 0)
    ? (students.find((s) => s.id === user?.id) || students[0])
    : { id: "2025-0014", name: "Andrea Tan", course: "BS Information Technology", section: "BSIT 2-A", gwa: 1.50, status: "Regular" };


  return (
    <div className="w-full pb-12">
      
      {/* Dashboard Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2328] tracking-tight mb-1">
            {isStudent ? "Student Academic Portal" : isAdviser ? "Adviser Academic Dashboard" : "Department Secretary Dashboard"}
          </h1>
          <p className="text-[14px] text-[#656d76]">
            College of Computer Studies · Saint Joseph College · AY 2026–2027
          </p>
        </div>

        {/* User Active Persona Badge */}
        <div className="flex items-center gap-3 bg-white border-2 border-[#d0d7de] rounded-xl px-4 py-2 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[#dafbe1] text-[#1a7f37] flex items-center justify-center font-bold text-[12px]">
            {user?.avatar || "US"}
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#1f2328] leading-tight">{user?.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#1a7f37]">
              {user?.role === "secretary" ? "Dept Secretary" : user?.role === "adviser" ? "Academic Adviser" : "Student View"}
            </p>
          </div>
        </div>
      </div>

      {/* STUDENT ROLE DASHBOARD VIEW */}
      {isStudent && (
        <div className="flex flex-col gap-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-5 shadow-sm">
              <p className="text-[12px] font-bold text-[#656d76] uppercase tracking-wide mb-1">Cumulative GWA</p>
              <p className="text-[36px] font-bold font-mono text-[#1a7f37]">
                {studentProfile.gwa ? Number(studentProfile.gwa).toFixed(2) : "1.50"}
              </p>
              <p className="text-[12px] text-[#656d76]">Automatically calculated term GWA</p>
            </div>

            <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-5 shadow-sm">
              <p className="text-[12px] font-bold text-[#656d76] uppercase tracking-wide mb-1">Enrolled Section</p>
              <p className="text-[28px] font-bold text-[#1f2328]">
                {studentProfile.section || "BSIT 2-A"}
              </p>
              <p className="text-[12px] text-[#656d76]">{studentProfile.course}</p>
            </div>

            <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-5 shadow-sm">
              <p className="text-[12px] font-bold text-[#656d76] uppercase tracking-wide mb-1">Academic Status</p>
              <span className="inline-block px-3 py-1 bg-[#dafbe1] text-[#1a7f37] border border-[#a4e8b4] rounded-lg font-bold text-[14px]">
                {studentProfile.status}
              </span>
              <p className="text-[12px] text-[#656d76] mt-2">Standing: Good Academic Standing</p>
            </div>
          </div>

          {/* Quick Nav Button */}
          <div className="bg-[#dafbe1] border-2 border-[#a4e8b4] rounded-xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-[#1a7f37]">View Full Academic History & Remaining Subjects</h3>
              <p className="text-[13px] text-[#1f2328]">
                Inspect your completed courses, prerequisites, auto-computed term GWAs, and outstanding required subjects.
              </p>
            </div>
            <button
              onClick={() => navigate(`/students/${studentProfile.id}`)}
              className="bg-[#1a7f37] hover:bg-[#166d30] text-white font-bold text-[13px] px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              Open My Profile Record
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      )}

      {/* ADVISER & SECRETARY ROLE DASHBOARD VIEW */}
      {!isStudent && (
        <div className="flex flex-col gap-6">
          
          {/* Stat Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => navigate("/students")}
              className="bg-white border-2 border-[#d0d7de] hover:border-[#1a7f37] rounded-xl p-5 shadow-sm cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#656d76]">Enrolled CCS Students</p>
                <div className="w-8 h-8 rounded-lg bg-[#f6f8fa] flex items-center justify-center text-[#656d76]">
                  <Users size={18} />
                </div>
              </div>
              <p className="text-[34px] font-bold font-mono text-[#1f2328]">{totalStudents}</p>
              <p className="text-[12px] text-[#656d76]">
                {regularStudents} Regular · {irregularStudents} Irregular & Special Statuses
              </p>
            </div>

            <div
              onClick={() => navigate("/students?filter=concerns")}
              className="bg-white border-2 border-[#d0d7de] hover:border-[#cf222e] rounded-xl p-5 shadow-sm cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#656d76]">Students with Concerns</p>
                <div className="w-8 h-8 rounded-lg bg-[#ffebe9] flex items-center justify-center text-[#cf222e]">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <p className="text-[34px] font-bold font-mono text-[#cf222e]">{flaggedStudents.length}</p>
              <p className="text-[12px] text-[#656d76]">Require adviser review or grade resolution</p>
            </div>

            <div
              onClick={() => navigate("/sections")}
              className="bg-white border-2 border-[#d0d7de] hover:border-[#1a7f37] rounded-xl p-5 shadow-sm cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#656d76]">Section Allocations</p>
                <div className="w-8 h-8 rounded-lg bg-[#dafbe1] flex items-center justify-center text-[#1a7f37]">
                  <Layers size={18} />
                </div>
              </div>
              <p className="text-[34px] font-bold font-mono text-[#1a7f37]">{sections.length}</p>
              <p className="text-[12px] text-[#656d76]">SJC RGDPD Portal structure & capacities</p>
            </div>
          </div>

          {/* Flagged Students List Table */}
          <div className="bg-white border-2 border-[#d0d7de] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#fffbeb] px-5 py-4 border-b border-[#d0d7de] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-[#cf222e]" />
                <h3 className="text-[16px] font-bold text-[#1f2328]">
                  Students Flagged for Immediate Academic Concern ({flaggedStudents.length})
                </h3>
              </div>
              <button
                onClick={() => navigate("/students?filter=concerns")}
                className="text-[13px] font-bold text-[#1a7f37] hover:underline flex items-center gap-1"
              >
                View Complete List <ArrowRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-[#e8ecf0]">
              {flaggedStudents.length === 0 ? (
                <div className="p-6 text-center text-[14px] text-[#656d76]">
                  No students currently flagged for academic concerns.
                </div>
              ) : (
                flaggedStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/students/${s.id}`)}
                    className="p-4 hover:bg-[#f6f8fa] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[15px] font-bold text-[#1f2328] group-hover:text-[#1a7f37] transition-colors">
                          {s.name}
                        </span>
                        <span className="text-[12px] font-mono text-[#656d76]">{s.id}</span>
                        <span className="text-[11px] font-bold bg-[#f6f8fa] border border-[#d0d7de] px-2 py-0.5 rounded">
                          {s.course} ({s.yr}yr)
                        </span>
                      </div>
                      <p className="text-[12px] text-[#cf222e] font-semibold">
                        ⚠️ {s.concerns[0] || "Academic concern noted"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-[#9198a1] group-hover:text-[#1a7f37]" />
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
