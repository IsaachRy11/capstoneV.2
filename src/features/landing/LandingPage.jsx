import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, CalendarClock, FileText, Layers, ListChecks, Moon, PenLine, Sun, Users,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { SealLogo } from "../../components/ui";

// Public landing page (signed out). It explains the system in the project's own words and leads to
// sign-in. No numbers or records appear here: signed-out visitors can't read the database, and
// CLAUDE.md forbids hard-coded figures.

const FOR_STUDENTS = [
  { icon: ListChecks, title: "Subject tracker", text: "See what you've passed, what you're taking and what's left." },
  { icon: AlertTriangle, title: "Failed subjects", text: "See any failed or incomplete subject, and when it's offered again." },
  { icon: CalendarClock, title: "Weekly schedule", text: "Your classes by day, time and room." },
  { icon: FileText, title: "Academic record", text: "Every midterm and final grade, term by term." },
];
const FOR_OFFICE = [
  { icon: Users, title: "Student registry", text: "Search, filter and export every student." },
  { icon: Layers, title: "Sections and seats", text: "Enroll students without going over capacity." },
  { icon: CalendarClock, title: "Class schedules", text: "Schedule clashes are blocked automatically." },
  { icon: PenLine, title: "Grade encoding", text: "Every grade change is logged." },
];
const STEPS = [
  { title: "Sign in with your student ID", text: "Staff sign in with their email." },
  { title: "Check your subjects and grades", text: "Your schedule, grades and standing in one place." },
  { title: "Spot a failed subject? Act early", text: "Visit the CCS office while there's still time to plan." },
];

// The hero's picture: four years of subjects, colored the way the app colors grades.
// Abstract on purpose: no real codes or counts, just the shape of a path to graduation.
const PATH = [
  ["ok", "ok", "ok", "ok", "ok", "ok"],
  ["ok", "ok", "now", "now", "now", "now"],
  ["todo", "todo", "todo", "todo", "todo", "todo"],
  ["todo", "todo", "todo", "todo", "todo"],
];
const TILE = {
  ok: { background: "var(--ok-bg)", borderColor: "var(--ok-line)" },
  now: { background: "var(--tint)", borderColor: "var(--accent)" },
  todo: { background: "transparent", borderColor: "var(--line)", borderStyle: "dashed" },
};

function PathToGraduation() {
  return (
    <div className="card w-full p-5 sm:p-6" aria-hidden="true">
      <div className="mb-4">
        <span className="text-[13px] font-semibold text-ink-2">Your path to graduation</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {PATH.map((year, y) => (
          <div key={y} className="flex flex-col gap-2">
            <span className="pb-1 text-center text-[12px] font-semibold text-ink-3">{["1st", "2nd", "3rd", "4th"][y]} Year</span>
            {year.map((kind, i) => {
              const delay = (y * 6 + i) * 35;
              return (
                <span key={i} className="path-tile relative h-7 rounded-md border sm:h-8" style={{ ...TILE[kind], animationDelay: `${delay}ms` }}>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line-2 pt-4 text-[12px] text-ink-3">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border" style={TILE.ok} />Passed</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border" style={TILE.now} />This semester</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border" style={TILE.todo} />Still to take</span>
      </div>
    </div>
  );
}

function FeatureList({ title, items }) {
  return (
    <section className="card flex-[1_1_340px] p-6">
      <h3 className="text-[17px] font-bold text-ink">{title}</h3>
      <ul className="mt-4 flex flex-col gap-4">
        {items.map(({ icon: Icon, title: t, text }) => (
          <li key={t} className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-tint-ink"><Icon size={18} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">{t}</span>
              <span className="block text-[14px] text-ink-2">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <SealLogo size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-bold leading-tight text-ink sm:text-[16px]" translate="no">CCS Subject Monitoring System</div>
            <div className="truncate text-[12px] text-ink-3 sm:text-[13px]">Saint Joseph College</div>
          </div>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/signin" className="btn btn-primary">Sign in</Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-[1180px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-6">
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-accent">College of Computer Studies · Saint Joseph College</span>
            <h1 className="text-balance font-display text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[54px]">
              Every subject, section and standing in one place.
            </h1>
            <p className="max-w-[560px] text-pretty text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
              Track enrollment, grades and academic standing for BSIT, BSCS and ACT students, from first year to graduation.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/signin" className="btn btn-primary h-12 px-6 text-[15px]">Sign in <ArrowRight size={17} aria-hidden="true" /></Link>
              <a href="#how" className="btn btn-secondary h-12 px-6 text-[15px]">How it works</a>
            </div>
            <p className="text-[13px] text-ink-3">Students sign in with their student ID. Staff sign in with their email.</p>
          </div>
          <PathToGraduation />
        </section>

        {/* Who it's for */}
        <section className="border-y border-line bg-surface-2">
          <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6">
            <h2 className="text-balance font-display text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">One record for students and the CCS office</h2>
            <p className="mt-2 max-w-[620px] text-[15px] text-ink-2">Both sides work from the same data, so a grade saved by the office is the grade the student sees.</p>
            <div className="mt-8 flex flex-wrap gap-5">
              <FeatureList title="For students" items={FOR_STUDENTS} />
              <FeatureList title="For the CCS office" items={FOR_OFFICE} />
            </div>
          </div>
        </section>

        {/* How it works: a real sequence, so the steps are numbered */}
        <section id="how" className="mx-auto max-w-[1180px] scroll-mt-6 px-4 py-14 sm:px-6">
          <h2 className="font-display text-[26px] font-bold tracking-tight text-ink sm:text-[30px]">How it works</h2>
          <ol className="mt-8 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card flex flex-col gap-3 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full font-mono text-[15px] font-bold text-white" style={{ background: "var(--btn)" }}>{i + 1}</span>
                <span className="text-[17px] font-bold text-ink">{s.title}</span>
                <span className="text-[14px] text-ink-2">{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/signin" className="btn btn-primary h-12 px-6 text-[15px]">Sign in <ArrowRight size={17} aria-hidden="true" /></Link>
            <span className="text-[14px] text-ink-3">Forgot your password? The CCS office can reset it.</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-7">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-12 gap-y-4 px-4 sm:px-6">
          <div>
            <div className="font-display text-[16px] font-bold text-ink" translate="no">CCS Subject Monitoring System</div>
            <p className="mt-0.5 text-[13px] text-ink-3">College of Computer Studies · Saint Joseph College, Maasin City, Southern Leyte</p>
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-3">CODE · INNOVATE · TRANSFORM</span>
        </div>
      </footer>
    </div>
  );
}
