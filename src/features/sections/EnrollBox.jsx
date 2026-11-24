import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

// The seats line of a subject, with "Add students to <code>": the Add students page for this one subject
// (retakes, irregular students). Whole sections use the button at the top of Section allocations.
export default function EnrollBox({ section, offering }) {
  const seatsLeft = (offering.capacity ?? section.capacity) - offering.enrolled;
  const code = offering.curriculum_subjects.code;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3.5 sm:px-6">
      <span className="text-[13px] text-ink-2">
        <span className="font-semibold text-ink">{offering.enrolled} {offering.enrolled === 1 ? "student" : "students"}</span> ·{" "}
        {seatsLeft > 0 ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left` : "Subject is full"}
      </span>
      {seatsLeft > 0 && (
        <Link to={`/sections/enroll?offering=${offering.id}`} className="btn btn-secondary btn-sm hidden lg:inline-flex">
          <UserPlus size={14} aria-hidden="true" />Add students to {code}
        </Link>
      )}
    </div>
  );
}
