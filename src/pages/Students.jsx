import { useEffect, useState, useMemo } from "react";
import { Search, AlertTriangle, CheckCircle2, ArrowRight, X, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

const STATUS_BADGES = {
  Regular: "bg-[#fff7ed] text-[#c2410c] border-[#ffedd5]",
  Irregular: "bg-[#fef3c7] text-[#b45309] border-[#fde68a]",
  Transferee: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  Returnee: "bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]",
  Shiftee: "bg-[#fff7ed] text-[#ea580c] border-[#ffedd5]",
  Inactive: "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]",
  Dropped: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  Graduating: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
  Graduated: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
};

function Avatar({ initials }) {
  const colors = [
    "bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white",
    "bg-gradient-to-br from-[#ea580c] to-[#c2410c] text-white",
    "bg-gradient-to-br from-[#fb923c] to-[#f97316] text-white",
    "bg-gradient-to-br from-[#d97706] to-[#b45309] text-white",
  ];
  const idx = initials ? (initials.charCodeAt(0) * 7 + (initials.charCodeAt(1) || 0)) % colors.length : 0;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 shadow-sm ${colors[idx]}`}>
      {initials}
    </div>
  );
}

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { students, updateStudent } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  // PRIVACY RULE: If a student tries to access student registry, redirect them to their own record!
  if (user?.role === "student") {
    return <Navigate to={`/students/${user.id || "2025-0014"}`} replace />;
  }

  const initYear = searchParams.get("year") || "all";
  const initCourse = searchParams.get("course") || "all";
  const initAlert = searchParams.get("filter") === "concerns" ? "yes" : (searchParams.get("filter") === "top" ? "top" : "all");

  const [q, setQ] = useState("");
  const [activeYearTab, setActiveYearTab] = useState(initYear);
  const [courseFilter, setCourseFilter] = useState(initCourse);
  const [statusFilter, setStatusFilter] = useState("all");
  const [academicStanding, setAcademicStanding] = useState(initAlert);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    id: "",
    name: "",
    course: "BS Information Technology",
    section: "BSIT 1-A",
    yr: 1,
    status: "Regular",
    avatar: ""
  });

  const isSecretary = user?.role === "secretary";

  useEffect(() => {
    const yrParam = searchParams.get("year");
    if (yrParam) {
      setActiveYearTab(yrParam);
    } else {
      setActiveYearTab("all");
    }
  }, [searchParams]);

  // Base filtering without year selection (for accurate tab counts)
  const filteredBase = useMemo(() => {
    return students.filter((s) => {
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.id.toLowerCase().includes(q.toLowerCase()) ||
        s.course.toLowerCase().includes(q.toLowerCase()) ||
        (s.section && s.section.toLowerCase().includes(q.toLowerCase()));

      const matchCourse = courseFilter === "all" || s.course.includes(courseFilter);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      
      const hasConcerns = (s.concerns || []).length > 0;
      const matchStanding =
        academicStanding === "all" ||
        (academicStanding === "yes" && hasConcerns) ||
        (academicStanding === "no" && !hasConcerns) ||
        (academicStanding === "top" && Number(s.gwa) <= 1.75);

      return matchQ && matchCourse && matchStatus && matchStanding;
    });
  }, [students, q, courseFilter, statusFilter, academicStanding]);

  // Categorize base students by Year Level (for tab counts)
  const groupedByYear = useMemo(() => {
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    filteredBase.forEach((s) => {
      const y = s.yr || 1;
      if (!groups[y]) groups[y] = [];
      groups[y].push(s);
    });
    return groups;
  }, [filteredBase]);

  // Final filtered list including active year tab selection
  const filtered = useMemo(() => {
    return filteredBase.filter((s) => {
      return activeYearTab === "all" || String(s.yr) === String(activeYearTab);
    });
  }, [filteredBase, activeYearTab]);

  const clearAllFilters = () => {
    setQ("");
    setActiveYearTab("all");
    setCourseFilter("all");
    setStatusFilter("all");
    setAcademicStanding("all");
    setSearchParams({});
  };

  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!newStudent.id || !newStudent.name) return;

    const initials = newStudent.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    const created = {
      ...newStudent,
      yr: Number(newStudent.yr),
      status: "Regular", // Status is determined automatically later based on subject grades
      avatar: initials,
      gwa: 0,
      concerns: [],
      semesters: []
    };

    updateStudent(created);
    setShowAddModal(false);
    setNewStudent({
      id: "",
      name: "",
      course: "BS Information Technology",
      section: "BSIT 1-A",
      yr: 1,
      status: "Regular",
      avatar: ""
    });
  };

  return (
    <div className="w-full pb-12 font-sans">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight mb-1">Students Registry</h1>
          <p className="text-[14px] text-[#6b7280]">
            Categorized by Year Level · Showing {filtered.length} of {students.length} Total Enrolled Records
          </p>
        </div>

        {isSecretary && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <UserPlus size={16} />
            Add New Student Record
          </button>
        )}
      </div>

      {/* Filter & Search Bar Panel */}
      <div className="bg-white border-2 border-[#e5e7eb] rounded-2xl p-4 mb-6 shadow-sm">
        <p className="text-[11px] font-bold text-[#ea580c] uppercase tracking-wider mb-3">
          Filter & Quick Lookup
        </p>

        <div className="flex gap-3 flex-wrap items-center">
          
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student name, ID, section, or course..."
              className="w-full h-10 pl-9 pr-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl bg-white text-[#111827] outline-none focus:border-[#ea580c] font-medium transition-colors"
            />
          </div>

          {/* Program Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl bg-white outline-none focus:border-[#ea580c] font-semibold text-[#111827] cursor-pointer"
          >
            <option value="all">All Programs (BSIT, BSCS, ACT)</option>
            <option value="Information Technology">BS Information Technology</option>
            <option value="Computer Science">BS Computer Science</option>
            <option value="Associate in Computer Technology">Associate in Computer Tech (ACT)</option>
          </select>

          {/* Student Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl bg-white outline-none focus:border-[#ea580c] font-semibold text-[#111827] cursor-pointer"
          >
            <option value="all">All Student Statuses</option>
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
            <option value="Transferee">Transferee</option>
            <option value="Returnee">Returnee</option>
            <option value="Shiftee">Shiftee</option>
            <option value="Inactive">Inactive</option>
            <option value="Dropped">Dropped</option>
            <option value="Graduating">Graduating</option>
            <option value="Graduated">Graduated</option>
          </select>

          {/* Academic Standing */}
          <select
            value={academicStanding}
            onChange={(e) => setAcademicStanding(e.target.value)}
            className="h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl bg-white outline-none focus:border-[#ea580c] font-semibold text-[#111827] cursor-pointer"
          >
            <option value="all">All Academic Standings</option>
            <option value="yes">With Academic Concern</option>
            <option value="no">No Concerns</option>
            <option value="top">Top Performers (GWA ≤ 1.75)</option>
          </select>

          {(q || courseFilter !== "all" || statusFilter !== "all" || academicStanding !== "all" || activeYearTab !== "all") && (
            <button
              onClick={clearAllFilters}
              className="h-10 px-3.5 flex items-center gap-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-[13px] font-bold rounded-xl transition-colors flex-shrink-0"
            >
              <X size={14} /> Clear Filters
            </button>
          )}

        </div>
      </div>

      {/* CCS Orange Year-Level Categorization Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b-2 border-[#e5e7eb] pb-3 overflow-x-auto">
        <span className="text-[12px] font-bold text-[#ea580c] uppercase tracking-wide mr-2 flex-shrink-0">
          Select Year Level:
        </span>
        {[
          { key: "all", label: "All Year Levels", count: filteredBase.length },
          { key: "1", label: "1st Year", count: groupedByYear[1]?.length || 0 },
          { key: "2", label: "2nd Year", count: groupedByYear[2]?.length || 0 },
          { key: "3", label: "3rd Year", count: groupedByYear[3]?.length || 0 },
          { key: "4", label: "4th Year", count: groupedByYear[4]?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveYearTab(tab.key);
              if (tab.key === "all") {
                setSearchParams({});
              } else {
                setSearchParams({ year: tab.key });
              }
            }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
              activeYearTab === String(tab.key)
                ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-md"
                : "bg-white border-2 border-[#e5e7eb] text-[#4b5563] hover:border-[#ea580c] hover:text-[#111827]"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeYearTab === String(tab.key) ? "bg-white/20 text-white" : "bg-[#f3f4f6] text-[#4b5563]"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Render Tables Categorized by Year Level */}
      {[1, 2, 3, 4].map((yearNum) => {
        const yearStudents = groupedByYear[yearNum] || [];
        if (activeYearTab !== "all" && String(activeYearTab) !== String(yearNum)) return null;
        if (activeYearTab === "all" && yearStudents.length === 0) return null;

        const yearLabel = ["1st Year", "2nd Year", "3rd Year", "4th Year"][yearNum - 1];

        return (
          <div key={yearNum} className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ea580c]" />
                <h2 className="text-[17px] font-bold text-[#111827]">{yearLabel} Enrolled Students</h2>
                <span className="text-[12px] font-bold bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5] px-2.5 py-0.5 rounded-full font-mono">
                  {yearStudents.length} Students
                </span>
              </div>
            </div>

            <div className="bg-white border-2 border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] border-b-2 border-[#e5e7eb]">
                    {["Student Name", "Student ID", "Course & Section", "Status", "Academic Standing", "Action"].map((h, i) => (
                      <th key={i} className="px-5 py-3.5 text-[11px] font-bold text-[#6b7280] text-left uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-[#6b7280] text-[14px]">
                        No students found for {yearLabel} matching active filters.
                      </td>
                    </tr>
                  ) : (
                    yearStudents.map((s, idx) => {
                      const concernsCount = (s.concerns || []).length;
                      const badgeClass = STATUS_BADGES[s.status] || STATUS_BADGES.Regular;

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors hover:bg-[#fff7ed]/50 ${idx < yearStudents.length - 1 ? "border-b border-[#f3f4f6]" : ""}`}
                        >
                          {/* Student Name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar initials={s.avatar} />
                              <div>
                                <p className="text-[14px] font-bold text-[#111827]">{s.name}</p>
                              </div>
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="px-5 py-3.5 text-[13px] font-mono text-[#6b7280]">{s.id}</td>

                          {/* Course & Section */}
                          <td className="px-5 py-3.5 text-[13px] text-[#6b7280]">
                            <p className="font-semibold text-[#111827]">{s.course}</p>
                            <p className="text-[11px] text-[#9ca3af]">{s.section || "Unassigned Section"}</p>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-3.5">
                            <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg border ${badgeClass}`}>
                              {s.status}
                            </span>
                          </td>

                          {/* Academic Standing */}
                          <td className="px-5 py-3.5">
                            {concernsCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] px-2.5 py-1 rounded-lg">
                                <AlertTriangle size={13} />
                                {concernsCount} Concern{concernsCount > 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-lg">
                                <CheckCircle2 size={13} />
                                No Concerns
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => navigate(`/students/${s.id}`)}
                              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white text-[12px] font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm whitespace-nowrap"
                            >
                              View Record
                              <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Add Student Modal (Secretary Access) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border-2 border-[#e5e7eb]">
            <div className="flex justify-between items-center mb-4 border-b border-[#f3f4f6] pb-3">
              <h3 className="text-[17px] font-bold text-[#111827]">Add New Student Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#6b7280] hover:text-[#111827]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-wide mb-1">
                  Student ID Number
                </label>
                <input
                  required
                  type="text"
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                  placeholder="e.g. 2026-0099"
                  className="w-full h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-wide mb-1">
                  Full Student Name
                </label>
                <input
                  required
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. Maria Clara Santos"
                  className="w-full h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-wide mb-1">
                  Year Level
                </label>
                <select
                  value={newStudent.yr}
                  onChange={(e) => setNewStudent({ ...newStudent, yr: Number(e.target.value) })}
                  className="w-full h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl outline-none focus:border-[#ea580c]"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-wide mb-1">
                  Academic Program
                </label>
                <select
                  value={newStudent.course}
                  onChange={(e) => setNewStudent({ ...newStudent, course: e.target.value })}
                  className="w-full h-10 px-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl outline-none focus:border-[#ea580c]"
                >
                  <option value="BS Information Technology">BS Information Technology</option>
                  <option value="BS Computer Science">BS Computer Science</option>
                  <option value="Associate in Computer Technology">Associate in Computer Technology</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-[#6b7280] hover:bg-[#fafafa] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[13px] font-bold text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] rounded-xl shadow-md"
                >
                  Create Student Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}