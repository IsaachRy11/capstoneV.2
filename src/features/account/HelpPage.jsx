import { Link } from "react-router-dom";
import { ChevronDown, CircleHelp, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { BackButton, GradeLegend, PageHeader } from "../../components/ui";

// Short answers to the questions people actually have about this system. Facts only; for anything
// about a real record, the answer is the CCS office.
const COMMON = [
  {
    q: "How do I sign in?",
    a: <>Students sign in with their student ID (for example 2025-0001). Staff sign in with their email. Forgot your password? The CCS office can reset it.</>,
  },
  {
    q: "How do I change my password or theme?",
    a: <>Open <Link to="/settings">Settings</Link> from the account menu. You can switch between light and dark, and set a new password (at least 8 characters).</>,
  },
  {
    q: "What do the grade colors mean?",
    a: (
      <div className="flex flex-col gap-3">
        <span>Grades run from 1.00 (highest) to 3.00 (still passing). 5.00 is failed. INC and Dropped are statuses, not grades.</span>
        <GradeLegend className="rounded-lg border border-line px-4 py-3" />
      </div>
    ),
  },
  {
    q: "What do Regular and Irregular mean?",
    a: <>Regular: no failed subjects. Irregular: at least one failed, INC or dropped subject that hasn't been passed yet, or a missing prerequisite. The system works this out from the grades on record.</>,
  },
];

const STUDENT = [
  {
    q: "Where do I see what I still need to take?",
    a: <>The <Link to="/progress">Subject tracker</Link> lists every subject in your curriculum: passed, current and remaining.</>,
  },
  {
    q: "I think my grade or record is wrong.",
    a: <>Visit the CCS office. Only the secretary can change records, and every grade change is saved with who changed it and when.</>,
  },
];

const SECRETARY = [
  {
    q: "Why can't I enroll a student in a class?",
    a: <>The class is full, its schedule clashes with another class of that student, or the student's status isn't Active. The message tells you which. Raise the section's capacity, pick another class, or change the status on the student's record.</>,
  },
  {
    q: "Why can't I remove a student from a class?",
    a: <>Once a class has a grade, a status such as INC or Dropped, or any grade history, it can't be removed, so the history is kept. Mark the class as Dropped on the student's record instead. Removing only works for a class added by mistake.</>,
  },
  {
    q: "Why can't I put a dropped student back in a class?",
    a: <>Bringing a student back runs the same checks as a new enrollment: the class must have a free seat and no schedule clash.</>,
  },
  {
    q: "What does Student status do?",
    a: <>It is set on the student's record. Only Active students can be enrolled in classes. Inactive, Graduated and Left the college students can't.</>,
  },
  {
    q: "Why can't I delete a subject?",
    a: <>A subject that is already scheduled or graded can't be deleted, so no records are lost.</>,
  },
  {
    q: "Why was a class time refused?",
    a: <>It overlaps another class of the same section, a room that is already booked, or an enrolled student's other class. The gymnasium is the only room that can be shared.</>,
  },
  {
    q: "Where can I see who changed a grade?",
    a: <>Open the student's record. The grade history lists every change with the old and new grade, who made it and when.</>,
  },
];

function Question({ q, a }) {
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 py-3 text-[15px] font-semibold text-ink hover:bg-hover [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{q}</span>
        <ChevronDown size={18} className="shrink-0 text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="px-5 pb-4 text-[14px] leading-relaxed text-ink-2">{a}</div>
    </details>
  );
}

export default function HelpPage() {
  const { user } = useAuth();
  const isSecretary = user.role === "secretary";
  const list = [...COMMON, ...(isSecretary ? SECRETARY : STUDENT)];

  return (
    <>
      <BackButton fallback="/" />
      <PageHeader title="Help center" subtitle="Quick answers about using the system." />
      <section className="card overflow-hidden" aria-label="Questions">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
          <CircleHelp size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-ink">Common questions</h2>
          <span className="ml-auto text-[13px] text-ink-3">{list.length} questions</span>
        </div>
        {list.map((item) => <Question key={item.q} {...item} />)}
      </section>
      <section className="card flex items-start gap-3.5 p-5">
        <Building2 size={22} className="shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h2 className="text-[15px] font-bold text-ink">Still need help?</h2>
          <p className="mt-1 text-[14px] text-ink-2">Visit the CCS office at Saint Joseph College, Maasin City. Records, grades and accounts are handled there.</p>
        </div>
      </section>
    </>
  );
}
