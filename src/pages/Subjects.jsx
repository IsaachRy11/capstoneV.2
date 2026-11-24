import { useState, useMemo } from "react";
import { BookOpen, Search, Plus, X, Laptop, Terminal, Wrench, Save } from "lucide-react";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

export default function Subjects() {
  const { user } = useAuth();
  const { curriculum, addSubjectToCurriculum } = useData();

  const [selectedProgram, setSelectedProgram] = useState("BSIT");
  const [selectedYear, setSelectedYear] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Secretary Add Subject Modal
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubForm, setNewSubForm] = useState({
    program: "BSIT",
    year: 1,
    sem: 1,
    code: "",
    title: "",
    units: 3,
    lec: 2,
    lab: 3,
    prereq: "None",
    desc: ""
  });

  const isSecretary = user?.role === "secretary";
  const activeProgData = curriculum[selectedProgram] || curriculum["BSIT"];

  const filteredCurriculum = useMemo(() => {
    return activeProgData.years.map((yearObj) => {
      if (selectedYear !== "all" && String(yearObj.year) !== String(selectedYear)) {
        return null;
      }

      const filteredSemesters = yearObj.semesters.map((semObj) => {
        const filteredSubjects = semObj.subjects.filter((sub) => {
          const q = searchQuery.toLowerCase();
          return (
            !q ||
            sub.code.toLowerCase().includes(q) ||
            sub.title.toLowerCase().includes(q) ||
            sub.prereq.toLowerCase().includes(q) ||
            sub.desc.toLowerCase().includes(q)
          );
        });

        return { ...semObj, subjects: filteredSubjects };
      }).filter((s) => s.subjects.length > 0);

      return filteredSemesters.length > 0 ? { ...yearObj, semesters: filteredSemesters } : null;
    }).filter(Boolean);
  }, [activeProgData, selectedYear, searchQuery]);

  const handleAddSubjectSubmit = (e) => {
    e.preventDefault();
    if (!newSubForm.code || !newSubForm.title) return;

    addSubjectToCurriculum(
      newSubForm.program,
      newSubForm.year,
      newSubForm.sem,
      {
        code: newSubForm.code.toUpperCase(),
        title: newSubForm.title,
        units: Number(newSubForm.units),
        lec: Number(newSubForm.lec),
        lab: Number(newSubForm.lab),
        prereq: newSubForm.prereq || "None",
        desc: newSubForm.desc || "Standard academic course."
      }
    );

    setShowAddSubjectModal(false);
    setNewSubForm({
      program: "BSIT",
      year: 1,
      sem: 1,
      code: "",
      title: "",
      units: 3,
      lec: 2,
      lab: 3,
      prereq: "None",
      desc: ""
    });
  };

  return (
    <div className="w-full pb-16 font-sans">
      
      {/* Page Header Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight mb-1">
            Curriculum &amp; Academic Course Catalog
          </h1>
          <p className="text-[14px] text-[#6b7280]">
            Master course catalog for BSIT, BSCS, and ACT degree programs
          </p>
        </div>

        {isSecretary && (
          <button
            onClick={() => setShowAddSubjectModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <Plus size={16} />
            Add New Curriculum Subject
          </button>
        )}
      </div>

      {/* Program Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { key: "BSIT", name: "BS Information Technology", desc: "BSIT Curriculum", icon: Laptop, color: "from-[#ea580c] to-[#c2410c]", activeBorder: "border-[#ea580c]", ringColor: "ring-[#ea580c]/10" },
          { key: "BSCS", name: "BS Computer Science", desc: "BSCS Curriculum", icon: Terminal, color: "from-[#2563eb] to-[#1d4ed8]", activeBorder: "border-[#2563eb]", ringColor: "ring-[#2563eb]/10" },
          { key: "ACT", name: "Associate in Computer Tech", desc: "ACT Curriculum", icon: Wrench, color: "from-[#059669] to-[#047857]", activeBorder: "border-[#059669]", ringColor: "ring-[#059669]/10" }
        ].map((prog) => {
          const isSelected = selectedProgram === prog.key;
          const Icon = prog.icon;
          return (
            <button
              key={prog.key}
              type="button"
              onClick={() => setSelectedProgram(prog.key)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? `bg-white ${prog.activeBorder} shadow-md ring-2 ${prog.ringColor}`
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

      {/* Program Summary Banner */}
      <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center font-bold flex-shrink-0">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-[#111827] mb-1">
              {activeProgData.programName} Curriculum
            </h2>
            <p className="text-[13px] text-[#4b5563] leading-relaxed">
              {activeProgData.description}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border-2 border-[#e5e7eb] rounded-2xl p-5 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject code, title, prerequisite, or keyword..."
              className="w-full h-10 pl-9 pr-3 text-[13px] border-2 border-[#e5e7eb] rounded-xl bg-white text-[#111827] outline-none focus:border-[#ea580c] font-medium"
            />
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-bold text-[#ea580c] uppercase tracking-wide mr-1">Filter Year:</span>
            {[
              { key: "all", label: "All Years" },
              { key: "1", label: "1st Year" },
              { key: "2", label: "2nd Year" },
              ...(selectedProgram !== "ACT" ? [{ key: "3", label: "3rd Year" }, { key: "4", label: "4th Year" }] : [])
            ].map((y) => (
              <button
                key={y.key}
                onClick={() => setSelectedYear(y.key)}
                className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  selectedYear === y.key
                    ? "bg-[#ea580c] text-white shadow-sm"
                    : "bg-[#fafafa] text-[#4b5563] border border-[#e5e7eb] hover:border-[#ea580c]"
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Render Curriculum Grouped by Year and Semester */}
      {filteredCurriculum.length === 0 ? (
        <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-12 text-center text-[#6b7280]">
          <p className="text-[15px] font-semibold">No subject courses matched your search criteria.</p>
        </div>
      ) : (
        filteredCurriculum.map((yearGroup) => (
          <div key={yearGroup.year} className="mb-10">
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-3.5 h-3.5 rounded-full bg-[#ea580c]" />
              <h2 className="text-[19px] font-black text-[#111827]">{yearGroup.label} Subjects</h2>
            </div>

            <div className="flex flex-col gap-6">
              {yearGroup.semesters.map((semGroup) => {
                const semTotalUnits = semGroup.subjects.reduce((a, s) => a + s.units, 0);

                return (
                  <div key={semGroup.sem} className="bg-white border-2 border-[#e5e7eb] rounded-3xl overflow-hidden shadow-sm">
                    
                    {/* Semester Header */}
                    <div className="bg-[#fafafa] px-6 py-4 border-b-2 border-[#e5e7eb] flex items-center justify-between">
                      <h3 className="text-[16px] font-bold text-[#111827]">{semGroup.label}</h3>
                      <span className="text-[12px] font-bold bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5] px-3 py-1 rounded-full font-mono">
                        {semGroup.subjects.length} Courses · {semTotalUnits} Units
                      </span>
                    </div>

                    {/* Subjects Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#fafafa]/50 border-b border-[#e5e7eb]">
                            {["Code", "Course Title", "Units", "Lec / Lab", "Prerequisite", "Course Description"].map((h, i) => (
                              <th key={i} className={`px-6 py-3.5 text-[11px] font-bold text-[#6b7280] uppercase tracking-wide ${i === 2 || i === 3 ? "text-center" : "text-left"}`}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb]">
                          {semGroup.subjects.map((sub) => (
                            <tr key={sub.code} className="hover:bg-[#fff7ed]/30 transition-colors">
                              <td className="px-6 py-4 text-[13px] font-bold font-mono text-[#ea580c] whitespace-nowrap">
                                {sub.code}
                              </td>
                              <td className="px-6 py-4 text-[14px] font-bold text-[#111827]">
                                {sub.title}
                              </td>
                              <td className="px-6 py-4 text-[13px] font-bold text-[#111827] text-center">
                                {sub.units}
                              </td>
                              <td className="px-6 py-4 text-[12px] font-medium text-[#4b5563] text-center whitespace-nowrap">
                                {sub.lec}h Lec / {sub.lab}h Lab
                              </td>
                              <td className="px-6 py-4 text-[12px] font-semibold text-[#6b7280] whitespace-nowrap">
                                {sub.prereq === "None" ? (
                                  <span className="text-[#9ca3af] italic">None</span>
                                ) : (
                                  <span className="bg-gray-100 text-[#374151] px-2 py-0.5 rounded-md font-mono text-[11px]">
                                    {sub.prereq}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-[12px] text-[#4b5563] max-w-md leading-snug">
                                {sub.desc}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Secretary Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-[#e5e7eb] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#fff7ed] text-[#ea580c] flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="text-lg font-bold text-[#111827]">Add New Curriculum Subject</h3>
              </div>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                className="text-[#9ca3af] hover:text-[#111827] p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubjectSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Program</label>
                  <select
                    value={newSubForm.program}
                    onChange={(e) => setNewSubForm({ ...newSubForm, program: e.target.value })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                  >
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Year Level</label>
                  <select
                    value={newSubForm.year}
                    onChange={(e) => setNewSubForm({ ...newSubForm, year: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Semester</label>
                  <select
                    value={newSubForm.sem}
                    onChange={(e) => setNewSubForm({ ...newSubForm, sem: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                  >
                    <option value={1}>1st Sem</option>
                    <option value={2}>2nd Sem</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT 309"
                    value={newSubForm.code}
                    onChange={(e) => setNewSubForm({ ...newSubForm, code: e.target.value })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Prerequisite</label>
                  <input
                    type="text"
                    placeholder="e.g. IT 201 or None"
                    value={newSubForm.prereq}
                    onChange={(e) => setNewSubForm({ ...newSubForm, prereq: e.target.value })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Computing Infrastructure"
                  value={newSubForm.title}
                  onChange={(e) => setNewSubForm({ ...newSubForm, title: e.target.value })}
                  className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Units</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newSubForm.units}
                    onChange={(e) => setNewSubForm({ ...newSubForm, units: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Lec Hours</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={newSubForm.lec}
                    onChange={(e) => setNewSubForm({ ...newSubForm, lec: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Lab Hours</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={newSubForm.lab}
                    onChange={(e) => setNewSubForm({ ...newSubForm, lab: Number(e.target.value) })}
                    className="w-full h-9 px-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#6b7280] mb-1">Course Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide brief course syllabus overview..."
                  value={newSubForm.desc}
                  onChange={(e) => setNewSubForm({ ...newSubForm, desc: e.target.value })}
                  className="w-full p-3 text-[13px] border border-[#e5e7eb] rounded-xl bg-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 text-[13px] font-bold text-[#6b7280] hover:text-[#111827] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[13px] font-bold px-5 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Save size={15} />
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
