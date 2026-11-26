import { Link } from "react-router-dom";
import { ChevronDown, CircleHelp, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { GradeLegend, PageHeader } from "../../components/ui";

// Short answers to the questions people actually have about this system. Facts only; for anything
// about a real record, the answer is the CCS Secretary's Office.
const COMMON = [
  {
    q: "How do I sign in?",
    a: <>Students sign in with their student ID (for example 2025-0001). The secretary signs in with a secretary ID, such as CCS-001. Forgot your password? The CCS Secretary's Office can reset it.</>,
  },
  {
    q: "How do I change my password or theme?",
    a: <>Open <Link to="/settings">Settings</Link> from the account menu. You can switch between light and dark, and set a new password (at least 8 characters).</>,
  },
  {
    q: "What do the grade colors mean?",
    a: (
      <div className="flex flex-col gap-3">
        <span>Grades run from 1.00 (highest) to 3.00 (still passing). 5.00 is failed. NC (no credit) can still be resolved. NC and Dropped are statuses, not grades.</span>
        <GradeLegend className="rounded-lg border border-line px-4 py-3" />
      </div>
    ),
  },
  {
    q: "What are Student type and Status?",
    a: <>Student type is how the student came in: Freshman (a first-time 1st year student), Continuing, Transferee or Shiftee. Status is where they stand now: Regular, Irregular, Graduated, Withdrawn or Shifted out.</>,
  },
  {
    q: "What do Regular and Irregular mean?",
    a: <>Regular: nothing to resolve. Irregular: at least one failed, NC or dropped subject that hasn't been passed yet, or a missing prerequisite. The system works this out from the grades on record.</>,
  },
];

const STUDENT = [
  {
    q: "Where do I see what I still need to take?",
    a: <>The <Link to="/progress">Subject tracker</Link> has two views. <strong>This semester</strong> shows what you're taking now and what passing each subject opens up. <strong>Roadmap</strong> shows what you've completed and every semester still ahead, with anything that's blocking a subject. At the bottom of both there's a button to your full curriculum with its prerequisites. Your Midterm and Final grades are on the <Link to="/record">Academic record</Link>. Subjects you can't take yet say what they need first: a prerequisite subject or a year standing (for example, 4th year standing for the practicum), as on the official CCS curriculum checklist.</>,
  },
  {
    q: "I think my grade or record is wrong.",
    a: <>Visit the CCS Secretary's Office. Only the secretary can change records, and every grade change is saved with who changed it and when.</>,
  },
];

const SECRETARY = [
  {
    q: "Why can't I add a student to a subject?",
    a: <>The subject is full, its schedule clashes with another subject of that student, a prerequisite isn't passed yet, the student would go over their unit limit, or the student's status isn't Active. The message tells you which. Change the seats, or fix the student's record, and try again.</>,
  },
  {
    q: "Can I remove a student from a subject after grades were entered?",
    a: <>Yes. You are asked to confirm, the grades go away with the subject, and the removal is saved in the student's grade change history, which can't be edited or deleted.</>,
  },
  {
    q: "What happens when a student is Withdrawn?",
    a: <>They leave the current semester: its subjects without a result are marked Dropped and their seats are freed. Earlier semesters and results already given don't change. If they come back, set them to Active and add their subjects. To undo a withdrawal made by mistake, set Active, then use Encode grades and press Drop again on each subject; a free seat and no schedule clash are required.</>,
  },
  {
    q: "What are credited subjects?",
    a: <>Subjects a shiftee or transferee already passed before, accepted by the school. On the student's record, use Add credited subjects. A credit counts as passed, has no grade, and can be removed if added by mistake; the system logs who added or removed it. A subject the student still has to take is added in Section allocations as usual.</>,
  },
  {
    q: "What does Student status do?",
    a: <>It is set on the student's record: Active, Graduated, Withdrawn or Shifted out. Regular and Irregular are worked out automatically for active students. A student never graduates automatically: you set Graduated on their record after checking everything the school requires. Only active students can be enrolled in subjects. Graduated, Withdrawn and Shifted out students have their own tabs on the Students page.</>,
  },
  {
    q: "Why can't I delete a subject?",
    a: <>A subject that is already scheduled or graded can't be deleted, so no records are lost.</>,
  },
  {
    q: "Why was a class time refused?",
    a: <>It overlaps another subject of the same section, a room that is already booked, or an enrolled student's other subject. The PE shed is the only room that can be shared.</>,
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
      <PageHeader title="Help center" subtitle="Quick answers about using the system." />
      <section className="card overflow-hidden" aria-label="Questions">
        <div className="card-head flex items-center gap-2.5 px-5 py-3.5">
          <CircleHelp size={18} className="text-accent" aria-hidden="true" />
          <h2 className="text-[15px] font-bold text-ink">Common questions</h2>
          <span className="ml-auto text-[13px] text-ink-3">{list.length} questions</span>
        </div>
        {list.map((item) => <Question key={item.q} {...item} />)}
      </section>
      {user.role !== "secretary" && (
        <section className="card flex items-start gap-3.5 p-5">
          <Building2 size={22} className="shrink-0 text-accent" aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold text-ink">Still need help?</h2>
            <p className="mt-1 text-[14px] text-ink-2">Visit the CCS Secretary's Office at Saint Joseph College, Maasin City. Records, grades and accounts are handled there.</p>
          </div>
        </section>
      )}
    </>
  );
}
