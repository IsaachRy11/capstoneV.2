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
    <div className="w-full pb-12 font-sans selection:bg-orange-100 selection:text-orange-900">

      {/* Dashboard Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
            {isStudent ? "Student Academic Portal" : "Department Secretary Dashboard"}
          </h1>
          <p className="text-[13.5px] text-slate-500 font-normal">
            College of Computer Studies · Saint Joseph College · SY 2026–2027
          </p>
        </div>

        {/* User Active Persona Badge */}
        <div className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-xl px-3.5 py-1.5 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[12px] shadow-xs">
            {user?.avatar || "US"}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
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
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white rounded-xl px-6 py-5 shadow-sm shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-100 mb-1">Welcome back</p>
                <h2 className="text-[22px] font-bold tracking-tight mb-1">{studentProfile.name}</h2>
                <p className="text-[13px] text-orange-100/90 font-medium">
                  {studentProfile.course} · {yearLabel} · Section {studentProfile.section}
                </p>
              </div>
            </div>

            {/* Quick Info Cards - Refined Proportional Corners */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Program</p>
                <p className="text-[14px] font-semibold text-slate-800 leading-snug">{studentProfile.course}</p>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Section</p>
                <p className="text-[14px] font-semibold text-slate-800">{studentProfile.section}</p>
              </div>
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Academic Standing</p>
                <span className={studentProfile.status === "Regular" ? "badge-regular" : "badge-irregular"}>
                  {studentProfile.status}
                </span>
              </div>
            </div>

            {/* Academic Deficiencies & Alerts Section */}
            {deficiencies.length > 0 ? (
              <div className="bg-white border border-rose-200/90 rounded-xl overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold text-rose-900">
                        Academic Alerts &amp; Deficiencies
                      </h3>
                      <p className="text-[12px] text-rose-600/90 mt-0.5">
                        {deficiencies.length} subject{deficiencies.length !== 1 ? "s" : ""} requiring retake or grade resolution
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-full">
                    Action Required
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {deficiencies.map((sub, i) => {
                    const isFailed = (sub.status || "").toLowerCase() === "failed" || Number(sub.final_grade) === 5.0;
                    const isDropped = (sub.status || "").toLowerCase() === "dropped";

                    return (
                      <div
                        key={i}
                        onClick={() => navigate(`/students/${studentProfile.id}`)}
                        className="px-5 py-3.5 flex items-center justify-between hover:bg-orange-50/40 cursor-pointer transition-colors group"
                        title="Click to view details in Academic Record"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-mono font-semibold text-orange-600">{sub.code}</span>
                            <span className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-orange-600 transition-colors">{sub.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {sub.semesterLabel || "Past Term"} {sub.schoolYear ? `· SY ${sub.schoolYear}` : ""} · {sub.units} units
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            isFailed
                              ? "bg-rose-50 text-rose-700 border-rose-200/80"
                              : isDropped
                              ? "bg-slate-100 text-slate-600 border-slate-200/80"
                              : "bg-amber-50 text-amber-700 border-amber-200/80"
                          }`}>
                            {isFailed ? "Failed (5.00)" : isDropped ? "Dropped" : "Incomplete (INC)"}
                          </span>
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-orange-600 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                onClick={() => navigate(`/students/${studentProfile.id}`)}
                className="bg-white border border-emerald-200/80 hover:border-emerald-400 rounded-xl p-5 shadow-xs cursor-pointer transition-all hover:bg-emerald-50/20 group"
                title="Click to view full Academic Record"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold text-emerald-900 group-hover:text-emerald-800 transition-colors">
                        No Back Subjects or Deficiencies
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        All taken courses are in good standing with zero failed, dropped, or incomplete subjects.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 group-hover:translate-x-1 transition-all flex-shrink-0">
                    <span>View Record</span>
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            )}

            {/* View Full Record CTA */}
            <button
              onClick={() => navigate(`/students/${studentProfile.id}`)}
              className="w-full flex items-center justify-between bg-white hover:bg-orange-50/40 border border-slate-200/90 hover:border-orange-300 rounded-xl px-5 py-3.5 transition-all group shadow-xs active:scale-[0.99]"
            >
              <div className="text-left">
                <p className="text-[13.5px] font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                  View Academic Record
                </p>
                <p className="text-[11.5px] text-slate-400 mt-0.5">
                  See all subjects, grades, and completed courses
                </p>
              </div>
              <ArrowRight size={17} className="text-slate-400 group-hover:text-orange-600 transition-colors flex-shrink-0" />
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
              className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-xl p-5 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">Enrolled CCS Students</p>
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-orange-50 flex items-center justify-center text-slate-600 group-hover:text-orange-600 transition-colors">
                  <Users size={17} />
                </div>
              </div>
              <p className="text-[32px] font-bold font-mono tracking-tight text-slate-900">{totalStudents}</p>
              <p className="text-[12px] text-slate-500 mt-1">
                {regularStudents} Regular · {irregularStudents} Irregular & Special
              </p>
            </div>

            <div
              onClick={() => navigate("/students?filter=concerns")}
              className="bg-white border border-rose-200/80 hover:border-rose-300 rounded-xl p-5 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-rose-600">Students with Concerns</p>
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertTriangle size={17} />
                </div>
              </div>
              <p className="text-[32px] font-bold font-mono tracking-tight text-rose-600">{flaggedStudents.length}</p>
              <p className="text-[12px] text-slate-500 mt-1">Require review or grade resolution</p>
            </div>

            <div
              onClick={() => navigate("/sections")}
              className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-xl p-5 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">Section Allocations</p>
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Layers size={17} />
                </div>
              </div>
              <p className="text-[32px] font-bold font-mono tracking-tight text-slate-900">{sections.length}</p>
              <p className="text-[12px] text-slate-500 mt-1">SJC RGDPD Portal structure & capacities</p>
            </div>
          </div>

          {/* Flagged Students List */}
          <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-50/70 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="text-[14.5px] font-bold text-slate-800">
                  Students Flagged for Immediate Academic Concern ({flaggedStudents.length})
                </h3>
              </div>
              <button
                onClick={() => navigate("/students?filter=concerns")}
                className="text-[12.5px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
              >
                View Complete List <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {flaggedStudents.length === 0 ? (
                <div className="p-6 text-center text-[13px] text-slate-400">
                  No students currently flagged for academic concerns.
                </div>
              ) : (
                flaggedStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/students/${s.id}`)}
                    className="p-4 hover:bg-slate-50/80 flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-[14px] font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                          {s.name}
                        </span>
                        <span className="text-[11.5px] font-mono text-slate-400">{s.id}</span>
                        <span className="text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70 px-2 py-0.5 rounded-full">
                          {s.course} ({s.yr}yr)
                        </span>
                      </div>
                      <p className="text-[11.5px] text-rose-600 font-medium flex items-center gap-1.5">
                        <AlertTriangle size={12} className="flex-shrink-0" />
                        <span>{s.concerns[0] || "Academic concern noted"}</span>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-600 transition-colors" />
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
