// A quiet, living background: a dot grid (like graph paper, the curriculum sheet) with a few soft shapes and rings
// that drift very slowly. It sits behind everything (fixed, negative z-index), so put `isolate` on the page root.
// No gradients of color: only the theme's own tint and line colors, so it works in light and dark.
export default function Backdrop({ still = false }) {
  return (
    <div aria-hidden="true" className={`backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden ${still ? "backdrop-still" : ""}`}>
      <span className="bd-dots" />
      <span className="bd-shape bd-a" />
      <span className="bd-shape bd-b" />
      <span className="bd-ring bd-c" />
      <span className="bd-ring bd-d" />
      <span className="bd-ring bd-e" />
    </div>
  );
}
