import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, GraduationCap, Monitor, RotateCcw, Sun, UserPlus } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { beginTerm, getLastStart, getTermsOverview, undoTermStart } from "../../services/terms";
import { termLabel } from "../../lib/format";
import { parseDate } from "../../lib/calendar";
import { ErrorState, FormError, LoadingState, Modal, PageHeader } from "../../components/ui";
import DateRangePicker from "./DateRangePicker";

// Secretary: move the whole site to the next semester, summer or school year. Pick what comes next, click the first
// and last day of classes on the calendar, press Start. Starting only creates the term (sections and classes from the
// curriculum); students are enrolled afterwards on Section allocations > Enroll students, and a student's year level
// follows the subjects they are enrolled in. Undo works until grades are entered. Rules: migration 0017.
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
const short = (sy) => sy.replace("-", "–");

// What can come after the current term, in plain words.
function nextChoices(cur) {
  const [, y2] = cur.school_year.split("-").map(Number);
  const nextYear = `${y2}-${y2 + 1}`;
  const newYear = {
    school_year: nextYear, semester: 1, icon: GraduationCap, title: `New school year ${short(nextYear)}`, label: "1st Semester",
    what: "Starts with its 1st semester and a fresh calendar.",
  };
  if (cur.semester === 1) return [{ school_year: cur.school_year, semester: 2, icon: ArrowRight, title: "2nd Semester", label: "2nd Semester", what: "Same sections, the 2nd semester subjects." }];
  if (cur.semester === 2) return [newYear, { school_year: cur.school_year, semester: 3, icon: Sun, title: "Summer", label: "Summer", what: "Only years with summer subjects (3rd year BSIT and BSCS)." }];
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
      <PageHeader title="School year" />

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
        {lastIsCurrent && (
          <div className="hidden flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 px-4 py-3 lg:flex">
            <span className="text-[14px] text-ink-2">Started {new Date(last.started_at).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}. Next step: enroll students, a section at a time.</span>
            <Link to="/sections" className="btn btn-primary btn-sm"><UserPlus size={15} aria-hidden="true" />Go to Section allocations</Link>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Starting a new semester or school year is done on a computer.</span>
      </p>

      {next && (
        <section className="card hidden flex-col gap-6 p-5 sm:p-6 lg:flex">
          <div className="flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">1. What comes next?</h2>
            <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="What comes next">
              {choices.map((c, i) => {
                const on = c === next;
                const Icon = c.icon;
                return (
                  <button key={c.title} type="button" role="radio" aria-checked={on} onClick={() => { setPick(i); setDates(null); setErr(""); }}
                    className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition-colors ${on ? "border-accent bg-tint" : "border-line hover:border-ink-3 hover:bg-hover"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-surface text-accent" : "bg-surface-2 text-ink-3"}`}><Icon size={18} aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold text-ink">{c.title}</span>
                      <span className="block text-[13px] text-ink-2">{c.what}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-[19px] font-bold">2. When are classes{isNewYear ? " in the 1st semester" : ""}?</h2>
            <p className="-mt-1 text-[14px] text-ink-2">Click the first day of classes, then the last day.</p>
            <DateRangePicker key={next.title} starts={starts} ends={ends} onChange={setDates} min={range.min} max={range.max} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-[13px] text-ink-3">Sections and classes are made from the curriculum. Students are enrolled after the start.</p>
            <button className="btn btn-primary" disabled={!starts || !ends} onClick={() => { setErr(""); setConfirm("start"); }}>3. Start {next.title}</button>
          </div>
          {!confirm && <FormError error={err} />}
        </section>
      )}

      {confirm && (
        <Modal title={confirm === "start" ? `Start ${isNewYear ? `school year ${short(next.school_year)}` : `the ${next.title}`}?` : "Undo this start?"} onClose={() => !busy && setConfirm(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
            <button className={confirm === "start" ? "btn btn-primary" : "btn btn-danger"} disabled={busy} onClick={doConfirm}>
              {busy ? (confirm === "start" ? "Starting…" : "Undoing…") : confirm === "start" ? "Start" : "Undo"}
            </button>
          </>}>
          {confirm === "start" ? (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] text-ink-2">
              <li>The whole site switches to {short(next.school_year)} {next.label}: {fmt(starts)} to {fmt(ends)}.</li>
              <li>Sections and classes are made from the curriculum. Nobody is enrolled yet: you enroll them on Section allocations.</li>
              <li>A student&apos;s year level follows the subjects you enroll them in.</li>
              {isNewYear && <li>The calendar for the new school year starts with just these two days. Add holidays and exams on the Calendar page.</li>}
              <li>You can undo it until a grade is entered.</li>
            </ul>
          ) : (
            <p className="text-[14px] text-ink-2">{current ? termLabel(current) : "This term"} stops being current. Its classes, enrollments and calendar dates added by the start are removed, and every student gets back their year level and status.</p>
          )}
          <div className="mt-3"><FormError error={err} /></div>
        </Modal>
      )}
    </>
  );
}
