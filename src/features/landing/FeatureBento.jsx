import { useState } from "react";
import { Badge } from "../../components/ui";
import { PathTiles } from "./HeroStage";
import Reveal from "./Reveal";

// "One record for students and the CCS office": a bento grid of small abstract screens, one set per audience.
// Every picture is made of shapes and plain words, never real names, codes or numbers.

const Bar = ({ w, tone = "bg-line" }) => <span className={`block h-2 rounded-full ${tone}`} style={{ width: w }} />;

function Failed() {
  return (
    <ul className="flex flex-col gap-2">
      {[["Failed", "bad"], ["INC", "neutral"]].map(([label, tone]) => (
        <li key={label} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
          <span className="flex flex-1 flex-col gap-1.5"><Bar w="58%" /><Bar w="30%" tone="bg-line-2" /></span>
          <Badge tone={tone} dot>{label}</Badge>
        </li>
      ))}
      <li className="rounded-lg border border-dashed border-line px-3 py-2 text-[12px] text-ink-3">Shows when it is offered again</li>
    </ul>
  );
}

function Week() {
  const blocks = [[0, 2], [1, 1], [2, 3], [3, 1], [4, 2]];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {["M", "T", "W", "T", "F"].map((d, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <span className="text-center text-[11px] font-semibold text-ink-3">{d}</span>
          <span className="h-7 rounded-md border" style={i % 2 === 0 ? { background: "var(--tint)", borderColor: "var(--accent)" } : { background: "var(--info-bg)", borderColor: "var(--line)" }} />
          {blocks[i][1] > 1 && <span className="h-5 rounded-md border border-line bg-surface" />}
          {blocks[i][1] > 2 && <span className="h-7 rounded-md border" style={{ background: "var(--ok-bg)", borderColor: "var(--ok-line)" }} />}
        </div>
      ))}
    </div>
  );
}

function Record() {
  return (
    <ul className="flex flex-col">
      <li className="grid grid-cols-[1fr_52px_52px] gap-2 pb-2 text-[11px] font-semibold text-ink-3"><span>Subject</span><span className="text-center">Midterm</span><span className="text-center">Final</span></li>
      {[["ok", "Passed"], ["ok", "Passed"], ["bad", "Failed"], ["neutral", "INC"]].map(([tone, label], i) => (
        <li key={i} className="grid grid-cols-[1fr_52px_52px] items-center gap-2 border-t border-line-2 py-2">
          <Bar w={`${70 - i * 9}%`} />
          <span className="mx-auto h-2 w-6 rounded-full bg-line" />
          <span className="mx-auto"><Badge tone={tone}>{label}</Badge></span>
        </li>
      ))}
    </ul>
  );
}

function Registry() {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="h-8 rounded-full border border-line bg-surface px-4 text-[12px] leading-8 text-ink-3">Search by name, ID or section</span>
      <ul className="flex flex-col">
        {[["Regular", "ok"], ["Irregular", "warn"], ["Regular", "ok"]].map(([label, tone], i) => (
          <li key={i} className="flex items-center gap-3 border-t border-line-2 py-2.5">
            <span className="h-7 w-7 rounded-full bg-tint" />
            <span className="flex flex-1 flex-col gap-1.5"><Bar w={`${64 - i * 10}%`} /><Bar w="28%" tone="bg-line-2" /></span>
            <Badge tone={tone} dot>{label}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Seats() {
  return (
    <div className="flex flex-col gap-3.5">
      {[["Section S", 84], ["Section T", 58], ["Section U", 100]].map(([name, p]) => (
        <div key={name} className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-[12px]"><span className="font-semibold text-ink-2">{name}</span><span className="text-ink-3">{p === 100 ? "Full" : "Seats left"}</span></span>
          <span className="bar block" aria-hidden="true"><span style={{ width: `${p}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

function Clash() {
  return (
    <div className="relative h-[116px]">
      <span className="absolute left-0 top-2 h-12 w-[58%] rounded-lg border" style={{ background: "var(--tint)", borderColor: "var(--accent)" }} />
      <span className="absolute right-0 top-9 h-12 w-[58%] rounded-lg border" style={{ background: "var(--bad-bg)", borderColor: "var(--bad-line)", borderStyle: "dashed" }} />
      <span className="absolute bottom-0 left-0"><Badge tone="bad" dot>Clash blocked</Badge></span>
    </div>
  );
}

function Log() {
  return (
    <ul className="flex flex-col gap-2">
      {[["Grade saved", "ok"], ["Grade corrected", "info"], ["Subject removed", "neutral"]].map(([t, tone]) => (
        <li key={t} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
          <Badge tone={tone}>{t}</Badge>
          <span className="flex flex-1 flex-col gap-1.5"><Bar w="70%" tone="bg-line-2" /></span>
          <span className="text-[11px] text-ink-3">logged</span>
        </li>
      ))}
    </ul>
  );
}

const SETS = {
  students: {
    label: "For students",
    cards: [
      { span: "md:col-span-4", title: "Subject tracker", text: "See what you've passed, what you're taking and what's left, all the way to graduation.", visual: <PathTiles /> },
      { span: "md:col-span-2", title: "Failed subjects", text: "Find out first, then plan with the office.", visual: <Failed /> },
      { span: "md:col-span-2", title: "Weekly schedule", text: "Your subjects by day, time and room.", visual: <Week /> },
      { span: "md:col-span-4", title: "Academic record", text: "Every midterm and final grade, term by term, in colors that always come with words.", visual: <Record /> },
    ],
  },
  office: {
    label: "For the CCS office",
    cards: [
      { span: "md:col-span-4", title: "Student registry", text: "Search, filter and export every student. Status is worked out for you.", visual: <Registry /> },
      { span: "md:col-span-2", title: "Sections and seats", text: "Add students to subjects without going over the seats.", visual: <Seats /> },
      { span: "md:col-span-2", title: "Class schedules", text: "Clashes in a section, room or student are blocked.", visual: <Clash /> },
      { span: "md:col-span-4", title: "Grade encoding", text: "Fix a grade any time. Every change is kept in a history nobody can edit.", visual: <Log /> },
    ],
  },
};

export default function FeatureBento() {
  const [who, setWho] = useState("students");
  const set = SETS[who];
  return (
    <div>
      <div className="seg" role="group" aria-label="Show features for">
        {Object.entries(SETS).map(([key, s]) => (
          <button key={key} aria-pressed={who === key} onClick={() => setWho(key)}>{s.label}</button>
        ))}
      </div>
      <div key={who} className="mt-6 grid gap-4 md:grid-cols-6">
        {set.cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 70} className={`lift card flex flex-col gap-5 p-5 sm:p-6 ${c.span}`}>
            <div className="flex min-h-[132px] flex-1 flex-col justify-center rounded-xl border border-line-2 bg-surface-2 p-4" aria-hidden="true">{c.visual}</div>
            <div>
              <h3 className="font-display text-[18px] font-bold text-ink">{c.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{c.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
