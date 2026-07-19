import { useState, useMemo } from "react";
import { Search, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STUDENTS = [
  { id:"2021-0001", name:"Maria Santos",     avatar:"MS", course:"BS Computer Science",        yr:3, status:"Regular",   gwa:1.75, alerts:1 },
  { id:"2021-0045", name:"Juan dela Cruz",   avatar:"JC", course:"BS Information Technology",  yr:3, status:"Irregular", gwa:2.45, alerts:2 },
  { id:"2022-0078", name:"Ana Reyes",        avatar:"AR", course:"BS Computer Science",        yr:2, status:"Regular",   gwa:1.38, alerts:0 },
  { id:"2020-0112", name:"Roberto Lim",      avatar:"RL", course:"BS Information Systems",     yr:4, status:"Irregular", gwa:2.88, alerts:2 },
  { id:"2022-0145", name:"Patricia Navarro", avatar:"PN", course:"BS Information Technology",  yr:2, status:"Regular",   gwa:2.20, alerts:0 },
  { id:"2023-0088", name:"Kevin Torralba",   avatar:"KT", course:"BS Computer Science",        yr:1, status:"Regular",   gwa:1.88, alerts:0 },
  { id:"2021-0078", name:"Carlo Estrada",    avatar:"CE", course:"BS Computer Science",        yr:3, status:"Irregular", gwa:3.25, alerts:1 },
  { id:"2022-0201", name:"Liza Montaño",     avatar:"LM", course:"BS Information Technology",  yr:2, status:"Irregular", gwa:2.75, alerts:1 },
];

const YEAR_LABELS = ["1st", "2nd", "3rd", "4th"];

function gwaColor(g) {
  if (g <= 1.75) return "text-[#1a7f37]";
  if (g <= 2.50) return "text-[#0969da]";
  if (g <= 3.00) return "text-[#9a6700]";
  return "text-[#cf222e]";
}

function gwaBg(g) {
  if (g <= 1.75) return "bg-[#dafbe1] border-[#a4e8b4]";
  if (g <= 2.50) return "bg-[#ddf4ff] border-[#aecbfa]";
  if (g <= 3.00) return "bg-[#fff8c5] border-[#f0d070]";
  return "bg-[#ffebe9] border-[#ffb8b0]";
}

function Avatar({ initials }) {
  const colors = [
    "bg-[#1f6feb] text-[#cae8ff]",
    "bg-[#1a7f37] text-[#dafbe1]",
    "bg-[#9e6a03] text-[#fff8c5]",
    "bg-[#6e40c9] text-[#ede8ff]",
  ];
  const idx = (initials.charCodeAt(0) * 7 + initials.charCodeAt(1)) % colors.length;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

export default function Students() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [yr, setYr] = useState("all");
  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => STUDENTS.filter(s => {
    const mq = !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.id.includes(q) || s.course.toLowerCase().includes(q.toLowerCase());
    const my = yr === "all" || String(s.yr) === yr;
    const mc = course === "all" || s.course.includes(course);
    const ms = status === "all" || s.status === status;
    return mq && my && mc && ms;
  }), [q, yr, course, status]);

  const selectClass = "h-8 px-2.5 text-[12px] border border-[#d0d7de] rounded-md bg-white text-[#1f2328] cursor-pointer outline-none focus:border-[#1a7f37]";

  return (
    <div className="max-w-5xl pb-12">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1f2328] tracking-tight mb-1">Students</h1>
        <p className="text-sm text-[#656d76]">{STUDENTS.length} records displayed · 300 total enrolled</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#656d76]" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, ID, course…"
            className="w-full h-8 pl-8 pr-3 text-[12px] border border-[#d0d7de] rounded-md bg-white text-[#1f2328] outline-none focus:border-[#1a7f37]"
          />
        </div>
        <select value={yr} onChange={e => setYr(e.target.value)} className={selectClass}>
          <option value="all">All Years</option>
          {[1,2,3,4].map(y => <option key={y} value={y}>{YEAR_LABELS[y-1]} Year</option>)}
        </select>
        <select value={course} onChange={e => setCourse(e.target.value)} className={selectClass}>
          <option value="all">All Courses</option>
          <option value="Computer Science">BSCS</option>
          <option value="Information Technology">BSIT</option>
          <option value="Information Systems">BSIS</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
          <option value="all">All Status</option>
          <option value="Regular">Regular</option>
          <option value="Irregular">Irregular</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f6f8fa]">
              {["Student", "Student ID", "Course", "Year", "Enrollment", "GWA", "Alerts", ""].map((h, i) => (
                <th key={i} className="px-4 py-2 text-[10px] font-semibold text-[#656d76] text-left border-b border-[#d0d7de] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-[#656d76]">
                  No students match your filters.
                </td>
              </tr>
            ) : filtered.map((s, i) => (
              <tr
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className={`hover:bg-[#f6f8fa] cursor-pointer transition-colors ${i < filtered.length - 1 ? "border-b border-[#d0d7de]" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar initials={s.avatar} />
                    <span className="text-[13px] font-semibold text-[#1f2328]">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[11px] font-mono text-[#656d76]">{s.id}</td>
                <td className="px-4 py-2.5 text-[12px] text-[#656d76]">{s.course}</td>
                <td className="px-4 py-2.5 text-[12px] text-[#656d76]">{YEAR_LABELS[s.yr - 1]} Year</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${s.status === "Regular" ? "bg-[#dafbe1] text-[#1a7f37] border-[#a4e8b4]" : "bg-[#fff8c5] text-[#9a6700] border-[#f0d070]"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[12px] font-bold font-mono px-2 py-0.5 rounded-md border ${gwaColor(s.gwa)} ${gwaBg(s.gwa)}`}>
                    {s.gwa.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {s.alerts > 0
                    ? <span className="flex items-center gap-1 text-[12px] font-semibold text-[#cf222e]"><AlertTriangle size={11} />{s.alerts}</span>
                    : <span className="flex items-center gap-1 text-[11px] text-[#9198a1]"><CheckCircle2 size={11} />—</span>
                  }
                </td>
                <td className="px-4 py-2.5"><ChevronRight size={13} className="text-[#9198a1]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}