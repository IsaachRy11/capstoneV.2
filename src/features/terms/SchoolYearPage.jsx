import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CheckCircle2, GraduationCap, Monitor, RotateCcw, Sun } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { beginTerm, getLastStart, getTermsOverview, undoTermStart } from "../../services/terms";
import { termLabel } from "../../lib/format";
import { ErrorState, FormError, LoadingState, Modal, PageHeader } from "../../components/ui";
import StartSummary from "./StartSummary";

// Secretary: move the whole site to the next semester, summer or school year. Pick what comes next, set its dates,
// press Start. Enrolling individual students happens afterwards (Section allocations). Undo works until grades are
// entered. Rules: migration 0017. Desktop only, like every edit.
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
const short = (sy) => sy.replace("-", "–");

// What can come after the current term, in plain words.
function nextChoices(cur) {
  const [, y2] = cur.school_year.split("-").map(Number);
  const nextYear = `${y2}-${y2 + 1}`;
  const newYear = {
    school_year: nextYear, semester: 1, icon: GraduationCap, title: `New school year ${short(nextYear)}`,
    what: "Everyone moves up a year. Students who passed every subject graduate.",
  };
  if (cur.semester === 1) return [{ school_year: cur.school_year, semester: 2, icon: ArrowRight, title: "2nd Semester", what: `Same students and sections, ${short(cur.school_year)} 2nd semester subjects.` }];
  if (cur.semester === 2) return [newYear, { school_year: cur.school_year, semester: 3, icon: Sun, title: "Summer", what: "Only students whose year has summer subjects (3rd year BSIT and BSCS)." }];
  return [newYear];
}

export default function SchoolYearPage() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [terms, last] = await Promise.all([getTermsOverview(), getLastStart()]);
    return { terms, last };
  }, [], "school-year");
  const [pick, setPick] = useState(0);
  const [dates, setDates] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(null); // "start" | "undo"

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const current = data.terms.find((t) => t.is_current);
  const choices = current ? nextChoices(current) : [];
  const next = choices[Math.min(pick, choices.length - 1)];
  const known = next && data.terms.find((t) => t.school_year === next.school_year && t.semester === next.semester);
  const starts = dates.starts ?? known?.starts_on ?? "";
  const ends = dates.ends ?? known?.ends_on ?? "";
  const last = data.last;
  const lastIsCurrent = last && last.to_term_id === current?.id;
  const isNewYear = next && next.semester === 1 && next.school_year !== current.school_year;
  const nextName = next ? (isNewYear ? `school year ${short(next.school_year)}` : `the ${next.title}`) : "";

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

      <section className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint text-accent"><CalendarDays size={22} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold text-ink-3">We are now in</h2>
          <p className="font-display text-[20px] font-bold text-ink">{current ? termLabel(current) : "No current term"}</p>
          {current?.starts_on && <p className="text-[14px] text-ink-2">{fmt(current.starts_on)} – {fmt(current.ends_on)}</p>}
        </div>
        {lastIsCurrent && (
          <button className="btn btn-secondary hidden lg:inline-flex" onClick={() => setConfirm("undo")}><RotateCcw size={16} aria-hidden="true" />Undo this start</button>
        )}
      </section>

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Starting a new semester or school year is done on a computer.</span>
      </p>

      {/* After a start: what it did, and what is left for the secretary. */}
      {lastIsCurrent && last.result && (
        <section className="hidden flex-col gap-3 lg:flex">
          <h2 className="flex items-center gap-2 text-[17px] font-bold"><CheckCircle2 size={20} className="text-ok" aria-hidden="true" />
            Started {new Date(last.started_at).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}. Here is what is left to do</h2>
          <StartSummary result={last.result} />
          <p className="text-[13px] text-ink-3">Enroll students in the remaining subjects on <Link to="/sections">Section allocations</Link>. Undo stays available until a grade is entered.</p>
        </section>
      )}

      {next && (
        <section className="card hidden flex-col gap-5 p-5 sm:p-6 lg:flex">
          <h2 className="text-[19px] font-bold">What comes next?</h2>

          <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="What comes next">
            {choices.map((c, i) => {
              const on = c === next;
              const Icon = c.icon;
              return (
                <button key={c.title} type="button" role="radio" aria-checked={on} onClick={() => { setPick(i); setDates({}); setErr(""); }}
                  className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-colors ${on ? "border-accent bg-tint" : "border-line hover:border-ink-3 hover:bg-hover"}`}>
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-surface text-accent" : "bg-surface-2 text-ink-3"}`}><Icon size={18} aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-ink">{c.title}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">{c.what}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5"><span className="label">First day of classes</span>
              <input type="date" className="field w-auto" value={starts} onChange={(e) => setDates({ ...dates, starts: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="label">Last day</span>
              <input type="date" className="field w-auto" value={ends} min={starts} onChange={(e) => setDates({ ...dates, ends: e.target.value })} /></label>
            <button className="btn btn-primary" disabled={!starts || !ends} onClick={() => { setErr(""); setConfirm("start"); }}>Start {next.title}</button>
          </div>
          {isNewYear && (
            <p className="text-[13px] text-ink-3">Tip: add the new school year&apos;s holidays and exams from the printed calendar on the <Link to="/calendar">Calendar</Link> page.</p>
          )}
          {!confirm && <FormError error={err} />}
        </section>
      )}

      {confirm && (
        <Modal title={confirm === "start" ? `Start ${nextName}?` : "Undo this start?"} onClose={() => !busy && setConfirm(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
            <button className={confirm === "start" ? "btn btn-primary" : "btn btn-danger"} disabled={busy} onClick={doConfirm}>
              {busy ? (confirm === "start" ? "Starting… this takes a few seconds" : "Undoing…") : confirm === "start" ? `Start ${next.title}` : "Undo"}
            </button>
          </>}>
          {confirm === "start" ? (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[14px] text-ink-2">
              <li>The whole site switches to {next.title} ({fmt(starts)} – {fmt(ends)}).</li>
              {isNewYear && <li>Every student moves up a year, except students in their last year who still have subjects to pass.</li>}
              <li>Students are placed in their sections with their subjects. Subjects whose prerequisite isn&apos;t passed are skipped.</li>
              <li>Afterwards you&apos;ll see what is left to enroll by hand.</li>
              <li>You can undo it until a grade is entered.</li>
            </ul>
          ) : (
            <p className="text-[14px] text-ink-2">{current ? termLabel(current) : "This term"} stops being current. Its classes and placements are removed, and every student gets back their year level and status.</p>
          )}
          <div className="mt-3"><FormError error={err} /></div>
        </Modal>
      )}
    </>
  );
}
