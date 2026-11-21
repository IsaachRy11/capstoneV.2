import { Link } from "react-router-dom";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { SealLogo } from "../../components/ui";
import PhotoHero from "../../components/PhotoHero";
import Backdrop from "../../components/Backdrop";
import HeroStage from "./HeroStage";
import FeatureBento from "./FeatureBento";
import Reveal from "./Reveal";

// Public landing page (signed out). It explains the system in the project's own words and leads to
// sign-in. No numbers or records appear here: signed-out visitors can't read the database, and
// CLAUDE.md forbids hard-coded figures. Every screen picture on this page is abstract (shapes and plain words);
// the photos are decoration (Unsplash, credited in the footer).

const STEPS = [
  { title: "Sign in", text: "Students use their student ID. Staff use their staff ID, such as CCS-001." },
  { title: "Check your subjects and grades", text: "Your schedule, grades and standing, in one place." },
  { title: "Spot a failed subject? Act early", text: "Visit the CCS office while there's still time to plan." },
];

const MOMENTS = [
  { photo: "/photos/p1.jpg", title: "Check your subjects any time", text: "No queue, no waiting for the office to open." },
  { photo: "/photos/p78.jpg", title: "An open door to the limitless horizon.", text: "The College of Computer Studies, Saint Joseph College.", quote: true },
  { photo: "/photos/p20.jpg", title: "Keep every record in order", text: "Grades, seats and schedules, kept by the CCS office." },
];

const CREDITS = "May Pamintuan, Nicholas Swanson, Daniel Genser, Paul Evans, Alejandro Escamilla, Aleks Dorohovich";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-ground">
      <Backdrop still />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>

      {/* A floating bar that stays in reach while you scroll */}
      <header className="sticky top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 rounded-full border border-line bg-surface/85 py-2 pl-3 pr-2 backdrop-blur-md">
          <SealLogo size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[14px] font-bold leading-tight text-ink sm:text-[15px]" translate="no">CCS Subject Monitoring System</div>
            <div className="hidden truncate text-[12px] text-ink-3 sm:block">Saint Joseph College</div>
          </div>
          <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-ink-2 hover:bg-hover hover:text-ink">What it does</a>
            <a href="#how" className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-ink-2 hover:bg-hover hover:text-ink">How it works</a>
          </nav>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/signin" className="btn btn-primary rounded-full px-5">Sign in</Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero: a big photo card with the headline on it, and the two sides of the system overlapping its bottom edge */}
        <section className="mx-auto max-w-[1180px] px-3 pb-16 pt-6 sm:px-6 sm:pt-8 lg:pb-24">
          <PhotoHero src="/photos/p62.jpg" position="center 70%" className="rounded-[28px] sm:rounded-[36px]">
            <Reveal className="flex max-w-[880px] flex-col gap-6 px-6 pb-32 pt-14 sm:px-12 sm:pb-44 sm:pt-20">
              <span className="glass inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-white" aria-hidden="true" />College of Computer Studies<span className="hidden sm:inline"> · Saint Joseph College</span>
              </span>
              <h1 className="text-balance font-display text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[64px] lg:text-[80px]">
                Every subject, section and standing <span className="opacity-70">in one place.</span>
              </h1>
              <p className="max-w-[600px] text-pretty text-[17px] leading-relaxed opacity-95 sm:text-[19px]">
                Track enrollment, grades and academic standing for BSIT, BSCS and ACT students, from first year to graduation.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/signin" className="btn btn-primary h-12 rounded-full px-7 text-[15px]">Sign in <ArrowRight size={17} aria-hidden="true" /></Link>
                <a href="#features" className="btn glass h-12 rounded-full px-7 text-[15px]">See what it does</a>
              </div>
              <div className="flex flex-wrap items-center gap-2" aria-label="Programs">
                {["BSIT", "BSCS", "ACT"].map((p) => (
                  <span key={p} className="glass rounded-full px-3 py-1 font-mono text-[12px] font-semibold">{p}</span>
                ))}
                <span className="text-[13px] opacity-90">One sign-in for students and staff</span>
              </div>
            </Reveal>
          </PhotoHero>
          <Reveal delay={120} className="relative z-10 -mt-24 px-1 sm:-mt-32 sm:px-6"><HeroStage /></Reveal>
        </section>

        {/* What it does */}
        <section id="features" className="scroll-mt-24 border-y border-line bg-surface">
          <div className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 sm:py-20">
            <Reveal className="max-w-[640px]">
              <h2 className="text-balance font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[42px]">
                One record for students <span className="text-ink-3">and the CCS office.</span>
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-2">Both sides work from the same data, so a grade saved by the office is the grade the student sees.</p>
            </Reveal>
            <div className="mt-8"><FeatureBento /></div>
          </div>
        </section>

        {/* Three photo cards */}
        <section className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 sm:py-20" aria-label="Why it helps">
          <div className="grid gap-4 md:grid-cols-3">
            {MOMENTS.map((m, i) => (
              <Reveal key={m.title} delay={i * 90}>
                <PhotoHero src={m.photo} className="h-full min-h-[300px] rounded-[24px] sm:min-h-[380px]">
                  <div className="flex h-full min-h-[300px] flex-col justify-end gap-2 p-6 sm:min-h-[380px] sm:p-7">
                    <p className={`font-display font-extrabold leading-tight tracking-[-0.01em] ${m.quote ? "text-[28px] sm:text-[32px]" : "text-[22px] sm:text-[24px]"}`}>{m.title}</p>
                    <p className="text-[14px] opacity-90">{m.text}</p>
                  </div>
                </PhotoHero>
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works: a real sequence, so the steps are numbered */}
        <section id="how" className="mx-auto max-w-[1180px] scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <Reveal>
            <h2 className="font-display text-[30px] font-extrabold tracking-[-0.02em] text-ink sm:text-[42px]">How it works</h2>
          </Reveal>
          <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 90} className="lift card relative flex flex-col gap-4 p-6 sm:p-7">
                <span className="font-mono text-[44px] font-bold leading-none text-[var(--grid-line)]" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="sr-only">Step {i + 1}: </span>
                <span className="font-display text-[19px] font-bold text-ink">{s.title}</span>
                <span className="text-[14px] leading-relaxed text-ink-2">{s.text}</span>
              </Reveal>
            ))}
          </ol>

          {/* The closing call to action */}
          <Reveal className="mt-14 overflow-hidden rounded-[32px] p-8 sm:p-12" style={{ background: "var(--panel)", color: "var(--panel-ink)" }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-[560px]">
                <h2 className="text-balance font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">Know where you stand before you visit the office.</h2>
                <p className="mt-3 text-[15px]" style={{ color: "var(--panel-soft)" }}>Forgot your password? The CCS office can reset it.</p>
              </div>
              <Link to="/signin" className="btn btn-secondary h-12 rounded-full px-8 text-[15px]">Sign in <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* The footer ends in an oversized, cropped wordmark */}
      <footer className="relative overflow-hidden border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-12 gap-y-4 px-4 py-8 sm:px-6">
          <div>
            <div className="font-display text-[16px] font-bold text-ink" translate="no">CCS Subject Monitoring System</div>
            <p className="mt-0.5 text-[13px] text-ink-3">College of Computer Studies · Saint Joseph College, Maasin City, Southern Leyte</p>
            <p className="mt-2 max-w-[560px] text-[12px] text-ink-3">Photos on Unsplash by {CREDITS}.</p>
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-3">CODE · INNOVATE · TRANSFORM</span>
        </div>
        <div className="pointer-events-none select-none px-4 text-center font-display font-extrabold leading-[0.78] tracking-[-0.05em] text-line" aria-hidden="true"
          style={{ fontSize: "clamp(120px, 27vw, 380px)", marginBottom: "-0.14em" }}>CCS</div>
      </footer>
    </div>
  );
}
