import PhotoHero, { GlassFacts } from "./PhotoHero";

// The first card of each role's home screen: a photo, a time-of-day hello, today's date, one line of context
// and a frosted row of facts (like the weather row of a phone app). `badge` sits at the top right.
const hello = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function WelcomeBanner({ photo, name, line, facts, badge, children }) {
  const first = String(name || "").trim().split(/\s+/)[0];
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
  return (
    <PhotoHero src={photo} position="center 60%" className="rounded-[24px]">
      <div className="flex min-h-[280px] flex-col justify-between gap-8 p-6 sm:min-h-[320px] sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] opacity-90">{today}</span>
            <h2 className="text-balance font-display text-[34px] font-extrabold leading-[1.04] tracking-[-0.02em] sm:text-[52px]">
              {hello()}{first ? <>, {first}</> : null}
            </h2>
            {line && <p className="max-w-[560px] text-[15px] leading-relaxed opacity-95 sm:text-[17px]">{line}</p>}
            {children && <div className="mt-2 flex flex-wrap items-center gap-2.5">{children}</div>}
          </div>
          {badge}
        </div>
        {facts && <GlassFacts items={facts} />}
      </div>
    </PhotoHero>
  );
}
