import ResolveBox from "../progress/ResolveBox";
import { useProgress } from "../progress/useProgress";

const REASON = { failed: "Failed", incomplete: "NC", dropped: "Dropped" };

// The Academic record's copy of the tracker's box. It lists the same subjects the record counts (deficiencies from
// the database), joined with the curriculum so each line can show its place and open the subject preview.
export default function MyResolveBox({ deficiencies }) {
  const { data } = useProgress();
  if (!data) return null;
  const items = new Map();
  for (const d of deficiencies) {
    const subject = data.progress.subjects.find((s) => s.code === d.code);
    if (subject) items.set(subject.id, { ...subject, backReason: d.not_credited ? "Not credited" : REASON[d.status] || d.status });
  }
  return <ResolveBox items={[...items.values()].sort((a, b) => a.year_level - b.year_level || a.semester - b.semester || a.sort_order - b.sort_order)} student={data.student} className="no-print" />;
}
