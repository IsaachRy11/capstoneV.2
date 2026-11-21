// A greeting card for the first screen of each role: time-of-day hello, today's date and one line of context.
// The rings and the tint circle are decoration only.
const hello = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function WelcomeBanner({ name, line, children }) {
  const first = String(name || "").trim().split(/\s+/)[0];
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
  return (
    <section className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-6 sm:p-8">
      <span className="bd-shape pointer-events-none absolute -right-14 -top-24 h-64 w-64 sm:h-80 sm:w-80" aria-hidden="true" style={{ animationDuration: "34s" }} />
      <span className="bd-ring pointer-events-none absolute right-20 top-10 hidden h-28 w-28 sm:block" aria-hidden="true" style={{ animationDuration: "40s" }} />
      <span className="bd-ring pointer-events-none absolute -bottom-10 right-1/3 hidden h-24 w-24 md:block" aria-hidden="true" style={{ animationDuration: "46s" }} />
      <div className="relative flex flex-col gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{today}</span>
        <h2 className="text-balance font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-ink sm:text-[42px]">
          {hello()}{first ? <>, <span className="text-accent">{first}</span></> : null}
        </h2>
        {line && <p className="max-w-[560px] text-[15px] leading-relaxed text-ink-2 sm:text-[16px]">{line}</p>}
        {children && <div className="mt-3 flex flex-wrap items-center gap-2.5">{children}</div>}
      </div>
    </section>
  );
}
