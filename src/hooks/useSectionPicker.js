import { useState } from "react";
import { useAsync } from "./useAsync";
import { getPrograms } from "../services/catalog";
import { listCurrentSections } from "../services/sections";

// Which block section (program + year level + letter) a page is looking at, for this semester.
// Shared by Section allocations and Schedules; draw the buttons with <SectionPicker picker={…} />.
export function useSectionPicker() {
  const [programCode, setProgramCode] = useState(null);
  const [year, setYear] = useState(1);
  const [sectionId, setSectionId] = useState(null);

  const base = useAsync(async () => {
    const [programs, sections] = await Promise.all([getPrograms(), listCurrentSections()]);
    return { programs, sections };
  }, []);

  const programs = base.data?.programs || [];
  const program = programs.find((p) => p.code === programCode) || programs[0];
  // A program year can have several block sections (S, T, U, V); the first is shown until one is picked.
  const sectionsHere = (base.data?.sections || []).filter((s) => s.program_code === program?.code && s.year_level === year);
  const section = sectionsHere.find((s) => s.id === sectionId) || sectionsHere[0];

  const pickProgram = (p) => {
    setProgramCode(p.code);
    setSectionId(null);
    if (year > p.duration_years) setYear(1); // e.g. ACT has no 3rd year
  };

  return {
    loading: base.loading, error: base.error, reload: base.reload,
    programs, program, year, section, sectionsHere,
    pickProgram,
    pickYear: (y) => { setYear(y); setSectionId(null); },
    pickSection: (s) => setSectionId(s.id),
  };
}
