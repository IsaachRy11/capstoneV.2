import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Clock, MinusCircle } from "lucide-react";

const STUDENTS = [
  {
    id:"2021-0001", name:"Maria Santos", avatar:"MS", course:"BS Computer Science", yr:3, status:"Regular", gwa:1.75,
    alerts:["Missing prerequisite: CC121 required before CC304"],
    semesters:[
      { label:"1st Year · 1st Semester", gwa:1.50, subjects:[
        { code:"CC101",  title:"Intro to Computing",              u:3, g:1.25, s:"passed" },
        { code:"CC102",  title:"Computer Programming 1",          u:3, g:1.50, s:"passed" },
        { code:"Math101",title:"Mathematics in the Modern World", u:3, g:1.75, s:"passed" },
        { code:"GEC001", title:"Understanding the Self",          u:3, g:2.00, s:"passed" },
        { code:"PE001",  title:"Physical Education 1",            u:2, g:1.25, s:"passed" },
      ]},
      { label:"1st Year · 2nd Semester", gwa:1.63, subjects:[
        { code:"CC111",  title:"Computer Programming 2",          u:3, g:1.50, s:"passed", pre:"CC102" },
        { code:"CC112",  title:"Digital Logic Design",            u:3, g:1.75, s:"passed" },
        { code:"Math102",title:"Calculus 1",                      u:3, g:2.00, s:"passed" },
        { code:"GEC002", title:"Readings in Philippine History",  u:3, g:1.50, s:"passed" },
        { code:"PE002",  title:"Physical Education 2",            u:2, g:1.25, s:"passed" },
      ]},
      { label:"2nd Year · 1st Semester", gwa:1.88, subjects:[
        { code:"CC201",  title:"Data Structures & Algorithms",    u:3, g:1.75, s:"passed", pre:"CC111" },
        { code:"CC202",  title:"Object-Oriented Programming",     u:3, g:2.00, s:"passed", pre:"CC111" },
        { code:"CC203",  title:"Discrete Mathematics",            u:3, g:1.75, s:"passed" },
        { code:"Math201",title:"Calculus 2",                      u:3, g:2.25, s:"passed", pre:"Math102" },
        { code:"GEC003", title:"The Contemporary World",          u:3, g:1.75, s:"passed" },
      ]},
      { label:"2nd Year · 2nd Semester", gwa:2.10, subjects:[
        { code:"CC211",  title:"Database Management Systems",     u:3, g:2.00, s:"passed", pre:"CC201" },
        { code:"CC212",  title:"Computer Architecture",           u:3, g:2.25, s:"passed" },
        { code:"CC213",  title:"Software Engineering 1",          u:3, g:2.25, s:"passed" },
        { code:"CC121",  title:"Web Development Fundamentals",    u:3, g:null, s:"dropped" },
        { code:"GEC004", title:"Art Appreciation",                u:3, g:2.00, s:"passed" },
      ]},
      { label:"3rd Year · 1st Semester", gwa:2.13, subjects:[
        { code:"CC301",  title:"Operating Systems",               u:3, g:2.00, s:"passed", pre:"CC212" },
        { code:"CC302",  title:"Software Engineering 2",          u:3, g:2.25, s:"passed", pre:"CC213" },
        { code:"CC303",  title:"Programming Languages",           u:3, g:2.00, s:"passed" },
        { code:"CC304",  title:"Web Systems & Technologies",      u:3, g:null, s:"incomplete", preFlag:true, preNote:"Requires CC121 — previously Dropped" },
        { code:"CC305",  title:"Human-Computer Interaction",      u:3, g:2.25, s:"passed" },
      ]},
    ]
  },
  {
    id:"2021-0045", name:"Juan dela Cruz", avatar:"JC", course:"BS Information Technology", yr:3, status:"Irregular", gwa:2.45,
    alerts:["Missing prerequisite: CC121 required before CC304", "At risk: GWA approaching 3.0"],
    semesters:[
      { label:"1st Year · 1st Semester", gwa:2.13, subjects:[
        { code:"IT101",  title:"Intro to Information Technology", u:3, g:2.00, s:"passed" },
        { code:"CC102",  title:"Computer Programming 1",          u:3, g:2.25, s:"passed" },
        { code:"Math101",title:"Mathematics in the Modern World", u:3, g:2.25, s:"passed" },
        { code:"GEC001", title:"Understanding the Self",          u:3, g:2.00, s:"passed" },
        { code:"PE001",  title:"Physical Education 1",            u:2, g:2.00, s:"passed" },
      ]},
      { label:"1st Year · 2nd Semester", gwa:2.50, subjects:[
        { code:"IT102",  title:"Web Design & Development",        u:3, g:2.25, s:"passed" },
        { code:"CC111",  title:"Computer Programming 2",          u:3, g:2.75, s:"passed", pre:"CC102" },
        { code:"Math102",title:"Calculus 1",                      u:3, g:3.00, s:"passed" },
        { code:"GEC002", title:"Readings in Philippine History",  u:3, g:2.25, s:"passed" },
        { code:"PE002",  title:"Physical Education 2",            u:2, g:2.25, s:"passed" },
      ]},
      { label:"2nd Year · 1st Semester", gwa:2.63, subjects:[
        { code:"IT201",  title:"Network Fundamentals",            u:3, g:2.50, s:"passed" },
        { code:"IT202",  title:"Systems Analysis & Design",       u:3, g:5.00, s:"failed" },
        { code:"CC201",  title:"Data Structures & Algorithms",    u:3, g:2.75, s:"passed", pre:"CC111" },
        { code:"GEC003", title:"The Contemporary World",          u:3, g:2.25, s:"passed" },
        { code:"Math201",title:"Probability & Statistics",        u:3, g:2.75, s:"passed" },
      ]},
      { label:"2nd Year · 2nd Semester", gwa:2.50, subjects:[
        { code:"IT202",  title:"Systems Analysis & Design (Retake)", u:3, g:2.50, s:"passed" },
        { code:"IT203",  title:"Database Administration",         u:3, g:2.50, s:"passed", pre:"CC201" },
        { code:"IT204",  title:"Network Administration",          u:3, g:2.75, s:"passed", pre:"IT201" },
        { code:"GEC004", title:"Art Appreciation",                u:3, g:2.25, s:"passed" },
        { code:"CC213",  title:"Software Engineering 1",          u:3, g:2.50, s:"passed" },
      ]},
      { label:"3rd Year · 1st Semester", gwa:2.88, subjects:[
        { code:"IT301",  title:"Advanced Networking",             u:3, g:2.75, s:"passed", pre:"IT204" },
        { code:"IT302",  title:"IT Project Management",           u:3, g:3.00, s:"passed" },
        { code:"IT303",  title:"Information Security",            u:3, g:2.75, s:"passed" },
        { code:"CC311",  title:"Machine Learning Fundamentals",   u:3, g:3.00, s:"passed" },
        { code:"GEC005", title:"Ethics",                          u:3, g:3.00, s:"passed" },
      ]},
    ]
  },
  {
    id:"2022-0078", name:"Ana Reyes", avatar:"AR", course:"BS Computer Science", yr:2, status:"Regular", gwa:1.38,
    alerts:[],
    semesters:[
      { label:"1st Year · 1st Semester", gwa:1.30, subjects:[
        { code:"CC101",  title:"Intro to Computing",              u:3, g:1.25, s:"passed" },
        { code:"CC102",  title:"Computer Programming 1",          u:3, g:1.25, s:"passed" },
        { code:"Math101",title:"Mathematics in the Modern World", u:3, g:1.50, s:"passed" },
        { code:"GEC001", title:"Understanding the Self",          u:3, g:1.25, s:"passed" },
        { code:"PE001",  title:"Physical Education 1",            u:2, g:1.25, s:"passed" },
      ]},
      { label:"1st Year · 2nd Semester", gwa:1.38, subjects:[
        { code:"CC111",  title:"Computer Programming 2",          u:3, g:1.25, s:"passed", pre:"CC102" },
        { code:"CC112",  title:"Digital Logic Design",            u:3, g:1.50, s:"passed" },
        { code:"Math102",title:"Calculus 1",                      u:3, g:1.50, s:"passed" },
        { code:"GEC002", title:"Readings in Philippine History",  u:3, g:1.25, s:"passed" },
        { code:"PE002",  title:"Physical Education 2",            u:2, g:1.50, s:"passed" },
      ]},
      { label:"2nd Year · 1st Semester", gwa:1.45, subjects:[
        { code:"CC201",  title:"Data Structures & Algorithms",    u:3, g:1.50, s:"passed", pre:"CC111" },
        { code:"CC202",  title:"Object-Oriented Programming",     u:3, g:1.25, s:"passed", pre:"CC111" },
        { code:"CC203",  title:"Discrete Mathematics",            u:3, g:1.50, s:"passed" },
        { code:"Math201",title:"Calculus 2",                      u:3, g:1.50, s:"passed", pre:"Math102" },
        { code:"GEC003", title:"The Contemporary World",          u:3, g:1.50, s:"passed" },
      ]},
    ]
  },
  {
    id:"2020-0112", name:"Roberto Lim", avatar:"RL", course:"BS Information Systems", yr:4, status:"Irregular", gwa:2.88,
    alerts:["2 failed subjects in history — retakes completed", "Below average GWA — monitor closely"],
    semesters:[
      { label:"1st Year · 1st Semester", gwa:2.50, subjects:[
        { code:"IS101",  title:"Intro to Information Systems",    u:3, g:2.50, s:"passed" },
        { code:"CC102",  title:"Computer Programming 1",          u:3, g:2.50, s:"passed" },
        { code:"Math101",title:"Mathematics in the Modern World", u:3, g:2.75, s:"passed" },
        { code:"GEC001", title:"Understanding the Self",          u:3, g:2.25, s:"passed" },
        { code:"PE001",  title:"Physical Education 1",            u:2, g:2.25, s:"passed" },
      ]},
      { label:"1st Year · 2nd Semester", gwa:2.88, subjects:[
        { code:"IS102",  title:"Business Process Management",     u:3, g:2.75, s:"passed" },
        { code:"CC111",  title:"Computer Programming 2",          u:3, g:3.00, s:"passed", pre:"CC102" },
        { code:"Math102",title:"Calculus 1",                      u:3, g:5.00, s:"failed" },
        { code:"GEC002", title:"Readings in Philippine History",  u:3, g:2.50, s:"passed" },
        { code:"PE002",  title:"Physical Education 2",            u:2, g:2.75, s:"passed" },
      ]},
      { label:"2nd Year · 1st Semester", gwa:3.00, subjects:[
        { code:"IS201",  title:"Systems Analysis & Design",       u:3, g:3.00, s:"passed" },
        { code:"Math102",title:"Calculus 1 (Retake)",             u:3, g:3.00, s:"passed" },
        { code:"CC201",  title:"Data Structures & Algorithms",    u:3, g:3.00, s:"passed", pre:"CC111" },
        { code:"IS202",  title:"Enterprise Architecture",         u:3, g:3.00, s:"passed" },
      ]},
      { label:"2nd Year · 2nd Semester", gwa:2.75, subjects:[
        { code:"IS211",  title:"Database Design",                 u:3, g:2.75, s:"passed", pre:"CC201" },
        { code:"IS212",  title:"IT Governance",                   u:3, g:2.75, s:"passed" },
        { code:"IS213",  title:"Project Management",              u:3, g:2.50, s:"passed" },
        { code:"GEC003", title:"The Contemporary World",          u:3, g:3.00, s:"passed" },
        { code:"IS214",  title:"Business Intelligence",           u:3, g:2.75, s:"passed" },
      ]},
      { label:"3rd Year · 1st Semester", gwa:2.88, subjects:[
        { code:"IS301",  title:"ERP Systems",                     u:3, g:3.00, s:"passed" },
        { code:"IS302",  title:"IT Risk Management",              u:3, g:2.75, s:"passed" },
        { code:"IS303",  title:"Data Analytics",                  u:3, g:2.75, s:"passed" },
        { code:"IS304",  title:"Cloud Computing",                 u:3, g:5.00, s:"failed" },
        { code:"GEC004", title:"Art Appreciation",                u:3, g:2.75, s:"passed" },
      ]},
      { label:"3rd Year · 2nd Semester", gwa:2.88, subjects:[
        { code:"IS304",  title:"Cloud Computing (Retake)",        u:3, g:2.75, s:"passed" },
        { code:"IS311",  title:"Digital Transformation",          u:3, g:3.00, s:"passed" },
        { code:"IS312",  title:"Information Security Management", u:3, g:2.75, s:"passed" },
        { code:"GEC005", title:"Ethics",                          u:3, g:3.00, s:"passed" },
        { code:"IS313",  title:"IS Capstone Planning",            u:3, g:null, s:"incomplete" },
      ]},
      { label:"4th Year · 1st Semester", gwa:2.75, subjects:[
        { code:"IS401",  title:"IS Capstone Project 1",           u:3, g:2.75, s:"passed" },
        { code:"IS402",  title:"IS Practicum",                    u:6, g:2.75, s:"passed" },
        { code:"IS403",  title:"Tech Entrepreneurship",           u:3, g:2.75, s:"passed" },
      ]},
    ]
  },
];

const STATUS_CONFIG = {
  passed:     { label:"Passed",     Icon:CheckCircle2, color:"text-[#1a7f37]", bg:"bg-[#dafbe1]", border:"border-[#a4e8b4]" },
  failed:     { label:"Failed",     Icon:XCircle,      color:"text-[#cf222e]", bg:"bg-[#ffebe9]", border:"border-[#ffb8b0]" },
  dropped:    { label:"Dropped",    Icon:MinusCircle,  color:"text-[#57606a]", bg:"bg-[#f6f8fa]", border:"border-[#d0d7de]" },
  incomplete: { label:"Incomplete", Icon:Clock,        color:"text-[#9a6700]", bg:"bg-[#fff8c5]", border:"border-[#f0d070]" },
};

function gwaColor(g) {
  if (g <= 1.75) return "text-[#1a7f37]";
  if (g <= 2.50) return "text-[#0969da]";
  if (g <= 3.00) return "text-[#9a6700]";
  return "text-[#cf222e]";
}

function gwaLabel(g) {
  if (g <= 1.75) return "Excellent";
  if (g <= 2.50) return "Good";
  if (g <= 3.00) return "Average";
  return "At Risk";
}

function Avatar({ initials, size = "w-11 h-11", text = "text-[13px]" }) {
  const colors = [
    "bg-[#1f6feb] text-[#cae8ff]",
    "bg-[#1a7f37] text-[#dafbe1]",
    "bg-[#9e6a03] text-[#fff8c5]",
    "bg-[#6e40c9] text-[#ede8ff]",
  ];
  const idx = (initials.charCodeAt(0) * 7 + initials.charCodeAt(1)) % colors.length;
  return (
    <div className={`${size} rounded-full flex items-center justify-center ${text} font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

export default function StudentRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const student = STUDENTS.find(s => s.id === id);

  if (!student) return (
    <div className="p-8 text-[#656d76] text-sm">
      Student not found.{" "}
      <button onClick={() => navigate("/students")} className="text-[#1a7f37] underline">Go back</button>
    </div>
  );

  const allSubjects = student.semesters.flatMap(s => s.subjects);
  const passed    = allSubjects.filter(s => s.s === "passed").length;
  const failed    = allSubjects.filter(s => s.s === "failed").length;
  const dropped   = allSubjects.filter(s => s.s === "dropped").length;
  const incomplete= allSubjects.filter(s => s.s === "incomplete").length;
  const units     = allSubjects.filter(s => s.s === "passed").reduce((a, s) => a + s.u, 0);
  const pct       = Math.round((passed / allSubjects.length) * 100);

  return (
    <div className="max-w-4xl pb-12">

      {/* Back button */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-1.5 text-[12px] text-[#656d76] hover:text-[#1f2328] mb-5 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Students
      </button>

      {/* Profile card */}
      <div className="bg-white border border-[#d0d7de] rounded-lg p-5 mb-4">

        {/* Top row */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar initials={student.avatar} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-[18px] font-bold text-[#1f2328] tracking-tight">{student.name}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${student.status === "Regular" ? "bg-[#dafbe1] text-[#1a7f37] border-[#a4e8b4]" : "bg-[#fff8c5] text-[#9a6700] border-[#f0d070]"}`}>
                {student.status}
              </span>
              {student.alerts.length > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-[#ffebe9] text-[#cf222e] border-[#ffb8b0]">
                  ⚠ {student.alerts.length} alert{student.alerts.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#656d76]">
              {student.course} · {["1st","2nd","3rd","4th"][student.yr - 1]} Year ·{" "}
              <span className="font-mono">{student.id}</span>
            </p>
          </div>
          <span className={`text-[13px] font-bold font-mono px-2.5 py-1 rounded-md border ${gwaColor(student.gwa)} ${student.gwa <= 1.75 ? "bg-[#dafbe1] border-[#a4e8b4]" : student.gwa <= 2.50 ? "bg-[#ddf4ff] border-[#aecbfa]" : student.gwa <= 3.00 ? "bg-[#fff8c5] border-[#f0d070]" : "bg-[#ffebe9] border-[#ffb8b0]"}`}>
            {student.gwa.toFixed(2)} · {gwaLabel(student.gwa)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-[#656d76] uppercase tracking-wide">Curriculum Progress</span>
            <span className="text-[11px] font-mono text-[#656d76]">{passed}/{allSubjects.length} subjects · {units} units earned</span>
          </div>
          <div className="h-1.5 bg-[#e8ecf0] rounded-full overflow-hidden">
            <div className="h-full bg-[#2da44e] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Tally */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label:"Passed",     count:passed,     cfg:STATUS_CONFIG.passed },
            { label:"Failed",     count:failed,     cfg:STATUS_CONFIG.failed },
            { label:"Dropped",    count:dropped,    cfg:STATUS_CONFIG.dropped },
            { label:"Incomplete", count:incomplete, cfg:STATUS_CONFIG.incomplete },
          ].map(item => (
            <div key={item.label} className={`${item.cfg.bg} border ${item.cfg.border} rounded-md p-2.5 text-center`}>
              <p className={`text-[20px] font-bold font-mono ${item.cfg.color}`}>{item.count}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${item.cfg.color}`}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {student.alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {student.alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#ffebe9] border border-[#ffb8b0] rounded-md px-3 py-2">
                <AlertTriangle size={13} className="text-[#cf222e] mt-0.5 flex-shrink-0" />
                <span className="text-[12px] text-[#1f2328]">{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Semester blocks */}
      {student.semesters.map((sem, si) => (
        <div key={si} className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden mb-3">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#f6f8fa] border-b border-[#d0d7de]">
            <span className="text-[12px] font-bold text-[#1f2328]">{sem.label}</span>
            <span className={`text-[11px] font-bold font-mono ${gwaColor(sem.gwa)}`}>
              GWA {sem.gwa.toFixed(2)} · {gwaLabel(sem.gwa)}
            </span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#e8ecf0]">
                {["Code", "Subject Title", "Units", "Grade", "Status"].map((h, i) => (
                  <th key={i} className={`px-4 py-2 text-[10px] font-semibold text-[#656d76] uppercase tracking-wide ${i >= 2 ? "text-center" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sem.subjects.map((subj, j) => {
                const cfg = STATUS_CONFIG[subj.s] || STATUS_CONFIG.dropped;
                const Icon = cfg.Icon;
                return (
                  <tr key={j} className={`hover:bg-[#f6f8fa] transition-colors ${j < sem.subjects.length - 1 ? "border-b border-[#e8ecf0]" : ""}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-[#656d76]">{subj.code}</span>
                        {subj.preFlag && (
                          <span className="text-[9px] font-bold bg-[#ffebe9] text-[#cf222e] border border-[#ffb8b0] rounded px-1">PREREQ!</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <p className="text-[13px] text-[#1f2328]">{subj.title}</p>
                      {subj.preNote && <p className="text-[10px] text-[#cf222e] mt-0.5">{subj.preNote}</p>}
                      {subj.pre && !subj.preFlag && <p className="text-[10px] text-[#9198a1] mt-0.5">prereq: {subj.pre}</p>}
                    </td>
                    <td className="px-4 py-2 text-center text-[12px] text-[#656d76]">{subj.u}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[13px] font-bold font-mono ${subj.g === 5.0 ? "text-[#cf222e]" : subj.g ? cfg.color : "text-[#9198a1]"}`}>
                        {subj.g === 5.0 ? "5.00" : subj.g ? subj.g.toFixed(2) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}