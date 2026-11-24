import { Link } from "react-router-dom";
import { ArrowRight, Globe } from "lucide-react";
import ArtHero from "../../components/ArtHero";
import Reveal from "./Reveal";
import { FacebookMark } from "./LandingFooter";

// The top of the public landing page, laid out like the college's own CCS poster: "COLLEGE OF" light over a bold
// "COMPUTER STUDIES", the motto under the title's right edge, the three programs in capitals, where to inquire, and the
// SJC seal with the college's web and Facebook names. Colors stay the site's own. Behind the text, students walk away
// from the camera; on the right, the SJC College Building in its natural colors, faded into the orange on its left and top edges.
const PROGRAMS = ["Bachelor of Science in Information Technology", "Bachelor of Science in Computer Science", "Associate in Computer Technology"];

export default function LandingHero() {
  return (
    <ArtHero tone="h" plain className="-mt-[76px] flex min-h-[640px] flex-col md:min-h-[min(100svh,860px)]">
      {/* Students walking away from the camera (backs only), tinted into the orange like the crowd behind the poster's title */}
      <img src="/photos/walk.jpg" alt="" aria-hidden="true" width="1500" height="1000" decoding="async"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-full object-cover opacity-[0.42] md:w-[72%]"
        style={{ mixBlendMode: "multiply", filter: "grayscale(1) contrast(1.1)", WebkitMaskImage: "linear-gradient(to right, #000 35%, transparent)", maskImage: "linear-gradient(to right, #000 35%, transparent)" }} />

      <div className="relative mx-auto flex w-full max-w-[1180px] flex-col justify-center px-4 pb-0 pt-28 sm:px-6 md:pb-16">
        <Reveal className="flex max-w-[780px] flex-col gap-5 md:pb-6">
          {/* The title and its motto: the motto lines up with the end of "COMPUTER STUDIES", as on the poster */}
          <div className="flex w-fit max-w-full flex-col gap-2.5">
            <h1 className="font-display uppercase leading-[0.95] tracking-[-0.02em]">
              <span className="block text-[30px] font-light sm:text-[46px] lg:text-[54px]">College of</span>
              <span className="block text-balance text-[42px] font-extrabold sm:text-[62px] lg:whitespace-nowrap lg:text-[76px]">Computer Studies</span>
            </h1>
            <p className="self-start text-[12px] font-bold uppercase tracking-[0.05em] sm:self-end sm:text-[15px]">An open door to the limitless horizon</p>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-[14px] font-medium uppercase tracking-[0.02em] sm:text-[18px]">
            {PROGRAMS.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="max-w-[560px] text-[14px] leading-relaxed opacity-95 sm:text-[15px]">
            The Subject Monitoring System: enrollment, grades and academic standing of every student, in one place.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/signin" className="btn btn-secondary h-12 rounded-full px-7 text-[15px]">Sign in <ArrowRight size={17} aria-hidden="true" /></Link>
            <a href="#features" className="btn glass h-12 rounded-full px-7 text-[15px]">See what it does</a>
          </div>
          <p className="text-[13px] leading-relaxed sm:text-[15px]">
            For inquiries and applications, <strong>CCS Secretary&apos;s Office</strong>
            <br className="hidden sm:inline" /> <strong>located at Ground Floor of the SJC College Building</strong>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <img src="/photos/sjc-seal.jpg" alt="Saint Joseph College seal" width="64" height="64" decoding="async" className="h-14 w-14 shrink-0 rounded-full sm:h-16 sm:w-16" />
            <div className="flex flex-col gap-1.5 text-[13px] sm:text-[15px]">
              <span className="flex items-center gap-2"><Globe size={17} className="shrink-0" aria-hidden="true" />sjc.edu.ph</span>
              <span className="flex items-center gap-2"><FacebookMark /><span><span className="sr-only">Facebook: </span>SJC - College of Computer Studies</span></span>
            </div>
          </div>
        </Reveal>
      </div>
      {/* The SJC College Building at its own shape (no cropping), faded on the left and top edges so no hard line shows */}
      <div className="pointer-events-none mt-6 w-full self-end md:absolute md:bottom-0 md:right-0 md:mt-0 md:w-[56%] md:max-w-[840px] md:[-webkit-mask-image:linear-gradient(to_left,#000_60%,transparent)] md:[mask-image:linear-gradient(to_left,#000_60%,transparent)]">
        <img src="/photos/sjc-building.jpg" alt="The Saint Joseph College building in Maasin City" width="740" height="414" decoding="async"
          className="block h-auto w-full [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_30%)] [mask-image:linear-gradient(to_bottom,transparent,#000_30%)]"
          />
      </div>
    </ArtHero>
  );
}
