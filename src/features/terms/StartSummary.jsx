import { Link } from "react-router-dom";

// What a start did (or would do): counts first, then the lists the secretary may want to act on.
// `result` is the JSON returned by preview_term_start / start_term.
const LIMIT = 100;

function Count({ label, value, unit }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="text-[12px] font-semibold text-ink-3">{label}</div>
      <div className="mt-1 text-[15px] text-ink"><span className="font-mono text-[20px] font-bold">{value}</span> {unit}</div>
    </div>
  );
}

function List({ title, hint, rows, columns, unit = "subject" }) {
  if (!rows?.length) return null;
  return (
    <details className="card overflow-hidden">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-5 py-3">
        <span className="text-[15px] font-bold text-ink">{title}</span>
        <span className="font-mono text-[13px] text-ink-3">{rows.length} {rows.length === 1 ? unit : `${unit}s`}</span>
      </summary>
      {hint && <p className="border-t border-line px-5 py-2.5 text-[13px] text-ink-3">{hint}</p>}
      <div className="overflow-x-auto border-t border-line">
        <table className="data-table">
          <thead><tr><th>Student ID</th>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {rows.slice(0, LIMIT).map((r, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap font-mono text-[13px]"><Link to={`/students/${r.student_id}`}>{r.student_id}</Link></td>
                {columns.map(([key, label]) => <td key={label} className={key === "code" ? "whitespace-nowrap font-mono text-[13px]" : "text-[13px]"}>{r[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > LIMIT && <p className="border-t border-line px-5 py-2.5 text-[13px] text-ink-3">And {rows.length - LIMIT} more.</p>}
    </details>
  );
}

export default function StartSummary({ result }) {
  if (result.error) return <p role="alert" className="rounded-lg px-4 py-3 text-[14px] tone-bad">{result.error}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Count label="Students placed" value={result.registered} unit="students" />
        <Count label="Classes added" value={result.classes_added} unit="classes" />
        <Count label="Carried subjects placed" value={result.carried_added} unit="subjects" />
        {result.new_school_year && <Count label="Move up a year" value={result.moved_up} unit="students" />}
        {result.new_school_year && <Count label="Stay in their last year" value={result.stayed_in_last_year} unit="students" />}
        <Count label="Graduate" value={result.graduated} unit="students" />
      </div>
      <List title="Waiting for a prerequisite" rows={result.waiting} columns={[["code", "Subject"], ["needs", "Needs first"]]}
        hint="Not added: the student takes the prerequisite first. Add it by hand on Section allocations if the office allows it." />
      <List title="Couldn't be placed" rows={result.unplaced} columns={[["code", "Subject"], ["reason", "Why"]]}
        hint="No class of this subject has a free seat that fits the student's timetable. Add seats or a class time, then add them by hand." />
      <List title="Over the unit limit" rows={result.over_limit} columns={[["code", "Subject"]]} hint="Left out to keep the student within the unit limit." />
      <List title="No section of their year" rows={result.no_section} unit="student" columns={[["program", "Program"], ["year_level", "Year"]]}
        hint="There is no section for their program and year this term. Add one on the next preparation, or place them by hand." />
    </div>
  );
}
