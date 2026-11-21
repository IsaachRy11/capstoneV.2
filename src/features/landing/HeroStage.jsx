import { Badge } from "../../components/ui";

// The hero's picture: the two sides of the system as small, abstract screens (no real names, codes or numbers).
// Left, the CCS office's registry; right, a student's phone. Colors follow the app's grade colors.

const TILE = {
  ok: { background: "var(--ok-bg)", borderColor: "var(--ok-line)" },
  now: { background: "var(--tint)", borderColor: "var(--accent)" },
  todo: { background: "transparent", borderColor: "var(--line)", borderStyle: "dashed" },
};
const PATH = [
  ["ok", "ok", "ok", "ok", "ok"],
  ["ok", "ok", "now", "now", "now"],
  ["todo", "todo", "todo", "todo", "todo"],
  ["todo", "todo", "todo", "todo"],
];

export function PathTiles({ compact = false }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PATH.map((year, y) => (
        <div key={y} className="flex flex-col gap-1.5">
          <span className="pb-0.5 text-center text-[11px] font-semibold text-ink-3">{["1st", "2nd", "3rd", "4th"][y]}</span>
          {year.map((kind, i) => (
            <span key={i} className={`path-tile rounded-md border ${compact ? "h-4" : "h-5 sm:h-6"}`} style={{ ...TILE[kind], animationDelay: `${(y * 5 + i) * 45 + 500}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const Bar = ({ w, tone = "bg-line" }) => <span className={`block h-2 rounded-full ${tone}`} style={{ width: w }} />;

function OfficePanel() {
  const rows = [
    ["Regular", "ok", "62%"],
    ["Irregular", "warn", "48%"],
    ["Regular", "ok", "70%"],
    ["Regular", "ok", "55%"],
    ["Irregular", "warn", "66%"],
  ];
  return (
    <div className="card w-full overflow-hidden shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 h-6 flex-1 rounded-full border border-line bg-surface-2" />
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_130px]">
        <div>
          <div className="mb-3 flex gap-2">
            {["Program", "Student type", "Status"].map((t) => (
              <span key={t} className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-3">{t}</span>
            ))}
          </div>
          <ul className="flex flex-col">
            {rows.map(([label, tone, w], i) => (
              <li key={i} className="flex items-center gap-3 border-t border-line-2 py-2.5">
                <span className="h-7 w-7 shrink-0 rounded-full bg-tint" />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5"><Bar w={w} tone="bg-line" /><Bar w="34%" tone="bg-line-2" /></span>
                <Badge tone={tone} dot>{label}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden flex-col gap-3 sm:flex">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Seats</span>
          {[78, 52, 91].map((p, i) => (
            <span key={i} className="bar block" aria-hidden="true"><span style={{ width: `${p}%` }} /></span>
          ))}
          <span className="mt-1 rounded-lg border border-line bg-surface-2 p-2.5 text-[11px] leading-snug text-ink-2">A class that is full can't be over-enrolled.</span>
        </div>
      </div>
    </div>
  );
}

function StudentPhone() {
  return (
    <div className="stage-float w-[236px] shrink-0 rounded-[34px] border border-line bg-surface p-2.5 shadow-[0_30px_70px_-26px_rgba(0,0,0,0.45)]">
      <div className="overflow-hidden rounded-[26px] border border-line-2 bg-ground">
        <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-line" />
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-full bg-tint" />
            <span className="flex flex-1 flex-col gap-1.5"><Bar w="62%" /><Bar w="38%" tone="bg-line-2" /></span>
            <Badge tone="ok" dot>Regular</Badge>
          </div>
          <div className="card p-3">
            <span className="text-[11px] font-semibold text-ink-3">Today</span>
            <div className="mt-2 flex flex-col gap-2">
              <span className="flex items-center gap-2 rounded-lg border p-2" style={{ background: "var(--tint)", borderColor: "var(--accent)" }}>
                <span className="text-[10px] font-bold uppercase text-tint-ink">Now</span><Bar w="52%" tone="bg-line" />
              </span>
              <span className="flex items-center gap-2 rounded-lg border border-line p-2">
                <span className="text-[10px] font-bold uppercase text-ink-3">Next</span><Bar w="44%" tone="bg-line" />
              </span>
            </div>
          </div>
          <div className="card p-3">
            <span className="text-[11px] font-semibold text-ink-3">Your path to graduation</span>
            <div className="mt-2"><PathTiles compact /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroStage() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-line bg-surface-2 px-4 py-8 sm:px-8 sm:py-12" aria-hidden="true">
      <div className="mx-auto flex max-w-[860px] items-center justify-center">
        <div className="hidden min-w-0 flex-1 sm:block"><OfficePanel /></div>
        <div className="sm:-ml-16 sm:mt-24"><StudentPhone /></div>
      </div>
    </div>
  );
}
