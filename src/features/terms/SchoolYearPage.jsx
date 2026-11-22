import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, GraduationCap, Monitor, RotateCcw, Sun } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { beginTerm, getLastStart, getTermsOverview, undoTermStart } from "../../services/terms";
import { termLabel } from "../../lib/format";
import { parseDate } from "../../lib/calendar";
import { ErrorState, FormError, LoadingState, Modal, PageHeader } from "../../components/ui";
import DateRangePicker from "./DateRangePicker";

// Secretary: move the whole site to the next semester, summer or school year. The page offers the usual next term
// (Start 2nd Semester / Start new school year), warns when the current one has not ended yet (Continue is kept for
// demos and testing), then the secretary clicks the first and last day of classes on the calendar and presses Start. Starting only creates the term (sections and classes from the
// curriculum); students are enrolled afterwards on Section allocations > Enroll students, and a student's year level
// follows the subjects they are enrolled in. Undo works until grades are entered. Rules: migration 0017.
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
const short = (sy) => sy.replace("-", "–");

// What can come after the current term. The first choice is the usual one. Titles read "1st Sem · S.Y 2027–2028".
function nextChoices(cur) {
  const [, y2] = cur.school_year.split("-").map(Number);
  const nextYear = `${y2}-${y2 + 1}`;
  const newYear = {
    school_year: nextYear, semester: 1, icon: GraduationCap, title: `1st Sem · S.Y ${short(nextYear)}`, label: "1st Semester",
    what: "A new school year, with a fresh calendar.",
  };
  if (cur.semester === 1) return [{ school_year: cur.school_year, semester: 2, icon: ArrowRight, title: `2nd Sem · S.Y ${short(cur.school_year)}`, label: "2nd Semester", what: "Same sections, the 2nd semester subjects." }];
  const summer = { school_year: cur.school_year, semester: 3, icon: Sun, title: `Summer · S.Y ${short(cur.school_year)}`, label: "Summer", what: "One Summer section per program with the summer subjects (3rd year BSIT and BSCS). You can add other subjects for students who failed them. It comes before the next 1st semester." };
  if (cur.semester === 2) return [newYear, summer];
  return [newYear];
}

// The days a term may use: inside its school year (June to June), and after the current term if it is the same year.
function bounds(next, cur) {
  const y1 = Number(next.school_year.split("-")[0]);
  let min = new Date(y1, 5, 1);
  const max = new Date(y1 + 1, 5, 30);
  if (cur.school_year === next.school_year && cur.ends_on) {
    const after = parseDate(cur.ends_on);
    after.setDate(after.getDate() + 1);
    if (after > min) min = after;
  }
  return { min, max };
}

export default function SchoolYearPage() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [terms, last] = await Promise.all([getTermsOverview(), getLastStart()]);
    return { terms, last };
  }, [], "school-year");
  const [pick, setPick] = useState(0);
  const [dates, setDates] = useState(null); // { starts, ends } once the secretary clicks the calendar
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(null); // "start" | "undo"
  const [step, setStep] = useState("ask"); // "ask" (Start ...?) then "dates" (the calendar)
  const [early, setEarly] = useState(false); // the current term has not ended yet

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const current = data.terms.find((t) => t.is_current);
  const choices = current ? nextChoices(current) : [];
  const next = choices[Math.min(pick, choices.length - 1)];
  const known = next && data.terms.find((t) => t.school_year === next.school_year && t.semester === next.semester);
  const starts = dates ? dates.starts : known?.starts_on ?? "";
  const ends = dates ? dates.ends : known?.ends_on ?? "";
  const last = data.last;
  const lastIsCurrent = last && last.to_term_id === current?.id;
  const isNewYear = next && next.school_year !== current.school_year;
  const range = next && bounds(next, current);
  const daysLeft = current?.ends_on ? Math.ceil((parseDate(current.ends_on) - new Date().setHours(0, 0, 0, 0)) / 86400000) : 0;
  const begin = () => { setErr(""); if (daysLeft > 0) setEarly(true); else setStep("dates"); };

  const doConfirm = async () => {
    setBusy(true);
    setErr("");
    try {
      if (confirm === "start") await beginTerm(next.school_year, next.semester, starts, ends);
      else await undoTermStart();
      window.location.assign("/school-year"); // every page reads the current term: start fresh
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Start a new term" />

      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint text-accent"><CalendarDays size={22} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold text-ink-3">We are now in</h2>
            <p className="font-display text-[20px] font-bold text-ink">{current ? termLabel(current) : "No current term"}</p>
            {current?.starts_on && <p className="text-[14px] text-ink-2">{fmt(current.starts_on)} – {fmt(current.ends_on)}</p>}
          </div>
          {lastIsCurrent && (
            <button className="btn btn-secondary hidden lg:inline-flex" onClick={() => setConfirm("undo")}><RotateCcw size={16} aria-hidden="true" />Undo this start</button>
          )}
        </div>
      </section>

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Starting a new semester or school year is done on a computer.</span>
      </p>

      {next && step === "ask" && (
        <section className="card hidden flex-col gap-4 p-5 sm:p-6 lg:flex">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2"><next.icon size={22} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] font-semibold text-ink-3">Usually next</h2>
              <p className="font-display text-[20px] font-bold text-ink">{next.title}</p>
              <p className="text-[14px] text-ink-2">{next.what}</p>
            </div>
            <button className="btn btn-primary" onClick={begin}>Start {next.title}<ArrowRight size={16} aria-hidden="true" /></button>
          </div>
          {choices.map((c, i) => c === next ? null : (
            <div key={c.title} className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-2"><c.icon size={22} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-ink">{c.title}</p>
                <p className="text-[13px] text-ink-2">{c.what}</p>
              </div>
              <button className="btn btn-secondary" onClick={() => { setPick(i); setDates(null); begin(); }}>Start {c.title}</button>
            </div>
          ))}
        </section>
      )}

      {next && step === "dates" && (
        <section className="card hidden flex-col gap-5 p-5 sm:p-6 lg:flex">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-bold">When are classes{isNewYear ? " in the 1st semester" : ""}?</h2>
              <p className="text-[14px] text-ink-2">Click the first day of classes, then the last day.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setStep("ask"); setDates(null); setErr(""); }}><ArrowLeft size={15} aria-hidden="true" />Back</button>
          </div>
          <DateRangePicker key={next.title} starts={starts} ends={ends} onChange={setDates} min={range.min} max={range.max} termName={next.label} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-[13px] text-ink-3">Sections and subjects are made from the curriculum. Students are enrolled after the start.</p>
            <button className="btn btn-primary" disabled={!starts || !ends} onClick={() => { setErr(""); setConfirm("start"); }}>Start {next.title}</button>
          </div>
          {!confirm && <FormError error={err} />}
        </section>
      )}

      {early && (
        <Modal title={`${termLabel(current)} hasn't ended yet`} onClose={() => setEarly(false)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setEarly(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { setEarly(false); setStep("dates"); }}>Continue anyway</button>
          </>}>
          <p className="text-[14px] text-ink-2">Classes run until {fmt(current.ends_on)}, {daysLeft} {daysLeft === 1 ? "day" : "days"} from now. In real use you start the next term after this one ends. Continue only for a demo or a test.</p>
        </Modal>
      )}

      {confirm && (
        <Modal title={confirm === "start" ? `Start ${next.title}?` : "Undo this start?"} onClose={() => !busy && setConfirm(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
            <button className={confirm === "start" ? "btn btn-primary" : "btn btn-danger"} disabled={busy} onClick={doConfirm}>
              {busy ? (confirm === "start" ? "Starting…" : "Undoing…") : confirm === "start" ? "Start" : "Undo"}
            </button>
          </>}>
          {confirm === "start" ? (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] text-ink-2">
              <li>The whole site switches to {next.title}: {fmt(starts)} to {fmt(ends)}.</li>
              <li>Sections and subjects are made from the curriculum. Nobody is enrolled yet: you add them subject by subject on Section allocations (Add students).</li>
              <li>A student&apos;s year level follows the subjects you enroll them in.</li>
              {isNewYear && <li>The calendar for the new school year starts with just these two days. Add holidays and exams on the Calendar page.</li>}
              <li>You can undo it until a grade is entered.</li>
            </ul>
          ) : (
            <p className="text-[14px] text-ink-2">{current ? termLabel(current) : "This term"} stops being current. Its subjects, enrollments and calendar dates added by the start are removed, and every student gets back their year level and status.</p>
          )}
          <div className="mt-3"><FormError error={err} /></div>
        </Modal>
      )}
    </>
  );
}
