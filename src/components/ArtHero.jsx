import {
  Atom, Award, Backpack, BookOpen, Calculator, FlaskConical, GraduationCap, Laptop, Library, NotebookPen, Pencil, Ruler,
} from "lucide-react";

// An illustrated banner: a flat school color with a scatter of line-art school things (books, a graduation cap, a
// pencil, a laptop...) in a lighter shade, plus a few big soft circles. Decoration only, so it is hidden from
// screen readers. `tone` picks a color (a, b, c or g, see --art-* in index.css); `seed` shifts which icon goes where
// so neighboring pages don't look identical. Text on top is white.
const ICONS = [BookOpen, GraduationCap, Pencil, Laptop, Calculator, Library, Atom, Ruler, NotebookPen, Backpack, Award, FlaskConical];
// [left %, top %, size px, rotation deg, opacity]
const SPOTS = [
  [92, 10, 84, 12, 0.2], [78, 62, 110, -10, 0.16], [64, 14, 64, 18, 0.14], [50, 70, 56, -16, 0.12], [86, 78, 56, 22, 0.18],
  [36, 12, 46, -12, 0.1], [70, 38, 72, 8, 0.12], [96, 44, 52, -20, 0.14], [58, 88, 48, 14, 0.1], [24, 82, 44, -8, 0.08],
  [44, 40, 40, 20, 0.08], [10, 58, 40, -14, 0.08],
];

export function SchoolArt({ seed = 0 }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <span className="absolute -right-24 -top-28 h-80 w-80 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
      <span className="absolute -bottom-32 right-1/4 h-72 w-72 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
      {SPOTS.map(([l, t, size, rot, op], i) => {
        const Icon = ICONS[(i + seed) % ICONS.length];
        return (
          <span key={i} className="absolute" style={{ left: `${l}%`, top: `${t}%`, transform: `translate(-50%, -50%) rotate(${rot}deg)`, opacity: op }}>
            <Icon size={size} strokeWidth={1.4} />
          </span>
        );
      })}
    </div>
  );
}

// `plain`: just the flat color, without the line-art school things (the landing hero has photos instead).
export default function ArtHero({ tone = "a", seed = 0, plain = false, as: Tag = "section", className = "", children }) {
  return (
    <Tag className={`art-hero relative isolate overflow-hidden text-white ${className}`} style={{ background: `var(--art-${tone})` }}>
      {!plain && <SchoolArt seed={seed} />}
      {children}
    </Tag>
  );
}
