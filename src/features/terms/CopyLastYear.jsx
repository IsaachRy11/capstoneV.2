import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { addCalendarEvents, getCalendarEvents, schoolYearOf } from "../../services/catalog";
import { useAsync } from "../../hooks/useAsync";
import { carryOver, EVENT_KINDS } from "../../lib/calendar";
import { FormError } from "../../components/ui";

// After a new school year starts, its calendar holds only the first and last day of classes. This panel offers last
// year's dates as a checklist, moved one year later: fixed holidays come ticked, everything else unticked (exams, breaks,
// registration and school activities change every year and come from the new printed calendar). The secretary edits
// any date, then adds the ticked ones in one go. It shows only while the new year has nothing but its classes dates.
const short = (sy) => sy.replace("-", "–");

export default function CopyLastYear({ schoolYear }) {
  const [y1] = schoolYear.split("-").map(Number);
  const lastYear = `${y1 - 1}-${y1}`;
  const { data: events, reload } = useAsync(getCalendarEvents, [], "calendar-events");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(0);

  if (!events) return null;
  const hasOwn = events.some((e) => e.school_year === schoolYear && e.kind !== "classes");
  const offered = rows ?? carryOver(events, lastYear);
  if (done) {
    return (
      <p role="status" className="hidden rounded-lg px-4 py-3 text-[14px] tone-ok lg:block">
        Added {done} {done === 1 ? "date" : "dates"} to the S.Y {short(schoolYear)} calendar. Add exams and other dates on the <Link to="/calendar" className="font-semibold">Calendar</Link> page.
      </p>
    );
  }
  if (hasOwn || offered.length === 0) return null;

  const set = (key, patch) => setRows(offered.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const ticked = offered.filter((r) => r.ticked);
  const wrongYear = ticked.find((r) => schoolYearOf(r.starts_on) !== schoolYear || r.ends_on < r.starts_on);
  const save = async () => {
    setErr("");
    if (wrongYear) return setErr(`"${wrongYear.title}" has a date outside S.Y ${short(schoolYear)} or ends before it starts.`);
    setBusy(true);
    try {
      await addCalendarEvents(ticked);
      setDone(ticked.length);
      reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card hidden flex-col overflow-hidden lg:flex">
      <div className="flex flex-wrap items-start gap-4 border-b border-line p-5 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint text-accent"><CalendarPlus size={22} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-bold">Fill the S.Y {short(schoolYear)} calendar from last year</h2>
          <p className="mt-1 max-w-[760px] text-[14px] text-ink-2">
            These are the S.Y {short(lastYear)} dates, moved to the same day this year. Holidays that fall on the same day every year are ticked.
            Exams, breaks, registration and school activities change every year: tick them only after checking the new printed calendar, and correct any date.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th className="w-12"><span className="sr-only">Add</span></th><th>Date</th><th>Title</th><th>Type</th></tr></thead>
          <tbody>
            {offered.map((r) => (
              <tr key={r.key}>
                <td><input type="checkbox" className="h-4 w-4" checked={r.ticked} onChange={(e) => set(r.key, { ticked: e.target.checked })} aria-label={`Add ${r.title}`} /></td>
                <td className="whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <input type="date" className="field h-9 w-auto py-0 text-[13px]" value={r.starts_on} aria-label={`${r.title} first day`}
                      onChange={(e) => set(r.key, { starts_on: e.target.value, ends_on: r.ends_on < e.target.value ? e.target.value : r.ends_on })} />
                    {r.ends_on !== r.starts_on && <>
                      <span className="text-ink-3">to</span>
                      <input type="date" className="field h-9 w-auto py-0 text-[13px]" value={r.ends_on} aria-label={`${r.title} last day`} onChange={(e) => set(r.key, { ends_on: e.target.value })} />
                    </>}
                  </span>
                </td>
                <td>
                  <span className="font-semibold text-ink">{r.title}</span>
                  {r.movable && <span className="mt-0.5 block text-[12px] text-ink-3">Date changes every year: check the new calendar</span>}
                </td>
                <td className="whitespace-nowrap text-[13px] text-ink-2">{EVENT_KINDS[r.kind]?.label ?? r.kind}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5 sm:px-6">
        <p className="text-[13px] text-ink-3">{ticked.length} of {offered.length} dates ticked. You can still edit or delete any date later on the Calendar page.</p>
        <button className="btn btn-primary" disabled={busy || ticked.length === 0} onClick={save}>
          {busy ? "Adding…" : `Add ${ticked.length} ${ticked.length === 1 ? "date" : "dates"} to the calendar`}
        </button>
      </div>
      {err && <div className="px-5 pb-5 sm:px-6"><FormError error={err} /></div>}
    </section>
  );
}
