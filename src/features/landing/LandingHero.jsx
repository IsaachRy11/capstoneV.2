import { Link } from "react-router-dom";
import { ArrowRight, Globe, MapPin } from "lucide-react";
import ArtHero from "../../components/ArtHero";
import { SealLogo } from "../../components/ui";
import Reveal from "./Reveal";

// The top of the public landing page: an orange banner like the college's own CCS poster (title, motto, the three
// programs, where to inquire), with four drawn students standing on the right. The students are flat drawings
// (no faces), not photos of real people. Colors come from the --fig-* tokens in index.css.
const PROGRAMS = ["Bachelor of Science in Information Technology", "Bachelor of Science in Computer Science", "Associate in Computer Technology"];

// One student, drawn from the feet up. `x` is the center, `h` the height of the figure, `skin` 1-4, `hair` is "short" or "long".
function Student({ x, h, skin, hair, held }) {
  const w = h * 0.27;
  const headR = h * 0.085;
  const top = 380 - h;
  const shoulderY = top + headR * 2 + h * 0.03;
  const bodyH = 380 - shoulderY - h * 0.02;
  const cx = x;
  return (
    <g>
      {/* trousers / skirt */}
      <rect x={cx - w * 0.36} y={shoulderY + bodyH * 0.5} width={w * 0.72} height={bodyH * 0.5} rx={w * 0.08} fill="var(--fig-trousers)" />
      {/* shirt */}
      <path d={`M${cx - w / 2} ${shoulderY + bodyH * 0.58} V${shoulderY + w * 0.2} Q${cx - w / 2} ${shoulderY} ${cx - w * 0.3} ${shoulderY} H${cx + w * 0.3} Q${cx + w / 2} ${shoulderY} ${cx + w / 2} ${shoulderY + w * 0.2} V${shoulderY + bodyH * 0.58} Z`} fill="var(--fig-shirt)" />
      {/* neck and collar */}
      <rect x={cx - headR * 0.35} y={shoulderY - headR * 0.5} width={headR * 0.7} height={headR * 0.8} fill={`var(--fig-skin-${skin})`} />
      <path d={`M${cx - headR * 0.9} ${shoulderY} L${cx} ${shoulderY + headR * 1.1} L${cx + headR * 0.9} ${shoulderY} Z`} fill="var(--fig-collar)" />
      {/* lanyard and ID */}
      <path d={`M${cx - headR * 0.8} ${shoulderY} L${cx} ${shoulderY + bodyH * 0.32} L${cx + headR * 0.8} ${shoulderY}`} fill="none" stroke="var(--fig-lanyard)" strokeWidth={h * 0.018} strokeLinejoin="round" />
      <rect x={cx - h * 0.026} y={shoulderY + bodyH * 0.3} width={h * 0.052} height={h * 0.07} rx={h * 0.008} fill="var(--fig-card)" />
      {/* hair behind the head for long hair */}
      {hair === "long" && <path d={`M${cx - headR * 1.25} ${top + headR * 1.2} Q${cx - headR * 1.4} ${top - headR * 0.2} ${cx} ${top - headR * 0.2} Q${cx + headR * 1.4} ${top - headR * 0.2} ${cx + headR * 1.25} ${top + headR * 1.2} L${cx + headR * 1.1} ${top + headR * 3.2} Q${cx} ${top + headR * 2.6} ${cx - headR * 1.1} ${top + headR * 3.2} Z`} fill="var(--fig-hair)" />}
      {/* head */}
      <ellipse cx={cx} cy={top + headR * 1.1} rx={headR} ry={headR * 1.15} fill={`var(--fig-skin-${skin})`} />
      {/* hair on top */}
      <path d={`M${cx - headR * 1.05} ${top + headR * 0.95} Q${cx - headR * 1.1} ${top - headR * 0.15} ${cx} ${top - headR * 0.15} Q${cx + headR * 1.1} ${top - headR * 0.15} ${cx + headR * 1.05} ${top + headR * 0.95} Q${cx + headR * 0.2} ${top + headR * 0.35} ${cx - headR * 1.05} ${top + headR * 0.95} Z`} fill="var(--fig-hair)" />
      {/* what they hold */}
      {held === "laptop" && (
        <g transform={`translate(${cx - w * 1.15} ${shoulderY + bodyH * 0.38}) rotate(-8)`}>
          <rect width={w * 0.95} height={h * 0.05} rx={h * 0.01} fill="var(--fig-device)" />
          <rect x={w * 0.05} y={-h * 0.09} width={w * 0.8} height={h * 0.09} rx={h * 0.012} fill="var(--fig-device-2)" />
          <ellipse cx={w * 0.98} cy={h * 0.02} rx={h * 0.03} ry={h * 0.026} fill={`var(--fig-skin-${skin})`} />
        </g>
      )}
      {held === "folder" && (
        <g>
          <rect x={cx - w * 0.32} y={shoulderY + bodyH * 0.2} width={w * 0.64} height={h * 0.13} rx={h * 0.01} fill="var(--fig-device)" transform={`rotate(-4 ${cx} ${shoulderY + bodyH * 0.25})`} />
          <ellipse cx={cx + w * 0.3} cy={shoulderY + bodyH * 0.33} rx={h * 0.026} ry={h * 0.022} fill={`var(--fig-skin-${skin})`} />
        </g>
      )}
    </g>
  );
}

export default function LandingHero() {
  return (
    <section className="mx-auto max-w-[1180px] px-3 pb-12 pt-6 sm:px-6 sm:pt-8 lg:pb-16">
      <ArtHero tone="a" seed={2} className="rounded-[28px] sm:rounded-[36px]">
        <div className="pointer-events-none absolute -right-24 top-1/2 -z-10 hidden -translate-y-1/2 opacity-[0.16] md:block" aria-hidden="true"><SealLogo size={460} /></div>
        <div className="grid items-end gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <Reveal className="flex flex-col gap-5 px-6 pb-8 pt-10 sm:px-12 sm:pb-12 sm:pt-14">
            <h1 className="font-display leading-[0.98] tracking-[-0.02em]">
              <span className="block text-[26px] font-medium uppercase sm:text-[38px]">College of</span>
              <span className="block text-balance text-[40px] font-extrabold uppercase sm:text-[60px] lg:text-[68px]">Computer Studies</span>
            </h1>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] opacity-95 sm:text-[13px]">An open door to the limitless horizon</p>
            <ul className="flex flex-col gap-1 text-[14px] leading-snug sm:text-[16px]">
              {PROGRAMS.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <p className="max-w-[520px] text-[14px] leading-relaxed opacity-95 sm:text-[15px]">
              The Subject Monitoring System: enrollment, grades and academic standing of every student, in one place.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/signin" className="btn btn-secondary h-12 rounded-full px-7 text-[15px]">Sign in <ArrowRight size={17} aria-hidden="true" /></Link>
              <a href="#features" className="btn glass h-12 rounded-full px-7 text-[15px]">See what it does</a>
            </div>
            <div className="mt-1 flex flex-col gap-1 text-[12.5px] opacity-95 sm:text-[13px]">
              <span className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />For inquiries: CCS Secretary&apos;s Office, Ground Floor of the SJC College Building</span>
              <span className="flex items-center gap-2"><Globe size={15} className="shrink-0" aria-hidden="true" />sjc.edu.ph</span>
            </div>
          </Reveal>

          <Reveal delay={120} className="flex items-end justify-center px-4 md:px-0">
            <svg viewBox="0 0 520 380" className="h-auto w-full max-w-[520px]" role="img" aria-label="Four CCS students standing together, one holding a laptop">
              <ellipse cx="260" cy="378" rx="250" ry="7" fill="rgba(0,0,0,0.18)" />
              <Student x={415} h={318} skin={4} hair="short" held="folder" />
              <Student x={320} h={332} skin={2} hair="long" held="folder" />
              <Student x={215} h={350} skin={3} hair="long" />
              <Student x={105} h={372} skin={1} hair="short" held="laptop" />
            </svg>
          </Reveal>
        </div>
      </ArtHero>
    </section>
  );
}
