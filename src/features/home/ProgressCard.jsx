import { Link } from "react-router-dom";
import { ChevronRight, GraduationCap } from "lucide-react";
import { semesterLabel, sumUnits, yearLabel } from "../../lib/format";
import { requirementText } from "../../lib/progress";

// Home: where the student stands in the whole program, and what comes next.
// progress comes from buildProgress(); next is { year, semester } or null (last semester).
export default function ProgressCard({ progress, next, className = "" }) {
  const pct = progress.totalUnits ? Math.round((progress.unitsEarned / progress.totalUnits) * 100) : 0;
  const nextSubjects = next ? progress.subjects.filter((s) => s.year_level === next.year && s.semester === next.semester) : [];
  // "Blocked": a prerequisite was failed or never taken, or the year standing isn't reached yet.
  // "Waiting": the only missing prerequisites are subjects the student is taking right now.
  const blocked = nextSubjects.filter((s) => s.missingPrereqs.some((p) => p.state !== "in_progress") || (requirementText(s, next.year) && !s.missingPrereqs.length));
  const waiting = nextSubjects.filter((s) => !blocked.includes(s) && s.missingPrereqs.length > 0);
  const retakes = next ? progress.back.filter((s) => s.semester === next.semester) : [];

  return (
    <section className={`card flex flex-col gap-5 p-5 sm:p-6 ${className}`} aria-label="Your progress">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-bold">Your progress</h2>
          <span className="font-mono text-[13px] text-ink-2">{pct}%</span>
        </div>
        <div className="bar mt-3" role="img" aria-label={`${pct} percent of your program's units earned`}><span style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-[13px] text-ink-3">
          {progress.unitsEarned} of {progress.totalUnits} units earned · {progress.passedCount} of {progress.total} subjects passed
        </p>
      </div>

      <div className="border-t border-line-2 pt-4">
        {next ? (
          <>
            <h3 className="text-[14px] font-bold">Next semester: {yearLabel(next.year)}, {semesterLabel(next.semester)}</h3>
            <p className="mt-1 text-[13px] text-ink-3">{nextSubjects.length} subjects · {sumUnits(nextSubjects)} units</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
              {blocked.length > 0 && (
                <li className="text-warn">{blocked.length} {blocked.length === 1 ? "subject is" : "subjects are"} blocked until a prerequisite or year standing is met</li>
              )}
              {waiting.length > 0 && (
                <li className="text-ink-2">{waiting.length} {waiting.length === 1 ? "subject opens" : "subjects open"} once you pass what you're taking now</li>
              )}
              {retakes.length > 0 && (
                <li className="text-bad">{retakes.length} failed {retakes.length === 1 ? "subject is" : "subjects are"} offered again</li>
              )}
              {blocked.length === 0 && waiting.length === 0 && retakes.length === 0 && <li className="text-ink-2">Nothing is blocking your next semester.</li>}
            </ul>
          </>
        ) : (
          <p className="flex items-center gap-2.5 text-[14px] text-ink-2">
            <GraduationCap size={20} className="shrink-0 text-accent" aria-hidden="true" />
            This is the last semester of your program.
          </p>
        )}
      </div>

      <Link to="/progress" className="mt-auto inline-flex min-h-10 items-center gap-1 text-[14px] font-semibold">
        Open subject tracker<ChevronRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
