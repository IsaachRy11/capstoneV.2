import { sectionLetter, yearLabel } from "../lib/format";

// Program + year level (+ section letter) buttons. `picker` comes from useSectionPicker(); `onChange` runs after any pick.
export default function SectionPicker({ picker, onChange }) {
  const { programs, program, year, section, sectionsHere = [], pickProgram, pickYear, pickSection } = picker;
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
      {sectionsHere.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-3">Section</span>
          <div className="seg" role="group" aria-label="Section">
            {sectionsHere.map((s) => (
              <button key={s.id} aria-pressed={s.id === section?.id} aria-label={`Section ${sectionLetter(s.name)}`} onClick={() => { pickSection(s); onChange?.(); }}>{sectionLetter(s.name)}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
