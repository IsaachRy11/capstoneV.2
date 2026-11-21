import { Atom, BookOpen, Calculator, FlaskConical, GraduationCap, Laptop, Library, NotebookPen, Pencil, Ruler } from "lucide-react";

// The page background: a quiet tiled pattern of line-art school things (books, a cap, a pencil, a laptop...) in the
// theme's own grid color. Static, behind everything (fixed, negative z-index), so put `isolate` on the page root.
const ICONS = [BookOpen, GraduationCap, Pencil, Laptop, Calculator, Library, Atom, Ruler, NotebookPen, FlaskConical];
const COLS = 12;
const ROWS = 9;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const r = Math.floor(i / COLS);
  const c = i % COLS;
  if ((r + c) % 2) return null; // every other cell stays empty so the pattern breathes
  return { Icon: ICONS[(r * 3 + c * 7) % ICONS.length], rot: ((r * 5 + c * 11) % 5 - 2) * 9 };
});

export default function Backdrop() {
  return (
    <div aria-hidden="true" className="backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, color: "var(--grid-line)", opacity: 0.5 }}>
        {CELLS.map((cell, i) => (
          <span key={i} className="flex items-center justify-center">
            {cell && <span style={{ transform: `rotate(${cell.rot}deg)` }}><cell.Icon size={34} strokeWidth={1.3} /></span>}
          </span>
        ))}
      </div>
    </div>
  );
}
