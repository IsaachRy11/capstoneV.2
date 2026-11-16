import { useState } from "react";
import { Link } from "react-router-dom";
import { Monitor, RotateCcw } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { discardTerm, getLastStart, getTermsOverview, prepareTerm, previewTermStart, startTerm, undoTermStart } from "../../services/terms";
import { semesterLabel, termLabel } from "../../lib/format";
import { ErrorState, FormError, LoadingState, Modal, PageHeader } from "../../components/ui";
import StartSummary from "./StartSummary";

// Secretary: move the whole site to the next semester, summer or school year in three steps (prepare, check, start),
// with Undo while the new term has no grades. The rules are in migration 0017. Desktop only, like every edit.
const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
const DEFAULT_MAX_UNITS = 30; // placeholder until the CCS office confirms the limit

// What can come after the current term: the next semester, summer, or a new school year.
function nextTerms(cur) {
  const [, y2] = cur.school_year.split("-").map(Number);
  const nextYear = `${y2}-${y2 + 1}`;
  const newYear = { school_year: nextYear, semester: 1, label: `New school year (${nextYear.replace("-", "–")})` };
  if (cur.semester === 1) return [{ school_year: cur.school_year, semester: 2, label: "2nd Semester" }];
  if (cur.semester === 2) return [{ school_year: cur.school_year, semester: 3, label: "Summer" }, newYear];
  return [newYear];
}

function Step({ n, title, children, done }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-[17px] font-bold">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[13px] ${done ? "tone-ok" : "bg-surface-2 text-ink-2"}`}>{n}</span>
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function SchoolYearPage() {
  const { data, error, loading, reload } = useAsync(async () => {
    const [terms, last] = await Promise.all([getTermsOverview(), getLastStart()]);
    return { terms, last };
  }, [], "school-year");
  const [pick, setPick] = useState(0);
  const [dates, setDates] = useState({});
  const [maxUnits, setMaxUnits] = useState(DEFAULT_MAX_UNITS);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(null); // "start" | "discard" | "undo"

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const current = data.terms.find((t) => t.is_current);
  const options = current ? nextTerms(current) : [];
  const target = options[Math.min(pick, options.length - 1)];
  const row = target && data.terms.find((t) => t.school_year === target.school_year && t.semester === target.semester);
  const prepared = row?.sections > 0;
  const starts = dates.starts ?? row?.starts_on ?? "";
  const ends = dates.ends ?? row?.ends_on ?? "";
  const last = data.last;
  const canUndo = last && !last.undone_at && last.to_term_id === current?.id;
  const lastTo = last && data.terms.find((t) => t.id === last.to_term_id);

  const run = async (key, fn) => {
    setBusy(key); setErr("");
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const doPrepare = () => run("prepare", async () => { await prepareTerm(target.school_year, target.semester, starts, ends); setPreview(null); reload(); });
  const doPreview = () => run("preview", async () => setPreview(await previewTermStart(row.id, Number(maxUnits) || null)));
  const after = () => { window.location.assign("/school-year"); }; // every page reads the current term: start fresh
  const doConfirm = () => run(confirm, async () => {
    if (confirm === "discard") { await discardTerm(row.id); setConfirm(null); setPreview(null); reload(); return; }
    if (confirm === "start") await startTerm(row.id, Number(maxUnits) || null);
    if (confirm === "undo") await undoTermStart();
    after();
  });

  return (
    <>
      <PageHeader title="School year" />

      <section className="card p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold text-ink-3">Current term</h2>
        <p className="mt-1 font-display text-[20px] font-bold text-ink">{current ? termLabel(current) : "No current term"}</p>
        {current?.starts_on && <p className="mt-1 text-[14px] text-ink-2">{fmt(current.starts_on)} – {fmt(current.ends_on)}</p>}
      </section>

      <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-2 lg:hidden">
        <Monitor size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
        <span>Starting a new term is done on a computer.</span>
      </p>

      {canUndo && (
        <section className="card hidden items-center justify-between gap-4 p-5 lg:flex">
          <div>
            <h2 className="text-[15px] font-bold">{lastTo ? termLabel(lastTo) : "This term"} was started {new Date(last.started_at).toLocaleDateString("en-PH", { month: "long", day: "numeric" })}</h2>
            <p className="mt-1 text-[13px] text-ink-3">You can undo it until a grade or status is entered in it. Classes added by hand since then are removed too.</p>
          </div>
          <button className="btn btn-secondary shrink-0" onClick={() => setConfirm("undo")}><RotateCcw size={16} aria-hidden="true" />Undo</button>
        </section>
      )}
      {canUndo && last.result && <div className="hidden lg:block"><StartSummary result={last.result} /></div>}

      {target && (
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[19px] font-bold">Start the next term</h2>
            {options.length > 1 && (
              <div className="seg" role="group" aria-label="Next term">
                {options.map((o, i) => (
                  <button key={o.label} type="button" aria-pressed={o === target} onClick={() => { setPick(i); setPreview(null); setDates({}); }}>{o.label}</button>
                ))}
              </div>
            )}
          </div>
          <FormError error={err} />

          <Step n={1} title={`Prepare ${termLabel(target)}`} done={prepared}>
            {prepared ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[14px] text-ink-2">Prepared: <span className="font-mono font-semibold text-ink">{row.sections}</span> sections, {fmt(row.starts_on)} – {fmt(row.ends_on)}.
                  {" "}Check seats on <Link to="/sections">Section allocations</Link> and times on <Link to="/schedules/edit">Edit class times</Link> after the start.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirm("discard")}>Discard</button>
              </div>
            ) : (
              <>
                <p className="text-[14px] text-ink-2">Copies the sections of the latest semester (names, seats, rooms). Each section gets its year's {semesterLabel(target.semester)} subjects
                  from the curriculum, and class times are copied from the last time that semester ran. Students see nothing yet.</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1.5"><span className="label">First day of classes</span>
                    <input type="date" className="field w-auto" value={starts} onChange={(e) => setDates({ ...dates, starts: e.target.value })} /></label>
                  <label className="flex flex-col gap-1.5"><span className="label">Last day</span>
                    <input type="date" className="field w-auto" value={ends} min={starts} onChange={(e) => setDates({ ...dates, ends: e.target.value })} /></label>
                  <button className="btn btn-primary" disabled={!starts || !ends || busy === "prepare"} onClick={doPrepare}>{busy === "prepare" ? "Preparing…" : "Prepare term"}</button>
                </div>
              </>
            )}
            {target.semester === 1 && target.school_year !== current.school_year && (
              <p className="text-[13px] text-ink-3">New school year: add its dates from the school&apos;s printed calendar on the <Link to="/calendar">Calendar</Link> page.</p>
            )}
          </Step>

          <Step n={2} title="Check what will happen" done={!!preview && !preview.error}>
            <p className="text-[14px] text-ink-2">
              {target.semester === 1 && target.school_year !== current.school_year
                ? "Everyone moves up a year except students in their program's last year who still have subjects to pass. "
                : ""}
              Students get their section&apos;s subjects. Subjects from earlier years are listed for the secretary to enroll: nothing is enrolled automatically. A subject waits until its prerequisite is passed.
              Students who passed every subject are marked Graduated. Nothing is saved here.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5"><span className="label">Unit limit per student</span>
                <input type="number" min={1} className="field w-[120px] font-mono" value={maxUnits} onChange={(e) => { setMaxUnits(e.target.value); setPreview(null); }} /></label>
              <button className="btn btn-secondary" disabled={!prepared || busy === "preview"} onClick={doPreview}>{busy === "preview" ? "Checking…" : "Check"}</button>
              <span className="text-[12px] text-ink-3">Default {DEFAULT_MAX_UNITS} units until the CCS office sets the limit.</span>
            </div>
            {preview && <StartSummary result={preview} />}
          </Step>

          <Step n={3} title={`Start ${termLabel(target)}`}>
            <p className="text-[14px] text-ink-2">Switches the whole site to the new term at once: students see their new section and classes right away. You can undo it until grades are entered.</p>
            <div><button className="btn btn-primary" disabled={!preview || !!preview.error} onClick={() => setConfirm("start")}>Start {target.label}</button></div>
          </Step>
        </div>
      )}

      {confirm && (
        <Modal title={confirm === "start" ? `Start ${termLabel(target)}?` : confirm === "undo" ? "Undo the term start?" : "Discard the prepared term?"} onClose={() => setConfirm(null)}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
            <button className={confirm === "start" ? "btn btn-primary" : "btn btn-danger"} disabled={!!busy} onClick={doConfirm}>
              {busy ? "Working…" : confirm === "start" ? "Start term" : confirm === "undo" ? "Undo" : "Discard"}
            </button>
          </>}>
          <p className="text-[14px] text-ink-2">
            {confirm === "start" && `Every page switches to ${termLabel(target)}. Students are placed exactly as the check showed.`}
            {confirm === "undo" && `${current ? termLabel(current) : "The new term"} stops being current, its classes and registrations are removed, and students get back their year level and status.`}
            {confirm === "discard" && "The prepared sections, classes and class times are removed. You can prepare the term again."}
          </p>
          <div className="mt-3"><FormError error={err} /></div>
        </Modal>
      )}
    </>
  );
}
