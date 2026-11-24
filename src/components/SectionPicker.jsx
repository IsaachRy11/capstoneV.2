import { useState } from "react";
import { sectionLetter, yearLabel } from "../lib/format";

const SUMMER_NOTE = "Summer opens after the 2nd semester, when a Summer term is started on New term. Its sections show here then.";

// Program + year level (+ section letter) buttons. `picker` comes from useSectionPicker(); `onChange` runs after any pick.
// In a summer term the years are greyed out and "Summer" is the one section to look at. In the other terms "Summer" is
// greyed out instead; tapping it explains when it opens (a tap works on phones, where a hover title doesn't).
// Phones: one full-width switcher per row (program, year, section), like an app; wider screens keep them inline.
export default function SectionPicker({ picker, onChange }) {
  const { programs, program, year, summer, section, sectionsHere = [], pickProgram, pickYear, pickSection } = picker;
  const [note, setNote] = useState(false);
  if (!program) return null;
  return (
    <div className="no-print flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="seg seg-fill" role="group" aria-label="Program">
          {programs.map((p) => (
            <button key={p.code} aria-pressed={p.code === program.code} onClick={() => { pickProgram(p); onChange?.(); }}>{p.code}</button>
          ))}
        </div>
        <div className="seg seg-fill" role="group" aria-label="Year level">
          {Array.from({ length: program.duration_years }, (_, i) => i + 1).map((y) => (
            <button key={y} aria-pressed={y === year} disabled={summer} title={summer ? "Not offered in the summer: see Summer" : undefined}
              onClick={() => { pickYear(y); onChange?.(); }}>{yearLabel(y)}</button>
          ))}
          {summer
            ? <button aria-pressed="true">Summer</button>
            : <button type="button" aria-disabled="true" aria-expanded={note} aria-controls="summer-note" title={SUMMER_NOTE} onClick={() => setNote((v) => !v)}>Summer</button>}
        </div>
        {sectionsHere.length > 1 && !summer && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[13px] font-semibold text-ink-3">Section</span>
            <div className="seg seg-fill" role="group" aria-label="Section">
              {sectionsHere.map((s) => (
                <button key={s.id} aria-pressed={s.id === section?.id} aria-label={`Section ${sectionLetter(s.name)}`} onClick={() => { pickSection(s); onChange?.(); }}>{sectionLetter(s.name)}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      {!summer && note && <p id="summer-note" role="status" className="text-[13px] text-ink-3">{SUMMER_NOTE}</p>}
    </div>
  );
}
