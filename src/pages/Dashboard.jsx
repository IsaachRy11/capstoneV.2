import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, XCircle, Clock, MinusCircle,
  ChevronRight, TrendingDown, Users, BarChart3,
  CheckCircle2, ArrowRight, X
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ─── Helpers ────────────────────────────────────────────────
function getCourseShort(course) {
  if (course.includes("Computer Science")) return "BSCS";
  if (course.includes("Information Technology")) return "BSIT";
  if (course.includes("Information Systems")) return "ACT";
  return "ACT";
}

function Avatar({ initials }) {
  const colors = [
    "bg-[#1f6feb] text-[#cae8ff]",
    "bg-[#1a7f37] text-[#dafbe1]",
    "bg-[#9e6a03] text-[#fff8c5]",
    "bg-[#6e40c9] text-[#ede8ff]",
  ];
  const idx = initials ? (initials.charCodeAt(0) * 7 + initials.charCodeAt(1)) % colors.length : 0;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

function detectType(concern) {
  const t = concern.toLowerCase();
  if (t.includes("prerequisite") || t.includes("prereq")) return "prereq";
  if (t.includes("fail")) return "failed";
  if (t.includes("incomplete")) return "incomplete";
  if (t.includes("drop")) return "dropped";
  return "risk";
}

const ISSUE_META = {
  prereq: { Icon: AlertTriangle, color: "text-[#9a6700]", bg: "bg-[#fff8c5]", border: "border-[#f0d070]", label: "Missing Prerequisite" },
  failed: { Icon: XCircle, color: "text-[#cf222e]", bg: "bg-[#ffebe9]", border: "border-[#ffb8b0]", label: "Failed Subject" },
  risk: { Icon: TrendingDown, color: "text-[#cf222e]", bg: "bg-[#ffebe9]", border: "border-[#ffb8b0]", label: "Low GWA" },
  incomplete: { Icon: Clock, color: "text-[#9a6700]", bg: "bg-[#fff8c5]", border: "border-[#f0d070]", label: "Incomplete Grade" },
  dropped: { Icon: MinusCircle, color: "text-[#57606a]", bg: "bg-[#f6f8fa]", border: "border-[#d0d7de]", label: "Dropped Subject" },
};

function MiniBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[#e8ecf0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-mono text-[#9198a1] min-w-[36px]">{pct}%</span>
    </div>
  );
}

function StatCard({ label, value, sub, context, valueColor, icon: Icon, iconBg, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 rounded-xl p-5 flex flex-col gap-1.5 transition-all duration-150
        ${onClick
          ? "border-[#d0d7de] cursor-pointer hover:border-[#1a7f37] hover:shadow-md group"
          : "border-[#d0d7de]"
        }`}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-[13px] font-semibold text-[#656d76] leading-snug pr-2">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`text-[36px] font-bold font-mono leading-none ${valueColor}`}>{value}</p>
      <p className="text-[13px] text-[#656d76] leading-snug">{sub}</p>
      {context && (
        <p className="text-[11px] text-[#9198a1] border-t border-[#e8ecf0] pt-2 mt-1 leading-snug">{context}</p>
      )}
      {onClick && (
        <div className="flex items-center gap-1 text-[12px] text-[#1a7f37] font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight size={13} /> Click to view students
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConcern, setSelectedConcern] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("students")
          .select(`
            id, name, avatar, course, yr, status, gwa,
            concerns(id, concern),
            semesters(id, subjects(id, status, prereq_flag))
          `);
        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived stats ──────────────────────────────────────────
  const total = students.length;
  const regular = students.filter(s => s.status === "Regular").length;
  const irregular = students.filter(s => s.status === "Irregular").length;
  const avgGwa = total
    ? +(students.reduce((sum, s) => sum + Number(s.gwa), 0) / total).toFixed(2)
    : 0;

  const topPerformers = students.filter(s => Number(s.gwa) <= 1.75).length;

  const allSubs = students.flatMap(s =>
    (s.semesters || []).flatMap(sem => sem.subjects || [])
  );

  const withFailed = students.filter(s =>
    (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.status === "Failed"))
  ).length;
  const withIncomplete = students.filter(s =>
    (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.status === "Incomplete"))
  ).length;
  const withDropped = students.filter(s =>
    (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.status === "Dropped"))
  ).length;
  const missingPrereq = students.filter(s =>
    (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.prereq_flag))
  ).length;
  const atRisk = students.filter(s => (s.concerns || []).length > 0).length;

  const getConcernStudents = (type) => {
    switch (type) {
      case "failed":
        return students.filter(s =>
          (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.status === "Failed"))
        );
      case "incomplete":
        return students.filter(s =>
          (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.status === "Incomplete"))
        );
      case "dropped":
        return students.filter(s =>
          (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.status === "Dropped"))
        );
      case "prereq":
        return students.filter(s =>
          (s.semesters || []).some(sem => (sem.subjects || []).some(sub => sub.prereq_flag))
        );
      case "irregular":
        return students.filter(s => s.status === "Irregular");
      default:
        return [];
    }
  };

  // ── Course distribution ────────────────────────────────────
  const courseMap = {};
  students.forEach(s => {
    const short = getCourseShort(s.course);
    if (!courseMap[short]) courseMap[short] = { label: s.course, short, count: 0 };
    courseMap[short].count++;
  });
  const COURSE_DIST = Object.values(courseMap).map(r => ({
    ...r,
    pct: Math.round((r.count / (total || 1)) * 100)
  }));

  // ── Year distribution ──────────────────────────────────────
  const yearLabels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const yearMap = { 1: 0, 2: 0, 3: 0, 4: 0 };
  students.forEach(s => { yearMap[s.yr] = (yearMap[s.yr] || 0) + 1; });
  const YEAR_DIST = [1, 2, 3, 4].map(yr => ({
    label: yearLabels[yr - 1],
    count: yearMap[yr] || 0,
    yr: yr
  }));

  // ── Flagged students ───────────────────────────────────────
  const FLAGGED = students
    .filter(s => (s.concerns || []).length > 0)
    .map(s => {
      const firstConcern = s.concerns[0].concern;
      return {
        id: s.id,
        name: s.name,
        course: getCourseShort(s.course),
        yr: yearLabels[s.yr - 1],
        type: detectType(firstConcern),
        issue: firstConcern,
      };
    });

  // ── Render ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center p-16 text-[#656d76] text-[14px]">
      Loading dashboard…
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center p-16 text-[#cf222e] text-[14px]">
      Error: {error}
    </div>
  );

  return (
    <div className="w-full pb-12">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-[#1f2328] tracking-tight mb-1">
          Monitoring Dashboard
        </h1>
        <p className="text-[15px] text-[#656d76]">
          College of Computer Studies · Saint Joseph College · Academic Year 2026–2027
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Enrolled CCS Students"
          value={total}
          sub={`${regular} Regular Students · ${irregular} Irregular Students`}
          context="Covers all students under BSCS, BSIT, and ACT programs"
          valueColor="text-[#1f2328]"
          icon={Users}
          iconBg="bg-[#f6f8fa] text-[#656d76]"
          onClick={() => navigate("/students")}
        />
        <StatCard
          label="Students with Academic Concerns"
          value={atRisk}
          sub="Flagged and require immediate adviser review"
          context="Includes students with failed subjects, missing prerequisites, low GWA, incomplete or dropped subjects"
          valueColor="text-[#cf222e]"
          icon={AlertTriangle}
          iconBg="bg-[#ffebe9] text-[#cf222e]"
          onClick={() => navigate("/students?filter=concerns")}
        />
        <StatCard
          label="Top Performing Students"
          value={topPerformers}
          sub="Students maintaining Excellent Academic Standing"
          context="Cumulative GWA of 1.75 or better · Candidates for Dean's List"
          valueColor="text-[#1a7f37]"
          icon={CheckCircle2}
          iconBg="bg-[#dafbe1] text-[#1a7f37]"
          onClick={() => navigate("/students?filter=top")}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-2 gap-5 mb-6">

        {/* Academic Concern Breakdown */}
        <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-5">
          <p className="text-[15px] font-bold text-[#1f2328] mb-1">
            Academic Concern Breakdown
          </p>
          <p className="text-[12px] text-[#9198a1] mb-4">
            Number of CCS students per type of academic concern — based on encoded records
          </p>
          <div className="flex flex-col gap-4">
            {[
              { label: "Failed a Subject", count: withFailed, total, color: "bg-[#cf222e]", type: "failed", desc: "Students with at least one subject graded 5.0 (Failed)" },
              { label: "Missing Prerequisite", count: missingPrereq, total, color: "bg-[#9a6700]", type: "prereq", desc: "Students enrolled in a subject without completing its prerequisite" },
              { label: "Irregular Status", count: irregular, total, color: "bg-[#0969da]", type: "irregular", desc: "Students with irregular academic status requiring monitoring" },
              { label: "Incomplete Grade", count: withIncomplete, total, color: "bg-[#e3a900]", type: "incomplete", desc: "Students with unresolved incomplete grades from a prior semester" },
              { label: "Dropped a Subject", count: withDropped, total, color: "bg-[#57606a]", type: "dropped", desc: "Students who dropped at least one subject this academic year" },
            ].map(r => (
              <div
                key={r.label}
                onClick={() => r.count > 0 && setSelectedConcern({ label: r.label, type: r.type, desc: r.desc })}
                className={`p-2 -mx-2 rounded-lg transition-colors ${r.count > 0 ? "cursor-pointer hover:bg-[#f6f8fa]" : "opacity-70"}`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <p className={`text-[14px] font-semibold ${r.count > 0 ? "text-[#0969da]" : "text-[#1f2328]"}`}>
                      {r.label} {r.count > 0 && <span className="text-[11px] font-normal underline ml-1">View list</span>}
                    </p>
                    <p className="text-[11px] text-[#9198a1]">{r.desc}</p>
                  </div>
                  <span className="text-[15px] font-bold font-mono text-[#1f2328] ml-4 flex-shrink-0">
                    {r.count}
                  </span>
                </div>
                <MiniBar value={r.count} max={r.total} color={r.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Enrollment Distribution */}
        <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-5">
          <p className="text-[15px] font-bold text-[#1f2328] mb-1">
            Student Population by Academic Program and Year Level
          </p>
          <p className="text-[12px] text-[#9198a1] mb-4">
            Distribution of all {total} enrolled CCS students — AY 2026–2027
          </p>

          <p className="text-[11px] font-bold text-[#656d76] uppercase tracking-wider mb-3">
            By Academic Program
          </p>
          <div className="flex flex-col gap-3 mb-5">
            {COURSE_DIST.map(r => (
              <div key={r.short} className="flex items-center gap-3">
                <span className="text-[12px] font-mono font-bold text-[#656d76] w-11 flex-shrink-0">{r.short}</span>
                <span className="text-[13px] text-[#1f2328] flex-1">{r.label}</span>
                <span className="text-[13px] font-bold font-mono text-[#1f2328] w-8 text-right flex-shrink-0">{r.count}</span>
                <div className="w-24 h-2 bg-[#e8ecf0] rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full bg-[#2da44e] rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] font-bold text-[#656d76] uppercase tracking-wider mb-3">
            By Year Level
          </p>
          <div className="grid grid-cols-4 gap-2">
            {YEAR_DIST.map(r => (
              <div
                key={r.label}
                onClick={() => navigate(`/students?year=${r.yr}`)}
                className="bg-[#f6f8fa] border-2 border-[#d0d7de] rounded-lg p-3 text-center cursor-pointer hover:border-[#1a7f37] hover:bg-[#dafbe1] transition-all group"
              >
                <p className="text-[22px] font-bold text-[#1f2328] font-mono">{r.count}</p>
                <p className="text-[11px] text-[#656d76] mt-1 group-hover:text-[#1a7f37]">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flagged Students */}
      <div className="bg-white border-2 border-[#d0d7de] rounded-xl overflow-hidden">

        {/* Table header */}
        <div className="px-5 py-4 border-b border-[#d0d7de] bg-[#fffbeb]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={18} className="text-[#cf222e] flex-shrink-0" />
                <p className="text-[16px] font-bold text-[#1f2328]">
                  Students Flagged for Academic Concerns
                </p>
                <span className="text-[11px] font-bold bg-[#ffebe9] text-[#cf222e] border border-[#ffb8b0] rounded-full px-2.5 py-0.5 flex-shrink-0">
                  {FLAGGED.length} shown · {atRisk} total flagged
                </span>
              </div>
              <p className="text-[13px] text-[#656d76] ml-7">
                These students were automatically flagged by the system based on their encoded academic records.
                Click any row to open the student's full academic record.
              </p>
            </div>
            <button
              onClick={() => navigate("/students?filter=concerns")}
              className="flex items-center gap-2 bg-[#1a7f37] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#166d30] transition-colors flex-shrink-0"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_3fr_auto] gap-0 bg-[#f6f8fa] border-b border-[#d0d7de]">
          {["Student Name", "Student ID", "Program", "Year Level", "Academic Concern", ""].map((h, i) => (
            <div key={i} className="px-4 py-3 text-[11px] font-bold text-[#656d76] uppercase tracking-wide">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {FLAGGED.length === 0 ? (
          <div className="px-5 py-8 text-center text-[#656d76] text-[14px]">
            No students flagged for academic concerns.
          </div>
        ) : (
          FLAGGED.map((f, i) => {
            const m = ISSUE_META[f.type];
            const Icon = m.Icon;
            return (
              <div
                key={f.id}
                onClick={() => navigate(`/students/${f.id}`)}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_3fr_auto] gap-0 items-center cursor-pointer
                  hover:bg-[#f6f8fa] transition-colors group
                  ${i < FLAGGED.length - 1 ? "border-b border-[#e8ecf0]" : ""}`}
              >
                <div className="px-4 py-4">
                  <p className="text-[15px] font-bold text-[#1f2328] group-hover:text-[#1a7f37] transition-colors">{f.name}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[13px] font-mono text-[#656d76]">{f.id}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[13px] text-[#656d76]">{f.course}</p>
                </div>
                <div className="px-4 py-4">
                  <p className="text-[13px] text-[#656d76]">{f.yr}</p>
                </div>
                <div className="px-4 py-4">
                  <div className={`inline-flex items-center gap-2 text-[13px] font-medium ${m.color} ${m.bg} border ${m.border} rounded-lg px-3 py-1.5`}>
                    <Icon size={14} className="flex-shrink-0" />
                    <span><span className="font-bold">{m.label}:</span> {f.issue}</span>
                  </div>
                </div>
                <div className="px-4 py-4 flex items-center gap-1 text-[#1a7f37] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[12px] font-semibold whitespace-nowrap">Open Record</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            );
          })
        )}

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-[#e8ecf0] bg-[#f6f8fa]">
          <p className="text-[12px] text-[#9198a1]">
            <span className="font-semibold">Note:</span> Click on any student row above to open their complete academic record and semester-by-semester subject history.
          </p>
        </div>
      </div>

      {/* Concern Modal */}
      {selectedConcern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2328]/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="px-5 py-4 border-b border-[#d0d7de] flex justify-between items-center bg-[#f6f8fa]">
              <div>
                <h3 className="text-[16px] font-bold text-[#1f2328]">{selectedConcern.label}</h3>
                <p className="text-[12px] text-[#656d76] mt-0.5">{selectedConcern.desc}</p>
              </div>
              <button
                onClick={() => setSelectedConcern(null)}
                className="p-1.5 text-[#656d76] hover:bg-[#d0d7de] rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {getConcernStudents(selectedConcern.type).map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/students/${s.id}`)}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-[#f6f8fa] cursor-pointer rounded-lg transition-colors border-b border-[#e8ecf0] last:border-0 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar initials={s.avatar} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-[#1f2328] truncate group-hover:text-[#0969da] transition-colors">{s.name}</p>
                      <p className="text-[12px] text-[#656d76] truncate">{s.id} · {getCourseShort(s.course)} · {yearLabels[s.yr - 1]}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#9198a1] group-hover:text-[#0969da]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}