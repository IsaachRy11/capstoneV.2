import { yearLabel } from "../lib/format";

// Program + year level buttons. `picker` comes from useSectionPicker(); `onChange` runs after any pick.
export default function SectionPicker({ picker, onChange }) {
  const { programs, program, year, pickProgram, pickYear } = picker;
  if (!program) return null;
  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <div className="seg" role="group" aria-label="Program">
        {programs.map((p) => (
          <button key={p.code} aria-pressed={p.code === program.code} onClick={() => { pickProgram(p); onChange?.(); }}>{p.code}</button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="Year level">
        {Array.from({ length: program.duration_years }, (_, i) => i + 1).map((y) => (
          <button key={y} aria-pressed={y === year} onClick={() => { pickYear(y); onChange?.(); }}>{yearLabel(y)}</button>
        ))}
      </div>
    </div>
  );
}
