import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, MinusCircle, AlertTriangle,
  Edit3, Printer, BookOpen, Award, Filter, Calendar
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

const STATUS_CFG = {
  Passed:     { Icon: CheckCircle2, color: "text-[#047857]", bg: "bg-[#ecfdf5]", border: "border-[#a7f3d0]" },
  Failed:     { Icon: XCircle,      color: "text-[#dc2626]", bg: "bg-[#fef2f2]", border: "border-[#fecaca]" },
  Dropped:    { Icon: MinusCircle,  color: "text-[#4b5563]", bg: "bg-[#f3f4f6]", border: "border-[#e5e7eb]" },
  Incomplete: { Icon: Clock,        color: "text-[#b45309]", bg: "bg-[#fef3c7]", border: "border-[#fde68a]" },
};

function gwaColor(g) {
  if (g <= 1.75) return "text-[#047857]";
  if (g <= 2.50) return "text-[#1d4ed8]";
  if (g <= 3.00) return "text-[#b45309]";
  return "text-[#dc2626]";
}

function gwaBg(g) {
  if (g <= 1.75) return "bg-[#ecfdf5] border-[#a7f3d0]";
  if (g <= 2.50) return "bg-[#eff6ff] border-[#bfdbfe]";
  if (g <= 3.00) return "bg-[#fef3c7] border-[#fde68a]";
  return "bg-[#fef2f2] border-[#fecaca]";
}

function Avatar({ initials, size = "w-16 h-16", text = "text-[18px]" }) {
  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white flex items-center justify-center ${text} font-bold flex-shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

export default function StudentRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { students, updateStudentGrade, updateStudent } = useData();

  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'history'
  const [selectedYearFilter, setSelectedYearFilter] = useState("all"); // 'all' | '1' | '2' | '3' | '4'
  const [selectedSemFilter, setSelectedSemFilter] = useState("all"); // 'all' | '1' | '2'

  // PRIVACY RULE: If a student tries to view another student's record, force redirect to their own record!
  if (user?.role === "student" && id && user.id && id !== user.id) {
    return <Navigate to={`/students/${user.id}`} replace />;
  }

  const activeStudentId = user?.role === "student" ? (user.id || "2025-0014") : id;
  const student = students.find((s) => s.id === activeStudentId) || students[0];

  const [editingGradeSub, setEditingGradeSub] = useState(null);
  const [gradeInput, setGradeInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");

  const isStudentRole = user?.role === "student";
  const isAdviserRole = user?.role === "adviser";
  const isSecretaryRole = user?.role === "secretary";

  if (!student) {
    return (
      <div className="p-12 text-center bg-white border-2 border-[#e5e7eb] rounded-3xl shadow-sm my-8 max-w-lg mx-auto font-sans">
        <p className="text-[16px] text-[#4b5563] mb-4 font-semibold">Student record not found.</p>
        <button
          onClick={() => navigate(isStudentRole ? "/" : "/students")}
          className="bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const allSubjects = (student.semesters || []).flatMap((s) => s.subjects || []);
  const passedSubjects = allSubjects.filter((s) => s.status === "Passed");
  const passedCount = passedSubjects.length;
  const failedCount = allSubjects.filter((s) => s.status === "Failed").length;
  const droppedCount = allSubjects.filter((s) => s.status === "Dropped").length;
  const incompleteCount = allSubjects.filter((s) => s.status === "Incomplete").length;

  const handleSaveGrade = (semId, subjectCode) => {
    if (gradeInput !== "") {
      updateStudentGrade(student.id, semId, subjectCode, gradeInput, undefined, remarkInput);
      setEditingGradeSub(null);
      setGradeInput("");
      setRemarkInput("");
    }
  };

  const handleStatusChange = (newStatus) => {
    if (isSecretaryRole) {
      updateStudent({ ...student, status: newStatus });
    }
  };

  const handlePrintAdvisingReport = () => {
    window.print();
  };

  // Filter semesters based on 2-tier clean selection (Year & Semester)
  const displayedSemesters = (student.semesters || []).filter((sem, idx) => {
    // Determine year level of semester (e.g. index 0-1 = Year 1, 2-3 = Year 2, etc. or label matching)
    const semYear = String(sem.year || Math.floor(idx / 2) + 1);
    const semNum = sem.label?.includes("2nd") ? "2" : "1";

    const matchYear = selectedYearFilter === "all" || semYear === selectedYearFilter;
    const matchSem = selectedSemFilter === "all" || semNum === selectedSemFilter;

    return matchYear && matchSem;
  });

  return (
    <div className="w-full pb-16 font-sans print:p-0 print:bg-white">

      {/* Navigation & Header Controls */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        {!isStudentRole ? (
          <button
            onClick={() => navigate("/students")}
            className="flex items-center gap-2 text-[14px] text-[#6b7280] hover:text-[#111827] font-semibold transition-colors bg-white border border-[#e5e7eb] px-4 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft size={16} /> Back to Student List
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {(isAdviserRole || isSecretaryRole) && (
            <button
              onClick={handlePrintAdvisingReport}
              className="flex items-center gap-2 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-md transition-all"
            >
              <Printer size={15} /> Print Advising & Academic History
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Hero Banner (Spacious & Clean) */}
      <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-8 mb-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            <Avatar initials={student.avatar} size="w-16 h-16" text="text-[18px]" />
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-black text-[#111827] tracking-tight">{student.name}</h1>

                {/* Status Dropdown for Secretary vs Badge for others */}
                {isSecretaryRole ? (
                  <select
                    value={student.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-[12px] font-bold px-3 py-1 rounded-xl border-2 bg-white cursor-pointer outline-none border-[#ea580c] text-[#ea580c]"
                  >
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
                ) : (
                  <span className={`text-[12px] font-bold px-3 py-1 rounded-xl border ${
                    student.status === "Regular"
                      ? "bg-[#fff7ed] text-[#c2410c] border-[#ffedd5]"
                      : "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                  }`}>
                    {student.status}
                  </span>
                )}
              </div>

              <p className="text-[14px] text-[#4b5563]">
                <span className="font-bold text-[#111827]">{student.course}</span> &nbsp;·&nbsp;
                Section: <span className="font-bold text-[#ea580c]">{student.section || "BSIT 2-A"}</span> &nbsp;·&nbsp;
                {["1st","2nd","3rd","4th"][student.yr - 1]} Year &nbsp;·&nbsp;
                ID: <span className="font-mono font-bold text-[#111827]">{student.id}</span>
              </p>
            </div>
          </div>


        </div>
      </div>

      {/* CLEAN 2-TAB NAVIGATION */}
      <div className="flex items-center gap-3 mb-8 border-b-2 border-[#e5e7eb] pb-3">
        {[
          { key: "overview", label: "Academic Overview", icon: Award },
          { key: "history", label: "Semester Subject Records", icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-2xl text-[14px] font-bold transition-all flex items-center gap-2 ${
                active
                  ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-md"
                  : "bg-white border-2 border-[#e5e7eb] text-[#4b5563] hover:border-[#ea580c] hover:text-[#111827]"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ACADEMIC OVERVIEW */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-8">
          
          {/* Subject Tally Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Passed Subjects", count: passedCount, cfg: STATUS_CFG.Passed },
              { label: "Failed Subjects", count: failedCount, cfg: STATUS_CFG.Failed },
              { label: "Dropped Subjects", count: droppedCount, cfg: STATUS_CFG.Dropped },
              { label: "Incomplete Grades", count: incompleteCount, cfg: STATUS_CFG.Incomplete },
            ].map((item) => (
              <div key={item.label} className={`${item.cfg.bg} border-2 ${item.cfg.border} rounded-3xl p-6 text-center shadow-sm`}>
                <p className={`text-[32px] font-black font-mono ${item.cfg.color}`}>{item.count}</p>
                <p className={`text-[13px] font-bold mt-1 ${item.cfg.color}`}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Academic Concern Alerts */}
          {(student.concerns || []).length > 0 && (
            <div className="border-2 border-[#fecaca] rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-[#fef2f2] px-6 py-4 border-b border-[#fecaca] flex items-center gap-2">
                <AlertTriangle size={18} className="text-[#dc2626]" />
                <h4 className="text-[14px] font-bold text-[#dc2626]">
                  Academic Concern Flags ({student.concerns.length})
                </h4>
              </div>
              <div className="divide-y divide-[#fecaca] bg-white text-[14px] text-[#111827]">
                {student.concerns.map((c, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
                    <span className="font-semibold">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: SEMESTER SUBJECT RECORDS (2-TIER CLEAN FILTER) */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-6">
          
          {/* CLEAN 2-TIER YEAR & SEMESTER FILTER CARD */}
          <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Year Level Selection */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-[#ea580c] uppercase tracking-wide mr-1 flex items-center gap-1">
                <Calendar size={14} /> Year Level:
              </span>
              {[
                { key: "all", label: "All Years" },
                { key: "1", label: "1st Year" },
                { key: "2", label: "2nd Year" },
                { key: "3", label: "3rd Year" },
                { key: "4", label: "4th Year" },
              ].map((y) => (
                <button
                  key={y.key}
                  onClick={() => setSelectedYearFilter(y.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                    selectedYearFilter === y.key
                      ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white shadow-sm"
                      : "bg-[#fafafa] text-[#4b5563] border border-[#e5e7eb] hover:border-[#ea580c] hover:text-[#111827]"
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>

            {/* Semester Sub-Filter */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[12px] font-bold text-[#ea580c] uppercase tracking-wide">Semester:</span>
              <div className="bg-[#fafafa] border border-[#e5e7eb] p-1 rounded-xl flex items-center gap-1">
                {[
                  { key: "all", label: "All Semesters" },
                  { key: "1", label: "1st Sem" },
                  { key: "2", label: "2nd Sem" },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSelectedSemFilter(s.key)}
                    className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all ${
                      selectedSemFilter === s.key
                        ? "bg-[#ea580c] text-white shadow-sm"
                        : "text-[#4b5563] hover:text-[#111827]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Render Semester Tables */}
          {displayedSemesters.length === 0 ? (
            <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-10 text-center text-[#6b7280]">
              <p className="text-[14px] font-semibold">No subject records found matching selected year and semester filter.</p>
            </div>
          ) : (
            displayedSemesters.map((sem) => (
              <div key={sem.id} className="bg-white border-2 border-[#e5e7eb] rounded-3xl overflow-hidden shadow-sm">
                
                {/* Semester Header */}
                <div className="flex items-center justify-between px-8 py-5 bg-[#fafafa] border-b-2 border-[#e5e7eb]">
                  <div>
                    <h3 className="text-[17px] font-extrabold text-[#111827]">
                      Academic Year {sem.school_year} :: {sem.label}
                    </h3>
                    <p className="text-[12px] font-semibold text-[#ea580c] mt-0.5">
                      {sem.subjects?.length || 0} Total Enrolled Subjects
                    </p>
                  </div>
                </div>

                {/* Subject Table */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-[#fafafa]/60">
                      {(isStudentRole
                        ? ["Subject Code", "Subject Title", "Units", "Midterm", "Final Grade", "Status", "Prerequisite Check"]
                        : ["Subject Code", "Subject Title", "Units", "Midterm", "Final Grade", "Status", "Prerequisite Check", "Actions"]
                      ).map((h, i) => (
                        <th key={i} className={`px-6 py-4 text-[11px] font-bold text-[#6b7280] uppercase tracking-wide ${i >= 2 && i <= 5 ? "text-center" : "text-left"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(sem.subjects || []).map((subj, sjIdx) => {
                      const cfg = STATUS_CFG[subj.status] || STATUS_CFG.Dropped;
                      const isEditing = editingGradeSub?.semId === sem.id && editingGradeSub?.code === subj.code;

                      return (
                        <tr key={sjIdx} className="border-b border-[#f3f4f6] hover:bg-[#fff7ed]/40 transition-colors">
                          
                          {/* Subject Code */}
                          <td className="px-6 py-4">
                            <span className="text-[14px] font-mono font-bold text-[#111827]">{subj.code}</span>
                          </td>

                          {/* Title */}
                          <td className="px-6 py-4">
                            <p className="text-[14px] font-semibold text-[#111827]">{subj.title}</p>
                          </td>

                          {/* Units */}
                          <td className="px-6 py-4 text-center text-[14px] font-mono text-[#4b5563]">{subj.units}</td>

                          {/* Midterm */}
                          <td className="px-6 py-4 text-center text-[14px] font-mono text-[#6b7280]">
                            {subj.midterm_grade ? Number(subj.midterm_grade).toFixed(2) : "—"}
                          </td>

                          {/* Final Grade */}
                          <td className="px-6 py-4 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.25"
                                value={gradeInput}
                                onChange={(e) => setGradeInput(e.target.value)}
                                className="w-16 h-9 px-2 text-[14px] font-mono font-bold border-2 border-[#ea580c] rounded-xl outline-none text-center"
                              />
                            ) : (
                              <span className={`text-[16px] font-black font-mono ${subj.final_grade === 5.0 ? "text-[#dc2626]" : cfg.color}`}>
                                {subj.final_grade !== null && subj.final_grade !== undefined ? Number(subj.final_grade).toFixed(2) : "—"}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-xl border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                              {subj.status}
                            </span>
                          </td>

                          {/* Prerequisite */}
                          <td className="px-6 py-4">
                            {subj.prereq_flag ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] px-2.5 py-1 rounded-lg">
                                <AlertTriangle size={12} /> PREREQ NOT MET
                              </span>
                            ) : subj.prerequisite ? (
                              <span className="text-[12px] text-[#6b7280]">
                                Prereq: <span className="font-mono font-semibold">{subj.prerequisite}</span> (Passed)
                              </span>
                            ) : (
                              <span className="text-[12px] text-[#9ca3af]">None required</span>
                            )}
                          </td>

                          {/* Actions (HIDDEN ENTIRELY FOR STUDENT ROLE!) */}
                          {!isStudentRole && (
                            <td className="px-6 py-4">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveGrade(sem.id, subj.code)}
                                    className="px-3 py-1 bg-[#ea580c] text-white text-[12px] font-bold rounded-lg shadow-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingGradeSub(null)}
                                    className="px-2 py-1 text-[#6b7280] text-[12px] font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingGradeSub({ semId: sem.id, code: subj.code });
                                    setGradeInput(subj.final_grade || "");
                                  }}
                                  className="text-[13px] font-bold text-[#ea580c] hover:underline flex items-center gap-1"
                                >
                                  <Edit3 size={14} /> Encode Grade
                                </button>
                              )}
                            </td>
                          )}

                        </tr>
                      );
                    })}
                  </tbody>
                </table>

              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}