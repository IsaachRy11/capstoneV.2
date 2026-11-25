import { Link } from "react-router-dom";
import { Globe, MapPin } from "lucide-react";
import { SealLogo } from "../../components/ui";

// Public landing page footer: both seals with the system's name, then where to go on this page, where the office is,
// and the college's web and Facebook names; a copyright line and the photo credits underneath. Brand color band.
// The Facebook link searches for the page by its name (we don't keep a page address that could go out of date).
const FB_SEARCH = "https://www.facebook.com/search/top?q=" + encodeURIComponent("SJC - College of Computer Studies");
const CREDITS = "Photos on Unsplash by Bo Peng and Yanhao Fang (the landing page). Photo of the SJC College Building by RM Reoma.";

export function FacebookMark({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.2 18.5v-5.6h1.9l.3-2.2h-2.2V9.3c0-.6.2-1.1 1.1-1.1h1.2V6.3c-.2 0-.9-.1-1.7-.1-1.7 0-2.8 1-2.8 2.9v1.6H9.1v2.2H11v5.6z" fill="currentColor" />
    </svg>
  );
}

const linkCls = "[color:inherit] inline-flex min-h-8 items-center gap-2 underline-offset-4 hover:underline";

function Column({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--panel-soft)" }}>{title}</h2>
      <div className="flex flex-col gap-1.5 text-[14.5px]">{children}</div>
    </div>
  );
}

export default function LandingFooter() {
  return (
    <footer className="relative overflow-hidden" style={{ background: "var(--panel)", color: "var(--panel-ink)" }}>
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-10 pt-14 sm:px-6 md:grid-cols-[1.7fr_0.8fr_1.2fr_1.4fr] md:gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <SealLogo size={52} className="ring-2 ring-white/70" />
            <img src="/photos/sjc-seal.jpg" alt="Saint Joseph College seal" width="52" height="52" decoding="async" className="h-[52px] w-[52px] rounded-full ring-2 ring-white/70" />
          </div>
          <div>
            <div className="font-display text-[19px] font-extrabold leading-tight" translate="no">CCS Subject Monitoring System</div>
            <p className="mt-1 text-[14px]" style={{ color: "var(--panel-soft)" }}>College of Computer Studies · Saint Joseph College</p>
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em]">An open door to the limitless horizon</p>
        </div>

        <Column title="Explore">
          <a href="#features" className={linkCls}>What it does</a>
          <a href="#how" className={linkCls}>How it works</a>
          <Link to="/signin" className={linkCls}>Sign in</Link>
        </Column>

        <Column title="Visit us">
          <span className="flex items-start gap-2">
            <MapPin size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Ground Floor, SJC College Building<br />Maasin City, Southern Leyte</span>
          </span>
        </Column>

        <Column title="Connect">
          <a href="https://sjc.edu.ph" target="_blank" rel="noopener noreferrer" className={linkCls}>
            <Globe size={17} className="shrink-0" aria-hidden="true" />sjc.edu.ph<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={FB_SEARCH} target="_blank" rel="noopener noreferrer" className={linkCls}>
            <FacebookMark /><span><span className="sr-only">Facebook: </span>SJC - College of Computer Studies</span><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Column>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-5 text-[12.5px] sm:px-6 md:flex-row md:items-center md:justify-between" style={{ color: "var(--panel-soft)" }}>
          <span>© 2026 CCS Subject Monitoring System · A capstone project of the College of Computer Studies, Saint Joseph College</span>
          <span className="font-mono tracking-wide">CODE · INNOVATE · TRANSFORM</span>
        </div>
        <p className="mx-auto max-w-[1180px] px-4 pb-6 text-[12px] opacity-80 sm:px-6" style={{ color: "var(--panel-soft)" }}>{CREDITS}</p>
      </div>
    </footer>
  );
}
