import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, XCircle,
  Clock, MinusCircle, AlertTriangle
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── Config & Helpers ─────────────────────────────────────────

const STATUS_CFG = {
  Passed:     { Icon:CheckCircle2, color:"text-[#1a7f37]", bg:"bg-[#dafbe1]", border:"border-[#a4e8b4]" },
  Failed:     { Icon:XCircle,      color:"text-[#cf222e]", bg:"bg-[#ffebe9]", border:"border-[#ffb8b0]" },
  Dropped:    { Icon:MinusCircle,  color:"text-[#57606a]", bg:"bg-[#f6f8fa]", border:"border-[#d0d7de]" },
  Incomplete: { Icon:Clock,        color:"text-[#9a6700]", bg:"bg-[#fff8c5]", border:"border-[#f0d070]" },
};

function gwaColor(g) {
  if (g <= 1.75) return "text-[#1a7f37]";
  if (g <= 2.50) return "text-[#0969da]";
  if (g <= 3.00) return "text-[#9a6700]";
  return "text-[#cf222e]";
}

function gwaLabel(g) {
  if (g <= 1.75) return "Excellent Standing";
  if (g <= 2.50) return "Good Standing";
  if (g <= 3.00) return "Satisfactory Standing";
  return "Below Passing Threshold";
}

function gwaBg(g) {
  if (g <= 1.75) return "bg-[#dafbe1] border-[#a4e8b4]";
  if (g <= 2.50) return "bg-[#ddf4ff] border-[#aecbfa]";
  if (g <= 3.00) return "bg-[#fff8c5] border-[#f0d070]";
  return "bg-[#ffebe9] border-[#ffb8b0]";
}

function Avatar({ initials, size = "w-12 h-12", text = "text-[14px]" }) {
  const colors = [
    "bg-[#1f6feb] text-[#cae8ff]",
    "bg-[#1a7f37] text-[#dafbe1]",
    "bg-[#9e6a03] text-[#fff8c5]",
    "bg-[#6e40c9] text-[#ede8ff]",
  ];
  const idx = initials
    ? (initials.charCodeAt(0) * 7 + (initials.charCodeAt(1) || 0)) % colors.length
    : 0;
  return (
    <div className={`${size} rounded-full flex items-center justify-center ${text} font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}


export default function StudentRecord() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filterSY, setFilterSY] = useState("");
  const [filterSem, setFilterSem] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("students")
          .select(`
            id, name, avatar, course, yr, status, gwa,
            concerns(concern),
            semesters(id, label, school_year, gwa,
              subjects(code, title, units, midterm_grade, final_grade, status, prerequisite, prereq_flag, prereq_note)
            )
          `)
          .eq("id", id)
          .single();
        if (error) throw error;

        const sortedSemesters = (data.semesters || []).sort((a, b) => {
          if (a.school_year !== b.school_year) return b.school_year.localeCompare(a.school_year);
          return b.label.localeCompare(a.label);
        });

        const formatted = {
          ...data,
          gwa: Number(data.gwa),
          concerns: (data.concerns || []).map(c => c.concern),
          semesters: sortedSemesters.map(sem => ({
            ...sem,
            gwa: Number(sem.gwa),
            subjects: (sem.subjects || []).map(sub => {
              // Dynamically compute status from grade
              let dynamicStatus = sub.status;
              if (sub.final_grade !== null && sub.final_grade !== undefined) {
                const g = Number(sub.final_grade);
                if (g >= 1.0 && g <= 3.0) dynamicStatus = "Passed";
                else if (g > 3.0) dynamicStatus = "Failed"; // 4.0 or 5.0
              }

              return {
                code: sub.code,
                title: sub.title,
                u: sub.units,
                mid: sub.midterm_grade,
                g: sub.final_grade,
                s: dynamicStatus,
                pre: sub.prerequisite,
                preFlag: sub.prereq_flag,
                preNote: sub.prereq_note
              };
            })
          }))
        };

        setStudent(formatted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) return (
    <div className="p-10 text-center">
      <p className="text-[16px] text-[#656d76] mb-4">Loading student record…</p>
    </div>
  );

  if (error || !student) return (
    <div className="p-10 text-center">
      <p className="text-[16px] text-[#656d76] mb-4">Student record not found. ({error})</p>
      <button
        onClick={() => navigate("/students")}
        className="bg-[#1a7f37] text-white px-5 py-2.5 rounded-lg font-semibold text-[14px] hover:bg-[#166d30] transition-colors"
      >
        Return to Students
      </button>
    </div>
  );

  const allSubjects  = student.semesters.flatMap(s => s.subjects);
  const passed       = allSubjects.filter(s => s.s === "Passed").length;
  const failed       = allSubjects.filter(s => s.s === "Failed").length;
  const dropped      = allSubjects.filter(s => s.s === "Dropped").length;
  const incomplete   = allSubjects.filter(s => s.s === "Incomplete").length;
  const totalUnits   = allSubjects.filter(s => s.s === "Passed").reduce((a, s) => a + s.u, 0);
  const pct          = Math.round((passed / (allSubjects.length || 1)) * 100);

  const uniqueSY = [...new Set(student.semesters.map(s => s.school_year))];
  const uniqueSem = ["1st Semester", "2nd Semester", "Summer"];

  return (
    <div className="w-full pb-12">

      {/* Back */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-2 text-[14px] text-[#656d76] hover:text-[#1f2328] mb-6 transition-colors font-medium"
      >
        <ArrowLeft size={16} /> Back to Students
      </button>

      {/* Profile Card */}
      <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-6 mb-5">

        {/* Top row */}
        <div className="flex items-start gap-4 mb-5">
          <Avatar initials={student.avatar} />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-[22px] font-bold text-[#1f2328] tracking-tight">{student.name}</h1>
              <span className={`text-[12px] font-bold px-3 py-1 rounded-lg border-2
                ${student.status === "Regular"
                  ? "bg-[#dafbe1] text-[#1a7f37] border-[#a4e8b4]"
                  : "bg-[#fff8c5] text-[#9a6700] border-[#f0d070]"}`}>
                {student.status}
              </span>
            </div>
            <p className="text-[14px] text-[#656d76]">
              {student.course} &nbsp;·&nbsp;
              {["1st","2nd","3rd","4th"][student.yr - 1]} Year &nbsp;·&nbsp;
              <span className="font-mono">{student.id}</span>
            </p>
          </div>
        </div>

        {/* Curriculum Progress */}
        <div className="mb-5">
          <div className="flex justify-between mb-2">
            <span className="text-[13px] font-bold text-[#656d76] uppercase tracking-wide">
              Curriculum Completion
            </span>
            <span className="text-[13px] font-mono text-[#656d76]">
              {passed} of {allSubjects.length} subjects completed · {totalUnits} units earned
            </span>
          </div>
          <div className="h-3 bg-[#e8ecf0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2da44e] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[12px] text-[#9198a1] mt-1.5">
            {pct}% of total curriculum subjects completed based on encoded academic records
          </p>
        </div>

        {/* Subject tally */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label:"Passed",     count:passed,     cfg:STATUS_CFG.Passed     },
            { label:"Failed",     count:failed,     cfg:STATUS_CFG.Failed     },
            { label:"Dropped",    count:dropped,    cfg:STATUS_CFG.Dropped    },
            { label:"Incomplete", count:incomplete, cfg:STATUS_CFG.Incomplete },
          ].map(item => (
            <div key={item.label} className={`${item.cfg.bg} border-2 ${item.cfg.border} rounded-xl p-4 text-center`}>
              <p className={`text-[28px] font-bold font-mono ${item.cfg.color}`}>{item.count}</p>
              <p className={`text-[12px] font-semibold mt-1 ${item.cfg.color}`}>{item.label}</p>
              <p className="text-[10px] text-[#9198a1] mt-0.5">subject{item.count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>

        {/* Academic Concerns */}
        {student.concerns.length > 0 && (
          <div className="border-2 border-[#ffb8b0] rounded-xl overflow-hidden">
            <div className="bg-[#ffebe9] px-4 py-3 border-b border-[#ffb8b0] flex items-center gap-2">
              <AlertTriangle size={15} className="text-[#cf222e] flex-shrink-0" />
              <p className="text-[13px] font-bold text-[#cf222e]">
                Academic Concerns — {student.concerns.length} item{student.concerns.length > 1 ? "s" : ""} noted
              </p>
            </div>
            <div className="divide-y divide-[#ffb8b0]">
              {student.concerns.map((c, i) => (
                <div key={i} className="px-4 py-3 bg-white">
                  <p className="text-[14px] text-[#1f2328] leading-relaxed">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Semester Records */}
      <div className="mb-4">
        <h2 className="text-[17px] font-bold text-[#1f2328] mb-1">Semester-by-Semester Academic Record</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-[13px] text-[#656d76]">
            Complete subject history from enrollment to present · GWA is computed per semester based on: sum of (grade × units) ÷ total units
          </p>
          {student.semesters.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={filterSY}
                onChange={(e) => setFilterSY(e.target.value)}
                className={`h-9 px-3 text-[13px] border-2 border-[#d0d7de] rounded-lg bg-white cursor-pointer outline-none focus:border-[#1a7f37] font-semibold ${!filterSY ? "text-[#9198a1]" : "text-[#1f2328]"}`}
              >
                <option value="" disabled hidden>School Year</option>
                <option value="all">All School Years</option>
                {uniqueSY.map(sy => (
                  <option key={sy} value={sy}>SY {sy}</option>
                ))}
              </select>

              <select
                value={filterSem}
                onChange={(e) => setFilterSem(e.target.value)}
                className={`h-9 px-3 text-[13px] border-2 border-[#d0d7de] rounded-lg bg-white cursor-pointer outline-none focus:border-[#1a7f37] font-semibold ${!filterSem ? "text-[#9198a1]" : "text-[#1f2328]"}`}
              >
                <option value="" disabled hidden>Semester</option>
                <option value="all">All Semesters</option>
                {uniqueSem.map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {student.semesters
          .filter(sem => {
            const matchSY = !filterSY || filterSY === "all" || sem.school_year === filterSY;
            const matchSem = !filterSem || filterSem === "all" || sem.label.includes(filterSem);
            return matchSY && matchSem;
          })
          .map((sem, si) => (
          <div key={si} className="bg-white border-2 border-[#d0d7de] rounded-xl overflow-hidden mb-4">
            {/* Semester header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#f6f8fa] border-b-2 border-[#d0d7de]">
              <div>
                <p className="text-[14px] font-bold text-[#1f2328]">{sem.label}</p>
                <p className="text-[12px] text-[#9198a1]">Academic Year {sem.school_year}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg border-2 ${gwaBg(sem.gwa)} text-center`}>
                <p className={`text-[15px] font-bold font-mono ${gwaColor(sem.gwa)}`}>
                  {sem.gwa.toFixed(2)}
                </p>
                <p className={`text-[10px] font-semibold ${gwaColor(sem.gwa)}`}>
                  Semester GWA
                </p>
              </div>
            </div>

          {/* Subject table */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#e8ecf0]">
                {["Subject Code","Subject Title","Units","Midterm","Finals","Status"].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[11px] font-bold text-[#656d76] uppercase tracking-wide ${i >= 2 ? "text-center" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sem.subjects.map((subj, j) => {
                const cfg  = STATUS_CFG[subj.s] || STATUS_CFG.Dropped;
                const Icon = cfg.Icon;
                return (
                  <tr
                    key={j}
                    className={`hover:bg-[#f6f8fa] transition-colors ${j < sem.subjects.length - 1 ? "border-b border-[#e8ecf0]" : ""}`}
                  >
                    {/* Code */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono font-semibold text-[#656d76]">{subj.code}</span>
                        {subj.preFlag && (
                          <span className="text-[10px] font-bold bg-[#ffebe9] text-[#cf222e] border border-[#ffb8b0] rounded px-1.5 py-0.5">
                            PREREQ NOT MET
                          </span>
                        )}
                      </div>
                      {subj.pre && !subj.preFlag && (
                        <p className="text-[10px] text-[#9198a1] mt-0.5">Prerequisite: {subj.pre}</p>
                      )}
                    </td>

                    {/* Title */}
                    <td className="px-5 py-3">
                      <p className="text-[14px] text-[#1f2328] font-medium">{subj.title}</p>
                      {subj.preNote && (
                        <p className="text-[11px] text-[#cf222e] mt-0.5 font-medium">{subj.preNote}</p>
                      )}
                    </td>

                    {/* Units */}
                    <td className="px-5 py-3 text-center text-[14px] text-[#656d76]">{subj.u}</td>

                    {/* Midterm Grade */}
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[15px] font-bold font-mono
                        ${subj.mid === 5.0 ? "text-[#cf222e]"
                          : subj.mid ? cfg.color
                          : "text-[#9198a1]"}`}>
                        {subj.mid === 5.0 ? "5.00"
                          : subj.mid ? subj.mid.toFixed(2)
                          : "—"}
                      </span>
                    </td>

                    {/* Final Grade */}
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[15px] font-bold font-mono
                        ${subj.g === 5.0 ? "text-[#cf222e]"
                          : subj.g ? cfg.color
                          : "text-[#9198a1]"}`}>
                        {subj.g === 5.0 ? "5.00"
                          : subj.g ? subj.g.toFixed(2)
                          : "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold
                        px-3 py-1.5 rounded-lg border-2 ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        <Icon size={13} />
                        {subj.s}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* GWA formula note */}
          <div className="px-5 py-2.5 border-t border-[#e8ecf0] bg-[#f6f8fa]">
            <p className="text-[11px] text-[#9198a1]">
              Semester GWA computed as: sum of (Final Grade × Units) ÷ Total Units for this semester
            </p>
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}