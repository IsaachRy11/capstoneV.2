import { AlertTriangle, CheckCircle2, XCircle, Clock, MinusCircle, ChevronRight, TrendingDown } from "lucide-react";

const STATS = {
  total: 300,
  regular: 214,
  irregular: 86,
  atRisk: 47,
  missingPrereq: 31,
  withFailed: 58,
  withIncomplete: 22,
  withDropped: 41,
  avgGwa: 2.34,
  passRate: 87.2,
};

const FLAGGED = [
  { id: "2021-0045", name: "Juan dela Cruz",  course: "BSIT", yr: "3rd", issue: "Missing prerequisite · CC121 → CC304",   type: "prereq"     },
  { id: "2020-0112", name: "Roberto Lim",     course: "BSIS", yr: "4th", issue: "2 failed subjects pending retake",        type: "failed"     },
  { id: "2021-0078", name: "Carlo Estrada",   course: "BSCS", yr: "3rd", issue: "GWA 3.25 — academic probation threshold", type: "risk"       },
  { id: "2022-0201", name: "Liza Montaño",    course: "BSIT", yr: "2nd", issue: "Incomplete in 3 subjects · AY 2025–26",  type: "incomplete" },
  { id: "2021-0133", name: "Mark Dela Torre", course: "BSCS", yr: "3rd", issue: "Dropped 2 subjects · missing units",     type: "dropped"    },
  { id: "2023-0019", name: "Nina Cabildo",    course: "BSIS", yr: "1st", issue: "Failed Math101 · retake needed",         type: "failed"     },
];

const ISSUE_META = {
  prereq:     { Icon: AlertTriangle, color: "text-[#9a6700]", bg: "bg-[#fff8c5]", border: "border-[#f0d070]" },
  failed:     { Icon: XCircle,       color: "text-[#cf222e]", bg: "bg-[#ffebe9]", border: "border-[#ffb8b0]" },
  risk:       { Icon: TrendingDown,  color: "text-[#cf222e]", bg: "bg-[#ffebe9]", border: "border-[#ffb8b0]" },
  incomplete: { Icon: Clock,         color: "text-[#9a6700]", bg: "bg-[#fff8c5]", border: "border-[#f0d070]" },
  dropped:    { Icon: MinusCircle,   color: "text-[#57606a]", bg: "bg-[#f6f8fa]", border: "border-[#d0d7de]" },
};

const COURSE_DIST = [
  { label: "BS Computer Science",       count: 112, pct: 37 },
  { label: "BS Information Technology", count: 118, pct: 39 },
  { label: "BS Information Systems",    count: 70,  pct: 23 },
];

const YEAR_DIST = [
  { label: "1st Year", count: 84 },
  { label: "2nd Year", count: 78 },
  { label: "3rd Year", count: 91 },
  { label: "4th Year", count: 47 },
];

function StatCard({ label, value, sub, valueColor }) {
  return (
    <div className="bg-white border border-[#d0d7de] rounded-lg p-4">
      <p className="text-[11px] font-medium text-[#656d76] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-[26px] font-bold font-mono leading-none mb-1 ${valueColor}`}>{value}</p>
      <p className="text-[11px] text-[#9198a1]">{sub}</p>
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#e8ecf0] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-[#9198a1] min-w-[30px]">{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="max-w-5xl pb-12">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1f2328] tracking-tight mb-1">Overview</h1>
        <p className="text-sm text-[#656d76]">Saint Joseph College · CCS · AY 2026–2027</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Students"    value={STATS.total}               sub={`${STATS.regular} regular · ${STATS.irregular} irregular`} valueColor="text-[#1f2328]" />
        <StatCard label="Needing Attention" value={STATS.atRisk}              sub="GWA ≥ 3.0 or flagged"      valueColor="text-[#cf222e]" />
        <StatCard label="Pass Rate"         value={`${STATS.passRate}%`}      sub="All subjects this AY"      valueColor="text-[#1a7f37]" />
        <StatCard label="Population GWA"    value={STATS.avgGwa.toFixed(2)}   sub="Average across 300 students" valueColor="text-[#0969da]" />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-2 gap-4 mb-5">

        {/* Subject Status */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-4">
          <p className="text-[11px] font-bold text-[#1f2328] uppercase tracking-wide mb-4">Subject Status · All Students</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "Passed",     count: Math.round(STATS.total * 5 * 0.872), total: STATS.total * 5, color: "bg-[#1a7f37]" },
              { label: "Failed",     count: STATS.withFailed,                    total: STATS.total,     color: "bg-[#cf222e]" },
              { label: "Incomplete", count: STATS.withIncomplete,                total: STATS.total,     color: "bg-[#9a6700]" },
              { label: "Dropped",    count: STATS.withDropped,                   total: STATS.total,     color: "bg-[#57606a]" },
            ].map(r => (
              <div key={r.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-[#1f2328]">{r.label}</span>
                  <span className="text-[11px] font-mono text-[#656d76]">{r.count.toLocaleString()}</span>
                </div>
                <MiniBar value={r.count} max={r.total} color={r.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Enrollment Distribution */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-4">
          <p className="text-[11px] font-bold text-[#1f2328] uppercase tracking-wide mb-4">Enrollment Distribution</p>

          <p className="text-[10px] font-semibold text-[#9198a1] uppercase tracking-wider mb-2">By Course</p>
          <div className="flex flex-col gap-2 mb-4">
            {COURSE_DIST.map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-[12px] text-[#1f2328] flex-1 truncate">{r.label}</span>
                <span className="text-[11px] font-mono text-[#656d76] min-w-[26px] text-right">{r.count}</span>
                <div className="w-20 h-1.5 bg-[#e8ecf0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2da44e] rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-semibold text-[#9198a1] uppercase tracking-wider mb-2">By Year Level</p>
          <div className="flex gap-2">
            {YEAR_DIST.map(r => (
              <div key={r.label} className="flex-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md p-2 text-center">
                <p className="text-[17px] font-bold text-[#1f2328] font-mono">{r.count}</p>
                <p className="text-[9px] text-[#656d76] mt-0.5">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flagged Students Table */}
      <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d0d7de] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#cf222e]" />
            <span className="text-[13px] font-bold text-[#1f2328]">Students Requiring Attention</span>
            <span className="text-[10px] font-bold bg-[#ffebe9] text-[#cf222e] border border-[#ffb8b0] rounded-full px-2 py-0.5">
              {FLAGGED.length} shown · {STATS.atRisk} total
            </span>
          </div>
          <button className="text-[12px] text-[#1a7f37] border border-[#d0d7de] rounded-md px-2.5 py-1 flex items-center gap-1 hover:bg-[#f6f8fa] transition-colors">
            View all <ChevronRight size={11} />
          </button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f6f8fa]">
              {["Student", "ID", "Course", "Yr", "Issue", ""].map((h, i) => (
                <th key={i} className="px-4 py-2 text-[10px] font-semibold text-[#656d76] text-left border-b border-[#d0d7de] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FLAGGED.map((f, i) => {
              const m = ISSUE_META[f.type];
              const Icon = m.Icon;
              return (
                <tr key={f.id}
                  className={`hover:bg-[#f6f8fa] cursor-pointer transition-colors ${i < FLAGGED.length - 1 ? "border-b border-[#d0d7de]" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className="text-[13px] font-semibold text-[#1f2328]">{f.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] font-mono text-[#656d76]">{f.id}</td>
                  <td className="px-4 py-2.5 text-[12px] text-[#656d76]">{f.course}</td>
                  <td className="px-4 py-2.5 text-[12px] text-[#656d76]">{f.yr}</td>
                  <td className="px-4 py-2.5">
                    <div className={`flex items-center gap-1.5 text-[12px] ${m.color} ${m.bg} border ${m.border} rounded-md px-2 py-1 w-fit`}>
                      <Icon size={11} />
                      {f.issue}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <ChevronRight size={13} className="text-[#9198a1]" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}