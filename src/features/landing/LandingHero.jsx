import { Link } from "react-router-dom";
import { ArrowRight, Globe, MapPin } from "lucide-react";
import ArtHero from "../../components/ArtHero";
import { SealLogo } from "../../components/ui";
import Reveal from "./Reveal";

// The top of the public landing page: a full-width orange banner that fills the first screen, like the college's own
// CCS poster (title, motto, the three programs, where to inquire). The four students on the right are the poster's photo, softened, tinted into the orange
// and blurred until nobody can be recognized. Behind the text, students walk away from the camera. The floating nav sits over the top.
const PROGRAMS = ["Bachelor of Science in Information Technology", "Bachelor of Science in Computer Science", "Associate in Computer Technology"];

export default function LandingHero() {
  return (
    <ArtHero tone="h" seed={2} className="-mt-[76px] flex min-h-[640px] flex-col md:min-h-[min(100svh,860px)]">
      {/* Students walking away from the camera (backs only), tinted into the orange like the crowd behind the poster's title */}
      <img src="/photos/walk.jpg" alt="" aria-hidden="true" width="1500" height="1000" decoding="async"
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 h-full w-full object-cover opacity-[0.42] md:w-[72%]"
        style={{ mixBlendMode: "multiply", filter: "grayscale(1) contrast(1.1)", WebkitMaskImage: "linear-gradient(to right, #000 35%, transparent)", maskImage: "linear-gradient(to right, #000 35%, transparent)" }} />

      <div className="relative mx-auto flex w-full max-w-[1180px] flex-col justify-center px-4 pb-0 pt-28 sm:px-6 md:pb-16">
        <Reveal className="flex max-w-[600px] flex-col gap-5 md:pb-6">
          <h1 className="font-display leading-[0.98] tracking-[-0.02em]">
            <span className="block text-[28px] font-medium uppercase sm:text-[40px]">College of</span>
            <span className="block text-balance text-[44px] font-extrabold uppercase sm:text-[64px] lg:text-[72px]">Computer Studies</span>
          </h1>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] opacity-95 sm:text-[13px]">An open door to the limitless horizon</p>
          <ul className="flex flex-col gap-1 text-[14px] leading-snug sm:text-[17px]">
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
            <span className="flex items-center gap-3"><SealLogo size={48} /><span className="flex items-center gap-2"><Globe size={15} className="shrink-0" aria-hidden="true" />sjc.edu.ph</span></span>
          </div>
        </Reveal>
      </div>
      {/* Faded on the left edge (wrapper) and on the top edge (image), so no hard line shows */}
      <div className="pointer-events-none mt-6 w-full self-end md:absolute md:bottom-0 md:right-0 md:mt-0 md:w-[58%] md:max-w-[860px] md:[-webkit-mask-image:linear-gradient(to_left,#000_55%,transparent)] md:[mask-image:linear-gradient(to_left,#000_55%,transparent)]">
        <img src="/photos/ccs-students.jpg" alt="Four CCS students standing together" width="1100" height="717" decoding="async"
          className="block h-auto w-full opacity-80 [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_35%)] [mask-image:linear-gradient(to_bottom,transparent,#000_35%)]"
          style={{ mixBlendMode: "multiply", filter: "grayscale(1) contrast(1.1)" }} />
      </div>
    </ArtHero>
  );
}
