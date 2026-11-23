import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { SealLogo } from "../../components/ui";
import ArtHero from "../../components/ArtHero";
import Backdrop from "../../components/Backdrop";
import LandingHero from "./LandingHero";
import FeatureBento from "./FeatureBento";
import Reveal from "./Reveal";

// Public landing page (signed out). It explains the system in the project's own words and leads to
// sign-in. No numbers or records appear here: signed-out visitors can't read the database, and
// CLAUDE.md forbids hard-coded figures. Every screen picture on this page is abstract (shapes and plain words);
// the banners are illustrated with line-art school things (see ArtHero).

const STEPS = [
  { title: "Sign in", text: "Students use their student ID. Staff use their staff ID, such as CCS-001." },
  { title: "Check your subjects and grades", text: "Your schedule, grades and standing, in one place." },
  { title: "Spot a failed subject? Act early", text: "Visit the CCS Secretary's Office while there's still time to plan." },
];

const MOMENTS = [
  { tone: "a", seed: 1, title: "Check your subjects any time", text: "No queue, no waiting for the office to open." },
  { tone: "g", seed: 5, title: "An open door to the limitless horizon.", text: "The College of Computer Studies, Saint Joseph College.", quote: true },
  { tone: "c", seed: 8, title: "Keep every record in order", text: "Grades, seats and schedules, kept by the CCS Secretary's Office." },
];

const CREDITS = "Jon Eckert (the sign-in page), Bo Peng and Yanhao Fang (the landing page)";

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  // The top bar is see-through over the banner and turns solid after a little scrolling.
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-ground">
      <Backdrop still />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>

      {/* A full-width bar: see-through over the orange banner so it blends into it, solid once the page scrolls */}
      <header className={`sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-colors duration-200 ${solid ? "border-line backdrop-blur-md" : "border-transparent"}`}
        style={solid ? { background: "var(--surface)" } : undefined}>
        <div className="mx-auto flex h-[76px] max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <SealLogo size={36} />
          <div className="min-w-0 flex-1">
            <div className={`truncate font-display text-[14px] font-bold leading-tight sm:text-[15px] ${solid ? "text-ink" : "text-white"}`} translate="no">CCS Subject Monitoring System</div>
            <div className={`hidden truncate text-[12px] sm:block ${solid ? "text-ink-3" : "text-white/80"}`}>Saint Joseph College</div>
          </div>
          <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
            {[["#features", "What it does"], ["#how", "How it works"]].map(([href, label]) => (
              <a key={href} href={href} className={`rounded-full px-3.5 py-2 text-[14px] font-semibold ${solid ? "text-ink-2 hover:bg-hover hover:text-ink" : "text-white/90 hover:bg-white/15 hover:text-white"}`}>{label}</a>
            ))}
          </nav>
          <button className={`icon-btn ${solid ? "" : "text-white hover:bg-white/15 hover:text-white"}`} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/signin" className={`btn rounded-full px-5 ${solid ? "btn-primary" : "btn-secondary"}`}>Sign in</Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        <LandingHero />

        {/* What it does: the heading and the feature pictures sit on a light section with the walking students laid into it */}
        <section id="features" className="relative isolate scroll-mt-24 overflow-hidden border-b border-line bg-surface">
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full md:w-[64%] [-webkit-mask-image:linear-gradient(to_left,#000_30%,transparent)] [mask-image:linear-gradient(to_left,#000_30%,transparent)]" aria-hidden="true">
            <img src="/photos/walk2.jpg" alt="" width="900" height="756" decoding="async"
              className="mesh-photo h-full w-full object-cover [-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent)] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
          </div>
          <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20">
            <Reveal>
              <h2 className="max-w-[720px] text-balance font-display text-[34px] font-extrabold leading-[1.06] tracking-[-0.02em] text-ink sm:text-[52px]">
                One record for students and the CCS Secretary's Office.
              </h2>
              <p className="mt-4 max-w-[620px] text-[17px] leading-relaxed text-ink sm:text-[19px]">Both sides work from the same data, so a grade saved by the office is the grade the student sees.</p>
            </Reveal>
            <div className="mt-10"><FeatureBento /></div>
          </div>
        </section>

        {/* Three photo cards */}
        <section className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 sm:py-20" aria-label="Why it helps">
          <div className="grid gap-4 md:grid-cols-3">
            {MOMENTS.map((m, i) => (
              <Reveal key={m.title} delay={i * 90}>
                <ArtHero tone={m.tone} seed={m.seed} className="h-full min-h-[170px] rounded-[20px] sm:min-h-[200px]">
                  <div className="flex h-full min-h-[170px] flex-col justify-end gap-1.5 p-5 sm:min-h-[200px] sm:p-6">
                    <p className={`font-display font-extrabold leading-tight tracking-[-0.01em] ${m.quote ? "text-[22px] sm:text-[24px]" : "text-[19px] sm:text-[20px]"}`}>{m.title}</p>
                    <p className="text-[14px] opacity-90">{m.text}</p>
                  </div>
                </ArtHero>
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
                <span className="font-mono text-[44px] font-bold leading-none text-[var(--accent)]" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="sr-only">Step {i + 1}: </span>
                <span className="font-display text-[19px] font-bold text-ink">{s.title}</span>
                <span className="text-[15.5px] leading-relaxed text-ink">{s.text}</span>
              </Reveal>
            ))}
          </ol>

          {/* The closing call to action */}
          <Reveal className="mt-14 overflow-hidden rounded-[32px] p-8 sm:p-12" style={{ background: "var(--panel)", color: "var(--panel-ink)" }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-[560px]">
                <h2 className="text-balance font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px]" style={{ color: "var(--panel-ink)" }}>Know where you stand before you visit the office.</h2>
                <p className="mt-3 text-[15px]" style={{ color: "var(--panel-soft)" }}>Forgot your password? The CCS Secretary's Office can reset it.</p>
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
            <p className="mt-2 max-w-[560px] text-[12px] text-ink-3">Photos on Unsplash by {CREDITS}. Photo of the SJC College Building by RM Reoma.</p>
          </div>
          <span className="font-mono text-[12px] tracking-wide text-ink-3">CODE · INNOVATE · TRANSFORM</span>
        </div>
        <div className="pointer-events-none select-none px-4 text-center font-display font-extrabold leading-[0.78] tracking-[-0.05em] text-line" aria-hidden="true"
          style={{ fontSize: "clamp(120px, 27vw, 380px)", marginBottom: "-0.14em" }}>CCS</div>
      </footer>
    </div>
  );
}
