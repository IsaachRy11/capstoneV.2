// The graduation path drawn as small tiles (done / now / to do), used by the landing page pictures.
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
