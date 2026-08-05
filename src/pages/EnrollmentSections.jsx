import { useState, useMemo, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import {
  BookOpen,
  Users,
  Search,
  Laptop,
  Terminal,
  Wrench,
  Calendar,
  Filter,
  X,
  Plus,
  UserPlus,
  Trash2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  UserCheck,
  Building2,
  GraduationCap
} from "lucide-react";

export default function EnrollmentSections() {
  const { user } = useAuth();
  const { students, sections, curriculum, updateStudent } = useData();

  const [selectedProgram, setSelectedProgram] = useState("BSIT"); // 'BSIT' | 'BSCS' | 'ACT'
  const [activeYear, setActiveYear] = useState("all"); // 'all' | '1' | '2' | '3' | '4'
  const [activeSem, setActiveSem] = useState("all"); // 'all' | '1' | '2'
  const [searchQuery, setSearchQuery] = useState("");

  // Dedicated Course Detail View State (Full-page expansive view)
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null); // subject object
  const [rosterSectionFilter, setRosterSectionFilter] = useState("all");
  const [rosterSearch, setRosterSearch] = useState("");
  const [showEnrollPanel, setShowEnrollPanel] = useState(false);

  // Search input state (Instant text update for 0 input lag)
  const [enrollSearchInput, setEnrollSearchInput] = useState("");
  // Debounced search query state (150ms smooth transition to eliminate layout jitter)
  const [debouncedEnrollSearch, setDebouncedEnrollSearch] = useState("");

  const isSecretary = user?.role === "secretary" || user?.role === "adviser";

  // Debounce search query updates by 150ms for buttery-smooth typing without layout jumps
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEnrollSearch(enrollSearchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [enrollSearchInput]);

  // Build dynamic subject enrollment & section breakdown (Strictly computed from active 2nd Sem 2026-2027 student records)
  const filteredSubjectYearGroups = useMemo(() => {
    const progData = curriculum[selectedProgram] || curriculum["BSIT"];

    return progData.years.map((yGroup) => {
      // Year level filter
      if (activeYear !== "all" && String(yGroup.year) !== String(activeYear)) {
        return null;
      }

      const filteredSemesters = yGroup.semesters.map((semGroup) => {
        // Semester filter tab
        if (activeSem !== "all" && String(semGroup.sem) !== String(activeSem)) {
          return null;
        }

        const filteredSubjects = semGroup.subjects.map((sub) => {
          const subCodeClean = sub.code.replace(/\s+/g, "").toLowerCase();

          // STRICT CURRENT SEMESTER ENROLLMENT MATCHING:
          // Find students actively enrolled in this subject in the active 2nd semester
          const enrolledStudents = students.filter((s) =>
            (s.semesters || []).some((sem) => {
              const isCurrentTerm = sem.school_year === "2026-2027" && (sem.label === "2nd Semester" || sem.id?.includes("2026-2"));
              return (sem.subjects || []).some((subItem) => {
                const codeMatch = subItem.code && subItem.code.replace(/\s+/g, "").toLowerCase() === subCodeClean;
                if (!codeMatch) return false;
                if (isCurrentTerm) return subItem.status === "Enrolled";
                return subItem.status === "Enrolled";
              });
            })
          );

          // Sections taking this subject derived ONLY from active enrolled students in current term
          const sectionsList = [...new Set(enrolledStudents.map((s) => s.section).filter(Boolean))];
          const totalEnrolled = enrolledStudents.length;

          return {
            ...sub,
            yearLevel: yGroup.year,
            semNum: semGroup.sem,
            enrolledCount: totalEnrolled,
            sectionsList,
            enrolledStudents
          };
        }).filter((sub) => {
          // Search Query Filter
          const q = searchQuery.toLowerCase();
          if (!q) return true;
          const matchCode = sub.code.toLowerCase().includes(q);
          const matchTitle = sub.title.toLowerCase().includes(q);
          const matchSections = sub.sectionsList.some((sec) => sec.toLowerCase().includes(q));
          return matchCode || matchTitle || matchSections;
        });

        return filteredSubjects.length > 0 ? { ...semGroup, subjects: filteredSubjects } : null;
      }).filter(Boolean);

      if (filteredSemesters.length === 0) return null;

      return {
        year: yGroup.year,
        label: yGroup.label,
        semesters: filteredSemesters,
        totalSubjects: filteredSemesters.reduce((acc, s) => acc + s.subjects.length, 0)
      };
    }).filter(Boolean);
  }, [curriculum, selectedProgram, activeYear, activeSem, searchQuery, students]);

  // Open Full-Page Course View
  const handleOpenCourseDetail = (sub) => {
    setSelectedCourseDetail(sub);
    setRosterSectionFilter("all");
    setRosterSearch("");
    setShowEnrollPanel(false);
    setEnrollSearchInput("");
    setDebouncedEnrollSearch("");
  };

  // Real-time Live Matching Students Search (Displays ALL database students matching debounced query with enrollment eligibility status)
  const searchedAllStudentsList = useMemo(() => {
    if (!selectedCourseDetail) return [];
    const courseCodeClean = selectedCourseDetail.code.replace(/\s+/g, "").toLowerCase();

    return students
      .filter((s) => {
        if (!debouncedEnrollSearch) return true; // Show all students if search query is empty
        const q = debouncedEnrollSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.course || "").toLowerCase().includes(q) ||
          (s.section || "").toLowerCase().includes(q)
        );
      })
      .map((s) => {
        // Check if student has ALREADY taken or is currently enrolled in this course
        const existingSubject = (s.semesters || [])
          .flatMap((sem) => sem.subjects || [])
          .find((subItem) => subItem.code && subItem.code.replace(/\s+/g, "").toLowerCase() === courseCodeClean);

        const isAlreadyEnrolled = existingSubject?.status === "Enrolled";
        const isPassed = existingSubject?.status === "Passed";
        const isCompleted = isAlreadyEnrolled || isPassed;

        return {
          ...s,
          isCompleted,
          existingStatus: existingSubject?.status || null
        };
      });
  }, [selectedCourseDetail, students, debouncedEnrollSearch]);

  // Execute Direct Enrollment for Selected Student
  const handleDirectEnrollStudent = (studentObj, chosenSection) => {
    if (!selectedCourseDetail || !studentObj) return;

    let updatedSemesters = JSON.parse(JSON.stringify(studentObj.semesters || []));
    let activeSemObj = updatedSemesters.find((sem) => sem.label === "2nd Semester" && sem.school_year === "2026-2027");

    if (!activeSemObj) {
      activeSemObj = {
        id: `sem-2026-2-${Date.now()}`,
        label: "2nd Semester",
        school_year: "2026-2027",
        gwa: 0.0,
        subjects: []
      };
      updatedSemesters.push(activeSemObj);
    }

    // Add subject to active semester
    activeSemObj.subjects.push({
      code: selectedCourseDetail.code,
      title: selectedCourseDetail.title,
      units: selectedCourseDetail.units,
      midterm_grade: null,
      final_grade: null,
      status: "Enrolled",
      prerequisite: selectedCourseDetail.prereq || "None"
    });

    const updatedStudentObj = {
      ...studentObj,
      section: chosenSection || studentObj.section || `BSIT ${selectedCourseDetail.yearLevel}-A`,
      semesters: updatedSemesters
    };

    updateStudent(updatedStudentObj);

    // Refresh course detail reference with updated student list
    const updatedEnrolledList = [...selectedCourseDetail.enrolledStudents, updatedStudentObj];
    setSelectedCourseDetail({
      ...selectedCourseDetail,
      enrolledCount: updatedEnrolledList.length,
      sectionsList: [...new Set(updatedEnrolledList.map((s) => s.section))],
      enrolledStudents: updatedEnrolledList
    });
  };

  // Handle Unenroll / Drop Action
  const handleUnenrollStudent = (studentId) => {
    const studentObj = students.find((s) => s.id === studentId);
    if (!studentObj || !selectedCourseDetail) return;

    const subCodeClean = selectedCourseDetail.code.replace(/\s+/g, "").toLowerCase();

    const updatedSemesters = (studentObj.semesters || []).map((sem) => ({
      ...sem,
      subjects: (sem.subjects || []).filter(
        (sub) => sub.code && sub.code.replace(/\s+/g, "").toLowerCase() !== subCodeClean
      )
    }));

    const updatedStudentObj = {
      ...studentObj,
      semesters: updatedSemesters
    };

    updateStudent(updatedStudentObj);

    // Refresh course view
    const nextEnrolledList = selectedCourseDetail.enrolledStudents.filter((s) => s.id !== studentId);
    setSelectedCourseDetail({
      ...selectedCourseDetail,
      enrolledCount: nextEnrolledList.length,
      sectionsList: [...new Set(nextEnrolledList.map((s) => s.section))],
      enrolledStudents: nextEnrolledList
    });
  };

  // Filtered Roster for the Dedicated View
  const filteredRoster = useMemo(() => {
    if (!selectedCourseDetail) return [];
    return selectedCourseDetail.enrolledStudents.filter((s) => {
      // Section Filter
      if (rosterSectionFilter !== "all" && s.section !== rosterSectionFilter) {
        return false;
      }
      // Search Filter
      if (rosterSearch) {
        const q = rosterSearch.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchId = s.id.toLowerCase().includes(q);
        const matchSec = (s.section || "").toLowerCase().includes(q);
        return matchName || matchId || matchSec;
      }
      return true;
    });
  }, [selectedCourseDetail, rosterSectionFilter, rosterSearch]);

  // =========================================================================
  // IF A COURSE IS SELECTED: RENDER EXPANSIVE DEDICATED FULL-PAGE VIEW
  // =========================================================================
  if (selectedCourseDetail) {
    return (
      <div className="w-full pb-16 font-sans animate-in fade-in duration-200">
        
        {/* Top Back Navigation Bar */}
        <div className="mb-6">
          <button
            onClick={() => setSelectedCourseDetail(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#e5e7eb] hover:border-[#ea580c] hover:text-[#ea580c] text-[#111827] text-[13px] font-bold rounded-2xl transition-all shadow-xs"
          >
            <ArrowLeft size={18} />
            Back to All Courses &amp; Section Allocations
          </button>
        </div>

        {/* HERO COURSE HEADER BANNER */}
        <div className="bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#374151] rounded-3xl p-8 text-white shadow-md mb-8 border border-gray-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="px-3.5 py-1 bg-[#ea580c] text-white font-mono text-[15px] font-black rounded-xl shadow-xs">
                  {selectedCourseDetail.code}
                </span>
                <span className="text-[12px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 flex items-center gap-1.5">
                  <Calendar size={13} /> AY 2026-2027 · 2nd Semester
                </span>
                <span className="text-[12px] font-bold text-gray-300 bg-white/10 px-3 py-1 rounded-full">
                  {selectedCourseDetail.yearLevel}th Year · {selectedCourseDetail.semNum}nd Sem Course
                </span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug mb-2">
                {selectedCourseDetail.title}
              </h1>

              <p className="text-[14px] text-gray-300 max-w-3xl leading-relaxed">
                {selectedCourseDetail.units} Academic Units · {selectedCourseDetail.lec} Hours Lecture / {selectedCourseDetail.lab} Hours Laboratory · Prerequisite: <strong className="text-white font-mono">{selectedCourseDetail.prereq || "None"}</strong>
              </p>
            </div>

            {/* Header Right Action Stats */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-shrink-0">
              <div className="text-center px-3">
                <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Enrolled</p>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  {selectedCourseDetail.enrolledCount}
                </p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center px-3">
                <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Sections</p>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  {selectedCourseDetail.sectionsList.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION SEATS & CAPACITY EXPANSIVE GRID */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <Building2 size={20} className="text-[#ea580c]" /> Section Seat Allocations &amp; Fill Capacities
            </h2>
            <span className="text-[12px] font-bold text-[#6b7280]">
              Showing active sections assigned to this subject
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(sections || [])
              .filter((sec) =>
                selectedCourseDetail.sectionsList.includes(sec.name) ||
                sec.name.startsWith(`BSIT ${selectedCourseDetail.yearLevel}`)
              )
              .map((sec) => {
                const enrolledInSec = selectedCourseDetail.enrolledStudents.filter((s) => s.section === sec.name).length;
                const maxCap = sec.maxCapacity || 45;
                const fillPct = Math.min(100, Math.round((enrolledInSec / maxCap) * 100));
                const isFull = enrolledInSec >= maxCap;

                return (
                  <div
                    key={sec.id}
                    className="bg-white border-2 border-[#e5e7eb] rounded-2xl p-5 shadow-xs hover:border-[#ea580c]/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-lg font-black font-mono text-[#111827]">{sec.name}</span>
                        <p className="text-[12px] text-[#6b7280]">{sec.adviser} · {sec.room}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                          isFull
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isFull ? "Full" : "Open"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[13px] font-bold mb-2">
                      <span className="text-[#4b5563]">Enrolled Seats:</span>
                      <span className="font-mono text-[#111827]">
                        {enrolledInSec} / {maxCap} Seats ({fillPct}%)
                      </span>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isFull ? "bg-red-500" : fillPct > 80 ? "bg-amber-500" : "bg-[#ea580c]"
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ROSTER MANAGEMENT & ENROLLMENT SECTION */}
        <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-6 shadow-xs mb-8">
          
          {/* Roster Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f3f4f6] pb-6 mb-6">
            <div>
              <h2 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
                <GraduationCap size={22} className="text-[#ea580c]" />
                {showEnrollPanel ? "Course Enrollment Mode" : "Enrolled Student Roster"}
              </h2>
              <p className="text-[13px] text-[#6b7280]">
                {showEnrollPanel
                  ? `Search and add eligible database students to ${selectedCourseDetail.code}`
                  : `${filteredRoster.length} students currently taking ${selectedCourseDetail.code} in AY 2026-2027 2nd Semester`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Section Filter Pills (Only shown when not in enrollment mode) */}
              {!showEnrollPanel && (
                <div className="flex items-center gap-1 bg-[#f9fafb] border border-[#e5e7eb] p-1 rounded-xl">
                  <button
                    onClick={() => setRosterSectionFilter("all")}
                    className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${
                      rosterSectionFilter === "all"
                        ? "bg-[#ea580c] text-white shadow-xs"
                        : "text-[#4b5563] hover:bg-gray-200/50"
                    }`}
                  >
                    All Sections
                  </button>
                  {selectedCourseDetail.sectionsList.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setRosterSectionFilter(sec)}
                      className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${
                        rosterSectionFilter === sec
                          ? "bg-[#ea580c] text-white shadow-xs"
                          : "text-[#4b5563] hover:bg-gray-200/50"
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              )}

              {/* Secretary Action: Add Student Toggle Button */}
              {isSecretary && (
                <button
                  onClick={() => setShowEnrollPanel(!showEnrollPanel)}
                  className={`flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${
                    showEnrollPanel
                      ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      : "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                  }`}
                >
                  {showEnrollPanel ? (
                    <>
                      <X size={16} /> Close Enrollment &amp; View Roster
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} /> + Enroll Student to Course
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* DYNAMIC REAL-TIME LIVE SEARCH ENROLLMENT PANEL (FOR SECRETARY / ADVISER) */}
          {showEnrollPanel && isSecretary ? (
            <div className="bg-[#fff7ed] border-2 border-[#ffedd5] rounded-2xl p-6 mb-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={20} className="text-[#ea580c]" />
                  <h3 className="text-base font-bold text-[#111827]">
                    Search &amp; Enroll Student to {selectedCourseDetail.code}
                  </h3>
                </div>
                <span className="text-[12px] font-bold text-[#ea580c] bg-white px-3 py-1 rounded-full border border-amber-200">
                  {searchedAllStudentsList.length} Database Students
                </span>
              </div>
              <p className="text-[13px] text-[#6b7280] mb-4">
                Type any student name or ID to view live matching records. Students already enrolled or finished display their status badge.
              </p>

              {/* Real-time Search Box (Instant text update for 0 input lag) */}
              <div className="relative mb-5">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ea580c]" />
                <input
                  type="text"
                  placeholder="Type student name (e.g. Sarah Lopez, Mark, Chloe, Andrea)..."
                  value={enrollSearchInput}
                  onChange={(e) => setEnrollSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 h-11 text-[14px] border-2 border-[#ea580c]/40 rounded-xl bg-white text-[#111827] font-bold placeholder-[#9ca3af] focus:outline-none focus:border-[#ea580c] shadow-xs"
                />
              </div>

              {/* Live Search Matching Student Cards List (FIXED HEIGHT TO ELIMINATE TYPING JITTER/JUMPS) */}
              <div className="h-[360px] overflow-y-auto pr-1 space-y-3 rounded-xl border border-amber-200/60 bg-amber-50/30 p-2">
                {searchedAllStudentsList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-amber-200 text-[#6b7280]">
                    <Search size={32} className="text-amber-400 mb-2 opacity-60" />
                    <p className="text-[14px] font-bold text-[#111827]">No Database Students Match</p>
                    <p className="text-[12px] text-[#9ca3af] mt-0.5">
                      No active student matching &quot;{debouncedEnrollSearch}&quot; was found.
                    </p>
                  </div>
                ) : (
                  searchedAllStudentsList.map((st) => (
                    <div
                      key={st.id}
                      className="bg-white border-2 border-[#e5e7eb] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#ea580c]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#ea580c] text-white flex items-center justify-center font-bold text-[14px]">
                          {st.avatar || st.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-bold text-[#111827]">{st.name}</p>
                            <span className="text-[11px] font-bold font-mono text-[#6b7280]">({st.id})</span>
                          </div>
                          <p className="text-[12px] text-[#6b7280]">
                            {st.course} · Section: <strong className="text-[#111827] font-mono">{st.section || "Unassigned"}</strong> · {st.yr}th Year
                          </p>
                        </div>
                      </div>

                      {/* Right Action: Enrolled Status Badge OR Select Section & Enroll Button */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {st.isCompleted ? (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[12px] font-bold border border-gray-200">
                            <CheckCircle size={14} className="text-emerald-600" />
                            {st.existingStatus === "Enrolled" ? "Currently Enrolled in Course" : "Course Completed"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              id={`sec-select-${st.id}`}
                              defaultValue={st.section || `BSIT ${selectedCourseDetail.yearLevel}-A`}
                              className="h-9 px-2.5 text-[12px] border border-[#e5e7eb] rounded-lg bg-[#fafafa] font-bold text-[#111827]"
                            >
                              {(sections || [])
                                .filter((sec) => sec.name.startsWith(`BSIT ${selectedCourseDetail.yearLevel}`))
                                .map((sec) => (
                                  <option key={sec.id} value={sec.name}>
                                    {sec.name}
                                  </option>
                                ))}
                            </select>

                            <button
                              onClick={() => {
                                const secEl = document.getElementById(`sec-select-${st.id}`);
                                const chosenSec = secEl ? secEl.value : st.section;
                                handleDirectEnrollStudent(st, chosenSec);
                              }}
                              className="flex items-center gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[12px] font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                            >
                              <Plus size={14} /> Enroll Student
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          ) : (
            /* ENROLLED STUDENT ROSTER TABLE (ONLY SHOWN WHEN NOT IN ENROLLMENT MODE FOR ZERO CLUTTER) */
            <div>
              {/* Roster Search Input */}
              <div className="relative mb-6">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Search enrolled students by name, ID number, or section..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl text-[13px] font-medium text-[#111827] focus:outline-none focus:border-[#ea580c] focus:bg-white transition-all"
                />
              </div>

              {/* Full Enrolled Student Table */}
              {filteredRoster.length === 0 ? (
                <div className="p-8 text-center bg-[#fafafa] rounded-2xl border-2 border-dashed border-[#e5e7eb] text-[#6b7280]">
                  <Users size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-[14px] font-bold">No Enrolled Students Found</p>
                  <p className="text-[12px] text-[#9ca3af]">No students in the database are currently enrolled under this filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#e5e7eb] rounded-2xl">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#fafafa] border-b border-[#e5e7eb]">
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Student Info</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Student ID</th>
                        <th className="px-6 py-3.5 text-center text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Assigned Section</th>
                        <th className="px-6 py-3.5 text-center text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Year Level</th>
                        <th className="px-6 py-3.5 text-center text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Academic Status</th>

                        {isSecretary && (
                          <th className="px-6 py-3.5 text-right text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                      {filteredRoster.map((st) => (
                        <tr key={st.id} className="hover:bg-[#fff7ed]/30 transition-colors">
                          
                          {/* Name & Avatar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#ea580c] text-white flex items-center justify-center font-bold text-[13px] shadow-2xs">
                                {st.avatar || st.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <p className="text-[14px] font-bold text-[#111827]">{st.name}</p>
                                <p className="text-[11px] text-[#6b7280]">{st.course}</p>
                              </div>
                            </div>
                          </td>

                          {/* ID Number */}
                          <td className="px-6 py-4 text-[13px] font-bold font-mono text-[#4b5563]">
                            {st.id}
                          </td>

                          {/* Assigned Section */}
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5] rounded-lg text-[12px] font-black font-mono">
                              {st.section || "Unassigned"}
                            </span>
                          </td>

                          {/* Year Level */}
                          <td className="px-6 py-4 text-center text-[13px] font-bold text-[#111827]">
                            {st.yr}{st.yr === 1 ? "st" : st.yr === 2 ? "nd" : st.yr === 3 ? "rd" : "th"} Year
                          </td>

                          {/* Academic Status */}
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                                st.status === "Regular"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {st.status}
                            </span>
                          </td>



                          {/* Action (Unenroll) */}
                          {isSecretary && (
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleUnenrollStudent(st.id)}
                                title="Unenroll student from this course"
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    );
  }

  // =========================================================================
  // MAIN SUBJECT ENROLMENT & ASSIGNED SECTIONS CARDS PAGE
  // =========================================================================
  return (
    <div className="w-full pb-16 font-sans">
      
      {/* Page Header (No top-right badge as requested) */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight mb-1">
            Subject Enrolment &amp; Assigned Sections
          </h1>
          <p className="text-[14px] text-[#6b7280]">
            Current Academic Term: <strong className="text-[#ea580c]">AY 2026-2027 · 2nd Semester</strong> (Click any course card to open full-page section allocations &amp; roster)
          </p>
        </div>
      </div>

      {/* Program Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { key: "BSIT", name: "BS Information Technology", desc: "BSIT Program", icon: Laptop, color: "from-[#ea580c] to-[#c2410c]" },
          { key: "BSCS", name: "BS Computer Science", desc: "BSCS Program", icon: Terminal, color: "from-[#2563eb] to-[#1d4ed8]" },
          { key: "ACT", name: "Associate in Computer Tech", desc: "ACT Program", icon: Wrench, color: "from-[#059669] to-[#047857]" }
        ].map((prog) => {
          const isSelected = selectedProgram === prog.key;
          const Icon = prog.icon;
          return (
            <button
              key={prog.key}
              onClick={() => setSelectedProgram(prog.key)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? "bg-white border-[#ea580c] shadow-md ring-2 ring-[#ea580c]/10"
                  : "bg-white/70 border-[#e5e7eb] hover:border-[#d1d5db] hover:bg-white"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm bg-gradient-to-br ${
                  isSelected ? prog.color : "from-gray-400 to-gray-500 opacity-60"
                }`}
              >
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-[#111827] truncate">{prog.name}</p>
                <p className="text-[12px] text-[#6b7280]">{prog.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-[#fcfcfc] border-2 border-[#e5e7eb] rounded-2xl p-4 mb-8 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search by subject code (e.g. IT 104), course title, or section (e.g. BSIT 1-A)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-[14px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#ea580c] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#e5e7eb] p-1 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ea580c] px-2 flex items-center gap-1">
              <Calendar size={13} /> Year Level:
            </span>
            {["all", "1", "2", "3", "4"].map((yr) => (
              <button
                key={yr}
                onClick={() => setActiveYear(yr)}
                className={`px-3 py-1 rounded-lg text-[13px] font-bold transition-all ${
                  activeYear === yr
                    ? "bg-[#ea580c] text-[#ffffff] shadow-xs"
                    : "text-[#4b5563] hover:text-[#111827] hover:bg-gray-100"
                }`}
              >
                {yr === "all" ? "All Years" : `${yr}${yr === "1" ? "st" : yr === "2" ? "nd" : yr === "3" ? "rd" : "th"} Year`}
              </button>
            ))}
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#e5e7eb] p-1 rounded-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ea580c] px-2 flex items-center gap-1">
              <Filter size={13} /> Semester:
            </span>
            {["all", "1", "2"].map((sem) => (
              <button
                key={sem}
                onClick={() => setActiveSem(sem)}
                className={`px-3 py-1 rounded-lg text-[13px] font-bold transition-all ${
                  activeSem === sem
                    ? "bg-[#ea580c] text-[#ffffff] shadow-xs"
                    : "text-[#4b5563] hover:text-[#111827] hover:bg-gray-100"
                }`}
              >
                {sem === "all" ? "All Semesters" : `${sem}${sem === "1" ? "st" : "nd"} Sem`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course Enrollment & Assigned Sections Grid */}
      {filteredSubjectYearGroups.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#e5e7eb] rounded-3xl p-12 text-center my-8">
          <BookOpen size={48} className="mx-auto text-[#ea580c]/30 mb-3" />
          <h3 className="text-lg font-bold text-[#111827]">No Courses Found</h3>
          <p className="text-[14px] text-[#6b7280] max-w-md mx-auto mt-1">
            No subjects match your active program, year level, semester, or search query.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredSubjectYearGroups.map((yGroup) => (
            <div key={yGroup.year} className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-6 shadow-xs">
              
              {/* Year Group Header */}
              <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#ea580c]" />
                  <h2 className="text-xl font-black text-[#111827] tracking-tight">
                    {yGroup.label} Subjects
                  </h2>
                </div>
                <span className="bg-[#fff7ed] text-[#ea580c] text-[12px] font-bold px-3 py-1 rounded-full border border-[#ffedd5]">
                  {yGroup.semesters.reduce((acc, sem) => acc + sem.subjects.length, 0)} Total Subjects
                </span>
              </div>

              {/* Semesters under this Year */}
              <div className="space-y-8">
                {yGroup.semesters.map((semGroup) => (
                  <div key={semGroup.sem}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
                      <h3 className="text-[15px] font-bold text-[#ea580c] uppercase tracking-wider">
                        {semGroup.label}
                      </h3>
                    </div>

                    {/* Subjects Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {semGroup.subjects.map((sub) => {
                        const hasEnrollment = sub.enrolledCount > 0;

                        return (
                          <div
                            key={sub.code}
                            onClick={() => handleOpenCourseDetail(sub)}
                            className="group bg-white border-2 border-[#e5e7eb] hover:border-[#ea580c] rounded-2xl p-5 shadow-xs transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
                          >
                            {/* Card Top: Code & Enrollment Badge */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className="px-3 py-1 bg-[#fff7ed] text-[#ea580c] text-[13px] font-black rounded-lg border border-[#ffedd5] font-mono group-hover:bg-[#ea580c] group-hover:text-white transition-colors">
                                  {sub.code}
                                </span>

                                <span
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold border ${
                                    hasEnrollment
                                      ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
                                      : "bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]"
                                  }`}
                                >
                                  <Users size={13} />
                                  {sub.enrolledCount} Enrolled
                                </span>
                              </div>

                              {/* Course Title & Details */}
                              <h4 className="text-[15px] font-bold text-[#111827] group-hover:text-[#ea580c] leading-snug mb-1 line-clamp-2 transition-colors">
                                {sub.title}
                              </h4>
                              <p className="text-[12px] text-[#6b7280] mb-4">
                                {sub.units} Units · {sub.lec}h Lec / {sub.lab}h Lab
                              </p>
                            </div>

                            {/* Card Bottom: Assigned Sections Badges & Prominent View Full List Button */}
                            <div className="pt-3 border-t border-[#f3f4f6]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
                                  Assigned Sections:
                                </span>
                                <span className="text-[12px] font-extrabold text-[#ea580c] bg-[#fff7ed] group-hover:bg-[#ea580c] group-hover:text-white px-2.5 py-1 rounded-lg border border-[#ffedd5] flex items-center gap-1 transition-all shadow-2xs">
                                  View Full List <ChevronRight size={14} />
                                </span>
                              </div>

                              {sub.sectionsList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {sub.sectionsList.map((sec) => (
                                    <span
                                      key={sec}
                                      className="px-2.5 py-1 bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5] rounded-lg text-[12px] font-extrabold font-mono shadow-2xs"
                                    >
                                      {sec}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[12px] italic text-[#9ca3af]">None</span>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
