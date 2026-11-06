import { Database, Eye, History, ShieldCheck, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";

// What the system stores and who can see it. Describes how this app actually works (roles and
// database security rules); it is not a legal policy of the college.
export default function PrivacyPage() {
  const { user } = useAuth();
  const isSecretary = user.role === "secretary";

  const sections = [
    {
      icon: Database,
      title: "What is stored",
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>Name, student ID, email, program, year level and student type</li>
          <li>Section, enrolled classes, schedules and rooms</li>
          <li>Midterm and final grades, and their status</li>
          <li>Your profile picture, if you add one</li>
        </ul>
      ),
    },
    {
      icon: Eye,
      title: "Who can see it",
      body: isSecretary
        ? <>The CCS secretary can see every student's record. Each student can see only their own. Signed-out visitors see nothing.</>
        : <>You see only your own record. The CCS secretary can see every student's record. Other students and signed-out visitors cannot see yours.</>,
    },
    {
      icon: ShieldCheck,
      title: "How it's protected",
      body: <>These rules are enforced by the database itself, not just hidden on screen. Passwords are stored as one-way hashes, so no one can read them.</>,
    },
    {
      icon: History,
      title: "Grade changes are recorded",
      body: <>Every grade change is saved with the old and new grade, who made it and when. Only the secretary can view this history.</>,
    },
    {
      icon: UserCheck,
      title: "Your rights",
      body: <>Under the Data Privacy Act of 2012 (Republic Act No. 10173), you can ask for your personal information to be corrected. Visit the CCS office.</>,
    },
  ];

  return (
    <>
      <PageHeader title="Privacy" subtitle="What the system keeps about you, and who can see it." />
      <div className="flex max-w-[760px] flex-col gap-4">
        {sections.map(({ icon: Icon, title, body }) => (
          <section key={title} className="card flex items-start gap-3.5 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint text-tint-ink"><Icon size={19} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink">{title}</h2>
              <div className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{body}</div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
