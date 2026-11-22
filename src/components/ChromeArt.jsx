import { Atom, BookOpen, Calculator, GraduationCap, Laptop, Library, NotebookPen, Pencil, Ruler } from "lucide-react";

// Faint line-art school things drawn on the app frame (top bar and the empty lower part of the sidebar). Decoration
// only; sits behind the content of its parent, so the parent needs `relative isolate`.
const BAR = [[GraduationCap, 44, -8], [BookOpen, 36, 10], [Pencil, 32, -14], [Calculator, 36, 8], [Library, 40, -6], [Laptop, 36, 12]];
// [Icon, size, rotation, left %, top %]
const SIDE = [
  [GraduationCap, 84, -10, 72, 62], [BookOpen, 60, 12, 24, 72], [Pencil, 52, -18, 78, 84], [Atom, 56, 8, 30, 90],
  [Ruler, 46, 16, 60, 74], [NotebookPen, 50, -8, 14, 56], [Calculator, 44, 10, 52, 94], [Library, 52, -12, 86, 46],
];

export default function ChromeArt({ variant = "bar" }) {
  if (variant === "side") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[72px] -z-10 h-[40%] overflow-hidden" aria-hidden="true" style={{ color: "var(--chrome-ink)", opacity: 0.13 }}>
        {SIDE.map(([Icon, size, rot, l, t], i) => (
          <span key={i} className="absolute" style={{ left: `${l}%`, top: `${Math.round(((t - 44) / 52) * 100)}%`, transform: `translate(-50%, -50%) rotate(${rot}deg)` }}>
            <Icon size={size} strokeWidth={1.3} />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden items-center justify-end gap-9 overflow-hidden pr-[22%] sm:flex" aria-hidden="true" style={{ color: "var(--chrome-ink)", opacity: 0.13 }}>
      {BAR.map(([Icon, size, rot], i) => (
        <span key={i} style={{ transform: `rotate(${rot}deg)` }}><Icon size={size} strokeWidth={1.3} /></span>
      ))}
    </div>
  );
}
