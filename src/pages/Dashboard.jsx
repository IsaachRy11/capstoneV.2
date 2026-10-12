import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import {
  AlertTriangle,
  Users,
  ArrowRight,
  Layers,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { students, sections } = useData();

  const isStudent = user?.role === "student";

  // Shared Stats (used by secretary view)
  const totalStudents = students.length;
  const regularStudents = students.filter((s) => s.status === "Regular").length;
  const irregularStudents = students.filter((s) => s.status === "Irregular").length;
  const flaggedStudents = students.filter((s) => (s.concerns || []).length > 0);

  // Active student object if logged in as student
  const studentProfile = (students && students.length > 0)
    ? (students.find((s) => s.id === user?.id) || students[0])
    : { id: "2025-0014", name: "Andrea Tan", course: "BS Information Technology", section: "BSIT 2-A", status: "Regular", yr: 2 };

  return (
    <div className="w-full pb-12">

      {/* Dashboard Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2328] tracking-tight mb-1">
            {isStudent ? "Student Academic Portal" : "Department Secretary Dashboard"}
          </h1>
          <p className="text-[14px] text-[#656d76]">
            College of Computer Studies · Saint Joseph College · SY 2026–2027
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
              {user?.role === "secretary" ? "Dept Secretary" : "Student View"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── STUDENT DASHBOARD ─── */}
      {isStudent && (() => {
        const yearLabels = ["", "1st Year", "2nd Year", "3rd Year", "4th Year"];
        const yearLabel = yearLabels[studentProfile.yr] || `Year ${studentProfile.yr}`;

        // Collect all history subjects across all semesters to detect deficiencies (Failed, Dropped, Incomplete)
        const allHistorySubjects = (studentProfile.semesters || []).flatMap((sem) =>
          (sem.subjects || []).map((sub) => ({
            ...sub,
            semesterLabel: sem.label,
            schoolYear: sem.school_year,
          }))
        );

        const deficiencies = allHistorySubjects.filter((sub) => {
          const st = (sub.status || "").toLowerCase();
          const fg = Number(sub.final_grade);
          return st === "failed" || fg === 5.0 || st === "dropped" || st === "incomplete" || st === "inc";
        });

        return (
          <div className="flex flex-col gap-5">

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#fff7ed] to-[#fef3c7] border-2 border-[#fed7aa] rounded-2xl px-6 py-5">
              <p className="text-[12px] font-bold text-[#ea580c] uppercase tracking-widest mb-1">Welcome back</p>
              <h2 className="text-[22px] font-bold text-[#1f2328] mb-1">{studentProfile.name}</h2>
              <p className="text-[13px] text-[#656d76]">
                {studentProfile.course} · {yearLabel} · {studentProfile.section}
              </p>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border-2 border-[#e5e7eb] rounded-xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">Program</p>
                <p className="text-[14px] font-bold text-[#1f2328] leading-snug">{studentProfile.course}</p>
              </div>
              <div className="bg-white border-2 border-[#e5e7eb] rounded-xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">Section</p>
                <p className="text-[14px] font-bold text-[#1f2328]">{studentProfile.section}</p>
              </div>
              <div className="bg-white border-2 border-[#e5e7eb] rounded-xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">Academic Standing</p>
                <span className={`inline-block text-[13px] font-bold px-2.5 py-0.5 rounded-lg border ${
                  studentProfile.status === "Regular"
                    ? "bg-[#dafbe1] text-[#1a7f37] border-[#a4e8b4]"
                    : "bg-[#fff3cd] text-[#92400e] border-[#fcd34d]"
                }`}>
                  {studentProfile.status}
                </span>
              </div>
            </div>

            {/* Academic Deficiencies & Alerts Section */}
            {deficiencies.length > 0 ? (
              <div className="bg-white border-2 border-[#fecaca] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 bg-[#fef2f2] border-b border-[#fee2e2] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center font-bold">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#991b1b]">
                        Academic Alerts &amp; Deficiencies
                      </h3>
                      <p className="text-[12px] text-[#b91c1c] mt-0.5">
                        {deficiencies.length} subject{deficiencies.length !== 1 ? "s" : ""} requiring retake or grade resolution
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5] rounded-full">
                    Action Required
                  </span>
                </div>

                <div className="divide-y divide-[#f3f4f6]">
                  {deficiencies.map((sub, i) => {
                    const isFailed = (sub.status || "").toLowerCase() === "failed" || Number(sub.final_grade) === 5.0;
                    const isDropped = (sub.status || "").toLowerCase() === "dropped";

                    return (
                      <div
                        key={i}
                        onClick={() => navigate(`/students/${studentProfile.id}`)}
                        className="px-5 py-3.5 flex items-center justify-between hover:bg-[#fff7ed] cursor-pointer transition-colors group"
                        title="Click to view details in Academic Record"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-mono font-bold text-[#ea580c]">{sub.code}</span>
                            <span className="text-[13px] font-bold text-[#111827] truncate group-hover:text-[#ea580c] transition-colors">{sub.title}</span>
                          </div>
                          <p className="text-[11px] text-[#6b7280] mt-0.5">
                            {sub.semesterLabel || "Past Term"} {sub.schoolYear ? `· SY ${sub.schoolYear}` : ""} · {sub.units} units
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                            isFailed
                              ? "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"
                              : isDropped
                              ? "bg-[#f4f4f5] text-[#71717a] border-[#e4e4e7]"
                              : "bg-[#fffbeb] text-[#d97706] border-[#fde68a]"
                          }`}>
                            {isFailed ? "Failed (5.00)" : isDropped ? "Dropped" : "Incomplete (INC)"}
                          </span>
                          <ChevronRight size={16} className="text-[#9ca3af] group-hover:text-[#ea580c] transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate(`/students/${studentProfile.id}`)}
                className="bg-white border-2 border-[#bbf7d0] hover:border-[#16a34a] rounded-2xl p-5 shadow-sm cursor-pointer transition-all hover:bg-[#f0fdf4]/50 group"
                title="Click to view full Academic Record"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center font-bold flex-shrink-0">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#166534] group-hover:text-[#15803d] transition-colors">
                        No Back Subjects or Deficiencies
                      </h3>
                      <p className="text-[12px] text-[#4b5563] mt-0.5">
                        All taken courses are in good standing with zero failed, dropped, or incomplete subjects.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-bold text-[#16a34a] group-hover:translate-x-1 transition-all flex-shrink-0">
                    <span>View Record</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            )}

            {/* View Full Record CTA */}
            <button
              onClick={() => navigate(`/students/${studentProfile.id}`)}
              className="w-full flex items-center justify-between bg-white hover:bg-[#fff7ed] border-2 border-[#e5e7eb] hover:border-[#ea580c] rounded-xl px-5 py-4 transition-all group shadow-sm"
            >
              <div className="text-left">
                <p className="text-[14px] font-bold text-[#1f2328] group-hover:text-[#ea580c] transition-colors">
                  View Academic Record
                </p>
                <p className="text-[12px] text-[#9ca3af] mt-0.5">
                  See all subjects, grades, and completed courses
                </p>
              </div>
              <ArrowRight size={18} className="text-[#9ca3af] group-hover:text-[#ea580c] transition-colors flex-shrink-0" />
            </button>

          </div>
        );
      })()}

      {/* ─── SECRETARY DASHBOARD ─── */}
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
              <p className="text-[12px] text-[#656d76]">Require review or grade resolution</p>
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

          {/* Flagged Students List */}
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
                      <p className="text-[12px] text-[#cf222e] font-semibold flex items-center gap-1.5">
                        <AlertTriangle size={13} className="flex-shrink-0" />
                        <span>{s.concerns[0] || "Academic concern noted"}</span>
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
