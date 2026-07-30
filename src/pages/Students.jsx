import { useEffect, useState, useMemo } from "react";
import { Search, AlertTriangle, CheckCircle2, ArrowRight, X } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const YEAR_LABELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

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
  const idx = initials ? (initials.charCodeAt(0) * 7 + initials.charCodeAt(1)) % colors.length : 0;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

export default function Students() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initAlert  = searchParams.get("filter") === "concerns" ? "yes" : (searchParams.get("filter") === "top" ? "top" : "");
  const initYear   = searchParams.get("year") || "";
  const initCourse = searchParams.get("course") || "";

  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [q,        setQ]        = useState("");
  const [yr,       setYr]       = useState(initYear);
  const [course,   setCourse]   = useState(initCourse);
  const [status,   setStatus]   = useState("");
  const [hasAlert, setHasAlert] = useState(initAlert);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, name, avatar, course, yr, status, gwa, concerns(id)")
          .order("name");
        if (error) throw error;
        const formatted = (data || []).map(s => ({
          ...s,
          gwa: Number(s.gwa),
          alerts: (s.concerns || []).length
        }));
        setStudents(formatted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasActiveFilter = q || (yr && yr !== "all") || (course && course !== "all") || (status && status !== "all") || (hasAlert && hasAlert !== "all");

  function clearAll() {
    setQ(""); setYr(""); setCourse(""); setStatus(""); setHasAlert("");
    setSearchParams({}); // Clear query string if present
  }

  const filtered = useMemo(() => students.filter(s => {
    const mq = !q        || s.name.toLowerCase().includes(q.toLowerCase()) || s.id.includes(q) || s.course.toLowerCase().includes(q.toLowerCase());
    const my = !yr       || yr === "all"       || String(s.yr) === yr;
    const mc = !course   || course === "all"   || s.course === course;
    const ms = !status   || status === "all"   || s.status === status;
    const ma = !hasAlert || hasAlert === "all" || (hasAlert === "yes" ? s.alerts > 0 : (hasAlert === "no" ? s.alerts === 0 : (hasAlert === "top" ? s.gwa <= 1.75 : true)));
    return mq && my && mc && ms && ma;
  }), [students, q, yr, course, status, hasAlert]);

  const sel = `h-10 px-3 text-[14px] border-2 border-[#d0d7de] rounded-lg bg-white
    cursor-pointer outline-none focus:border-[#1a7f37] font-medium`;

  return (
    <div className="w-full pb-12">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1f2328] tracking-tight mb-1">Students</h1>
        <p className="text-[15px] text-[#656d76]">
          {!loading ? `${filtered.length} of ${students.length} records shown` : "Loading records..."} · Complete student registry
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-2 border-[#d0d7de] rounded-xl p-4 mb-5">
        <p className="text-[12px] font-bold text-[#656d76] uppercase tracking-wide mb-3">
          Filter Students
        </p>
        <div className="flex gap-3 flex-wrap items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#656d76]" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name, student ID, or course..."
              className="w-full h-10 pl-9 pr-3 text-[14px] border-2 border-[#d0d7de] rounded-lg
                bg-white text-[#1f2328] outline-none focus:border-[#1a7f37] font-medium"
            />
          </div>

          {/* Course */}
          <select
            value={course}
            onChange={e => setCourse(e.target.value)}
            className={`${sel} ${!course ? "text-[#9198a1]" : "text-[#1f2328]"}`}
          >
            <option value="" disabled hidden>Course</option>
            <option value="all">All Courses</option>
            <option value="BS Computer Science">BS Computer Science</option>
            <option value="BS Information Technology">BS Information Technology</option>
            <option value="Associate in Computer Technology">Associate in Computer Technology (A.C.T)</option>
          </select>

          {/* Student Status */}
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className={`${sel} ${!status ? "text-[#9198a1]" : "text-[#1f2328]"}`}
          >
            <option value="" disabled hidden>Student Status</option>
            <option value="all">All Status</option>
            <option value="Regular">Regular</option>
            <option value="Irregular">Irregular</option>
          </select>

          {/* Academic Standing */}
          <select
            value={hasAlert}
            onChange={e => setHasAlert(e.target.value)}
            className={`${sel} ${!hasAlert ? "text-[#9198a1]" : "text-[#1f2328]"}`}
          >
            <option value="" disabled hidden>Academic Standing</option>
            <option value="all">All Students</option>
            <option value="top">Top Performers (≤ 1.75)</option>
            <option value="yes">With Academic Concern</option>
            <option value="no">No Concerns</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="h-10 px-4 flex items-center gap-2 bg-[#cf222e] hover:bg-[#b91c1c]
                text-white text-[14px] font-bold rounded-lg transition-colors flex-shrink-0"
            >
              <X size={15} />
              Clear Filters
            </button>
          )}
        </div>

        {/* Active filter tags */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-[#e8ecf0]">
            <span className="text-[12px] font-semibold text-[#656d76]">Active Filters:</span>
            {hasAlert === "yes" && (
              <span className="text-[12px] font-semibold bg-[#ffebe9] text-[#cf222e] border border-[#ffb8b0] rounded-full px-2.5 py-0.5 flex items-center gap-1">
                <AlertTriangle size={10} /> With Academic Concern
              </span>
            )}
            {hasAlert === "no" && (
              <span className="text-[12px] font-semibold bg-[#dafbe1] text-[#1a7f37] border border-[#a4e8b4] rounded-full px-2.5 py-0.5 flex items-center gap-1">
                <CheckCircle2 size={10} /> No Concerns
              </span>
            )}
            {hasAlert === "top" && (
              <span className="text-[12px] font-semibold bg-[#dafbe1] text-[#1a7f37] border border-[#a4e8b4] rounded-full px-2.5 py-0.5 flex items-center gap-1">
                <CheckCircle2 size={10} /> Top Performer
              </span>
            )}

            {course && course !== "all" && (
              <span className="text-[12px] font-semibold bg-[#dafbe1] text-[#1a7f37] border border-[#a4e8b4] rounded-full px-2.5 py-0.5">
                {course}
              </span>
            )}
            {status && status !== "all" && (
              <span className="text-[12px] font-semibold bg-[#fff8c5] text-[#9a6700] border border-[#f0d070] rounded-full px-2.5 py-0.5">
                {status}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border-2 border-[#d0d7de] rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f6f8fa] border-b-2 border-[#d0d7de]">
              {[
                "Student Name",
                "Student ID",
                "Course",
                "Student Status",
                "Academic Standing",
                "Action",
              ].map((h, i) => (
                <th key={i} className="px-5 py-4 text-[12px] font-bold text-[#656d76] text-left uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center">
                  <p className="text-[16px] font-semibold text-[#656d76] mb-3">
                    Loading students...
                  </p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center">
                  <p className="text-[16px] font-semibold text-[#cf222e] mb-3">
                    Error loading students: {error}
                  </p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center">
                  <p className="text-[16px] font-semibold text-[#656d76] mb-3">
                    No students match your selected filters.
                  </p>
                  <button
                    onClick={clearAll}
                    className="text-[14px] font-bold text-white bg-[#1a7f37] px-5 py-2.5 rounded-lg hover:bg-[#166d30] transition-colors"
                  >
                    Clear All Filters
                  </button>
                </td>
              </tr>
            ) : filtered.map((s, i) => (
              <tr
                key={s.id}
                className={`transition-colors hover:bg-[#f6f8fa] ${i < filtered.length - 1 ? "border-b border-[#e8ecf0]" : ""}`}
              >
                {/* Student Name */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={s.avatar} />
                    <span className="text-[15px] font-bold text-[#1f2328]">{s.name}</span>
                  </div>
                </td>

                {/* Student ID */}
                <td className="px-5 py-4 text-[13px] font-mono text-[#656d76]">{s.id}</td>

                {/* Course */}
                <td className="px-5 py-4 text-[14px] text-[#656d76]">{s.course}</td>



                {/* Student Status */}
                <td className="px-5 py-4">
                  <span className={`text-[13px] font-semibold px-3 py-1.5 rounded-lg border-2
                    ${s.status === "Regular"
                      ? "bg-[#dafbe1] text-[#1a7f37] border-[#a4e8b4]"
                      : "bg-[#fff8c5] text-[#9a6700] border-[#f0d070]"}`}>
                    {s.status}
                  </span>
                </td>

                {/* Academic Standing */}
                <td className="px-5 py-4">
                  {s.alerts > 0 ? (
                    <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#cf222e] bg-[#ffebe9] border border-[#ffb8b0] px-3 py-1.5 rounded-lg">
                      <AlertTriangle size={14} />
                      {s.alerts} Concern{s.alerts > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1a7f37] bg-[#dafbe1] border border-[#a4e8b4] px-3 py-1.5 rounded-lg">
                      <CheckCircle2 size={14} />
                      No Concerns
                    </span>
                  )}
                </td>

                {/* Action */}
                <td className="px-5 py-4">
                  <button
                    onClick={() => navigate(`/students/${s.id}`)}
                    className="inline-flex items-center gap-2 bg-[#1a7f37] hover:bg-[#166d30]
                      text-white text-[13px] font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    View Record
                    <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        {filtered.length > 0 && !loading && !error && (
          <div className="px-5 py-3 border-t border-[#e8ecf0] bg-[#f6f8fa]">
            <p className="text-[13px] text-[#656d76]">
              Showing <span className="font-bold text-[#1f2328]">{filtered.length}</span> student{filtered.length !== 1 ? "s" : ""}
              {hasActiveFilter ? " matching your active filters" : ""} · Use the <span className="font-bold text-[#1a7f37]">View Record</span> button to open a student's full academic history
            </p>
          </div>
        )}
      </div>
    </div>
  );
}