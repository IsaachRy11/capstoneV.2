// Database tests: builds a throwaway Postgres in memory (PGlite) from supabase/migrations + seed.sql,
// then checks the security rules, enrollment rules, grade log and all-or-nothing writes as each role.
// Never touches the real Supabase project. Run with `npm test`.
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
let db;
let SEC;
let STU;

// Stand-ins for the parts of Supabase that plain Postgres doesn't have (auth, storage, API roles).
const SUPABASE_STUBS = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
`;

// Runs SQL as a signed-in user (or anon when uid is null). Returns { rows } or { error }.
async function as(role, uid, sql) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return { rows: (await db.query(sql)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec("reset role;");
  }
}
const one = async (sql) => (await db.query(sql)).rows[0];
// Runs SQL as the database owner: no signed-in secretary, so the secretary-only prerequisite rule is skipped while
// seats, status and clash rules still fire. For setup rows in tests about those other rules.
const asDb = async (sql) => {
  // as() leaves the last signed-in user set on the connection; clear it so nobody counts as the secretary.
  await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  try { return { rows: (await db.query(sql)).rows }; } catch (e) { return { error: e.message }; }
};
const bsit = "(select id from programs where code = 'BSIT')";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const dir = join(root, "migrations");
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(join(dir, f), "utf8"));
  // Supabase grants table access to the API roles by default; RLS then decides which rows they see.
  await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
                 grant usage on all sequences in schema public to authenticated;`);
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
  // Sign-in accounts are linked by ID: secretary ID CCS-001, and the first 2nd-year BSIT student as the demo student.
  const demo = (await db.query(`select s.id from students s join programs p on p.id = s.program_id where p.code = 'BSIT' and s.year_level = 2 order by s.id limit 1`)).rows[0].id;
  await db.exec(`insert into auth.users (email) values ('ccs-001@staff.ccs-monitor.test'), ('${demo.toLowerCase()}@students.ccs-monitor.test')`);
  const users = (await db.query(`select email, id from auth.users`)).rows;
  SEC = users.find((u) => u.email.startsWith("ccs-001")).id;
  STU = users.find((u) => u.email.endsWith("@students.ccs-monitor.test")).id;
}, 120_000);

describe("seed data", () => {
  it("has the official AY 2024-2025 curricula active (unit totals match the printed checklists)", async () => {
    const terms = (await db.query(`
      select p.code, s.year_level y, s.semester sem, count(*)::int n, sum(s.units)::int units
      from curriculum_subjects s join curricula c on c.id = s.curriculum_id and c.is_active
      join programs p on p.id = c.program_id
      group by 1, 2, 3 order by 1, 2, 3`)).rows;
    const units = Object.fromEntries(terms.map((t) => [`${t.code} ${t.y}-${t.sem}`, t.units]));
    expect(units).toEqual({
      "BSIT 1-1": 25, "BSIT 1-2": 28, "BSIT 2-1": 25, "BSIT 2-2": 25, "BSIT 3-1": 25, "BSIT 3-2": 22, "BSIT 3-3": 4, "BSIT 4-1": 19, "BSIT 4-2": 9,
      "BSCS 1-1": 25, "BSCS 1-2": 28, "BSCS 2-1": 25, "BSCS 2-2": 25, "BSCS 3-1": 22, "BSCS 3-2": 25, "BSCS 3-3": 4, "BSCS 4-1": 19, "BSCS 4-2": 9,
      "ACT 1-1": 22, "ACT 1-2": 25, "ACT 2-1": 22, "ACT 2-2": 13,
    });
    const count = (code) => terms.filter((t) => t.code === code).reduce((a, t) => a + t.n, 0);
    expect([count("BSIT"), count("BSCS"), count("ACT")]).toEqual([65, 65, 29]);
    // The old website curricula stay (inactive) so older records keep pointing at real subjects.
    expect(await one(`select count(*)::int n from curricula where not is_active`)).toEqual({ n: 3 });
    // BSCS 4th year uses CS 401 / CS 402 (migration 0023); BSIT keeps IT 401 / IT 402.
    const codes = (await db.query(`select p.code prog, s.code from curriculum_subjects s
      join curricula c on c.id = s.curriculum_id and c.is_active join programs p on p.id = c.program_id
      where s.code in ('IT 401','IT 402','CS 401','CS 402') order by 1, 2`)).rows.map((r) => `${r.prog} ${r.code}`);
    expect(codes).toEqual(["BSCS CS 401", "BSCS CS 402", "BSIT IT 401", "BSIT IT 402"]);
  });

  it("has the official prerequisites and year-standing rules", async () => {
    const pre = async (program, code) => (await db.query(`
      select string_agg(pre.code, ', ' order by pre.code) codes, max(s.standing_required) standing
      from curriculum_subjects s join curricula c on c.id = s.curriculum_id and c.is_active
      join programs p on p.id = c.program_id and p.code = '${program}'
      left join subject_prerequisites sp on sp.subject_id = s.id
      left join curriculum_subjects pre on pre.id = sp.prerequisite_id
      where s.code = '${code}'`)).rows[0];
    expect(await pre("BSIT", "IT 215")).toEqual({ codes: "IT 201, IT 202", standing: null });
    expect(await pre("BSIT", "CAPSTONE 2")).toEqual({ codes: "CAPSTONE 1", standing: null });
    expect(await pre("BSIT", "PRAC")).toEqual({ codes: null, standing: 4 });
    expect(await pre("BSCS", "CS 311")).toEqual({ codes: "CS 306, CS 307", standing: null });
    expect(await pre("ACT", "ACT 212")).toEqual({ codes: "ACT 204", standing: null });
    expect(await pre("ACT", "PATHFIT 4")).toEqual({ codes: "PATHFIT 1, PATHFIT 2", standing: null });
  });

  it("gives 4th-year students the summer subjects (Capstone 1 / Thesis 1) before 4th year", async () => {
    const r = await one(`
      select count(distinct e.student_id)::int n from enrollments e
      join class_offerings o on o.id = e.offering_id join curriculum_subjects s on s.id = o.curriculum_subject_id
      where s.code in ('CAPSTONE 1', 'THESIS 1')`);
    expect(r.n).toBe(40); // 2 sections x 10 students in each of BSIT and BSCS 4th year
  });

  it("has the official SY 2026-2027 calendar and term dates", async () => {
    const terms = (await db.query(`select semester, starts_on::text s, ends_on::text e from school_terms where school_year = '2026-2027' order by semester`)).rows;
    expect(terms).toEqual([
      { semester: 1, s: "2026-07-06", e: "2026-11-07" },
      { semester: 2, s: "2026-11-23", e: "2027-04-23" },
      { semester: 3, s: "2027-05-03", e: "2027-06-11" },
    ]);
    expect(await one(`select count(*)::int n from school_calendar_events`)).toEqual({ n: 39 });
    // Start and end of classes on the calendar match the term dates.
    const classes = (await db.query(`select title, starts_on::text d from school_calendar_events where kind = 'classes' order by starts_on`)).rows;
    expect(classes.map((c) => c.d)).toEqual(["2026-07-06", "2026-11-07", "2026-11-23", "2027-04-23", "2027-05-03", "2027-06-11"]);
    const exams = await one(`select count(*)::int n from school_calendar_events where kind = 'exam'`);
    expect(exams.n).toBe(10);
  });

  it("links every calendar date to its school term, worked out from the date", async () => {
    expect(await one(`select count(*)::int n from school_calendar_events where school_term_id is null`)).toEqual({ n: 0 });
    const sem = (d) => one(`select t.semester from school_calendar_events e join school_terms t on t.id = e.school_term_id
                            where e.school_year = '2026-2027' and e.starts_on = '${d}' limit 1`);
    // Inside a term, and in the semestral break (Nov 8-22): the break belongs to the semester that just ended.
    expect((await sem("2026-11-23")).semester).toBe(2);
    const inBreak = await one(`select count(*)::int n, count(*) filter (where t.semester = 1)::int first
                               from school_calendar_events e join school_terms t on t.id = e.school_term_id
                               where e.starts_on between '2026-11-08' and '2026-11-22'`);
    expect(inBreak.n).toBeGreaterThan(0);
    expect(inBreak.first).toBe(inBreak.n);
    // A new date links itself, whatever link is sent.
    const add = await as("authenticated", SEC, `insert into school_calendar_events (school_year, title, starts_on, ends_on, kind, school_term_id)
                                                 values ('2026-2027', 'Link test', '2027-01-15', '2027-01-15', 'school', null) returning school_term_id`);
    const t2 = await one(`select id from school_terms where school_year = '2026-2027' and semester = 2`);
    expect(add.rows[0].school_term_id).toBe(t2.id);
    // Moving a term's dates relinks that school year's calendar.
    await db.exec(`update school_terms set ends_on = '2027-01-10' where school_year = '2026-2027' and semester = 2`);
    expect((await one(`select school_term_id from school_calendar_events where title = 'Link test'`)).school_term_id).toBe(t2.id);
    await db.exec(`update school_terms set ends_on = '2027-04-23' where school_year = '2026-2027' and semester = 2;
                   delete from school_calendar_events where title = 'Link test'`);
  });

  it("lets students read the calendar but not change it", async () => {
    expect((await as("authenticated", STU, `select count(*)::int n from school_calendar_events`)).rows[0].n).toBe(39);
    const w = await as("authenticated", STU, `update school_calendar_events set title = 'x' returning id`);
    expect(w.rows ?? []).toHaveLength(0);
    expect((await as("authenticated", SEC, `update school_calendar_events set title = title where id = (select min(id) from school_calendar_events) returning id`)).rows).toHaveLength(1);
  });

  it("has S, T, U, V sections in 1st year, S, T, U in 2nd, S, T in 3rd and 4th (ACT stops at 2nd year)", async () => {
    const rows = (await db.query(`select program_code p, year_level y, string_agg(right(name, 1), '' order by name) letters
      from v_section_capacity group by 1, 2 order by 1, 2`)).rows;
    expect(rows).toEqual([
      { p: "ACT", y: 1, letters: "STUV" }, { p: "ACT", y: 2, letters: "STU" },
      { p: "BSCS", y: 1, letters: "STUV" }, { p: "BSCS", y: 2, letters: "STU" }, { p: "BSCS", y: 3, letters: "ST" }, { p: "BSCS", y: 4, letters: "ST" },
      { p: "BSIT", y: 1, letters: "STUV" }, { p: "BSIT", y: 2, letters: "STU" }, { p: "BSIT", y: 3, letters: "ST" }, { p: "BSIT", y: 4, letters: "ST" },
    ]);
  });

  it("puts 10 students in every section", async () => {
    const counts = (await db.query(`select enrolled::int n from v_section_capacity`)).rows;
    expect(counts).toHaveLength(29);
    expect(counts.every((r) => r.n === 10)).toBe(true);
  });

  it("gives every section a shiftee, a transferee, a returnee and some irregular students", async () => {
    const rows = (await db.query(`
      select sec.name,
             count(*) filter (where s.admission_type = 'shiftee')::int shiftee,
             count(*) filter (where s.admission_type = 'transferee')::int transferee,
             count(*) filter (where s.admission_type = 'returnee')::int returnee,
             count(*) filter (where v.standing = 'irregular')::int irregular
      from students s join v_student_overview v on v.id = s.id
      join registrations r on r.student_id = s.id join sections sec on sec.id = r.section_id
      join school_terms t on t.id = sec.school_term_id and t.is_current
      group by sec.name`)).rows;
    expect(rows).toHaveLength(29);
    for (const r of rows) {
      expect([r.name, r.shiftee >= 1, r.transferee >= 1, r.returnee >= 1, r.irregular >= 1]).toEqual([r.name, true, true, true, true]);
    }
  });

  it("keeps each class in one room with no double-booked rooms", async () => {
    const multi = await one(`select count(*)::int n from (select offering_id from class_meetings group by offering_id having count(distinct room_id) > 1) z`);
    const clashes = await one(`select count(*)::int n from class_meetings a join class_meetings b on a.id < b.id and a.weekday = b.weekday and a.room_id = b.room_id and a.starts_at < b.ends_at and b.starts_at < a.ends_at join rooms r on r.id = a.room_id and r.name <> 'Gymnasium'`);
    expect(multi.n).toBe(0);
    expect(clashes.n).toBe(0);
  });
});

describe("security rules (RLS)", () => {
  it("shows logged-out visitors nothing", async () => {
    expect((await as("anon", null, `select count(*)::int n from students`)).rows[0].n).toBe(0);
  });

  it("lets a student see only their own record", async () => {
    expect((await as("authenticated", STU, `select count(*)::int n from students`)).rows[0].n).toBe(1);
    expect((await as("authenticated", STU, `select count(*)::int n from enrollments where student_id <> (select id from students where auth_user_id = '${STU}')`)).rows[0].n).toBe(0);
  });

  it("lets the secretary see every student", async () => {
    const everyone = await one(`select count(*)::int n from students`);
    expect(everyone.n).toBeGreaterThan(100);
    expect((await as("authenticated", SEC, `select count(*)::int n from students`)).rows[0].n).toBe(everyone.n);
  });

  it("does not let a student change grades or the curriculum", async () => {
    expect((await as("authenticated", STU, `update enrollments set final_grade = 1 returning id`)).rows).toHaveLength(0);
    expect((await as("authenticated", STU, `update curriculum_subjects set units = 1 returning id`)).rows).toHaveLength(0);
  });

  it("keeps the security helpers out of the public API", async () => {
    expect((await as("authenticated", SEC, `select public.is_secretary()`)).error).toBeTruthy();
  });

  // Guards future migrations: a new table without RLS would be readable by anyone with the API key.
  it("has RLS switched on for every table", async () => {
    const open = (await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity order by 1`)).rows.map((r) => r.relname);
    expect(open).toEqual([]);
  });

  // A view without security_invoker runs as its owner and skips RLS, leaking every row.
  it("makes every view follow the caller's RLS", async () => {
    const leaky = (await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v'
        and coalesce(array_to_string(c.reloptions, ','), '') !~ 'security_invoker=(true|on|1)' order by 1`)).rows.map((r) => r.relname);
    expect(leaky).toEqual([]);
  });
});

describe("add_student (one transaction)", () => {
  it("with a section: creates the student, registers them and enrolls them in every class of the section", async () => {
    const s = await one(`select id from sections where name = 'BSIT 1-S' and school_term_id = (select id from school_terms where is_current)`);
    const r = await as("authenticated", SEC, `select public.add_student('2026-9099','Test','Student',${bsit},1::smallint,'new',${s.id}) sec`);
    expect(r.rows[0].sec).toBe("BSIT 1-S");
    const made = await one(`select (select count(*)::int from registrations where student_id='2026-9099') r, (select count(*)::int from enrollments where student_id='2026-9099') e`);
    expect(made).toEqual({ r: 1, e: 9 }); // BSIT 1st year, 1st semester: 9 subjects (AY 2024-2025 checklist)
  });

  it("without a section: creates only the student, enrolled nowhere", async () => {
    const r = await as("authenticated", SEC, `select public.add_student('2026-9079','Plain','Student',${bsit},1::smallint,'new') sec`);
    expect(r.error).toBeUndefined();
    expect(r.rows[0].sec).toBeNull();
    const made = await one(`select (select count(*)::int from students where id='2026-9079') s, (select count(*)::int from registrations where student_id='2026-9079') r, (select count(*)::int from enrollments where student_id='2026-9079') e`);
    expect(made).toEqual({ s: 1, r: 0, e: 0 });
  });

  it("leaves nothing behind when it fails", async () => {
    const r = await as("authenticated", SEC, `select public.add_student('2026-9099','Dup','Id',${bsit},1::smallint,'new',(select id from sections where name = 'BSIT 1-T' and school_term_id = (select id from school_terms where is_current)))`);
    expect(r.error).toBeTruthy(); // that student ID already exists
    expect(await one(`select count(*)::int n from registrations where student_id='2026-9099'`)).toEqual({ n: 1 });
  });

  it("puts the student in the section you choose", async () => {
    const t = await one(`select id from sections where name = 'BSIT 1-T' and school_term_id = (select id from school_terms where is_current)`);
    const r = await as("authenticated", SEC, `select public.add_student('2026-9096','Pick','Section',${bsit},1::smallint,'new',${t.id}) sec`);
    expect(r.error).toBeUndefined();
    expect(r.rows[0].sec).toBe("BSIT 1-T");
  });

  it("refuses a section from another program or year, and adds nobody", async () => {
    const other = await one(`select id from sections where name = 'BSCS 2-S' and school_term_id = (select id from school_terms where is_current)`);
    const r = await as("authenticated", SEC, `select public.add_student('2026-9095','Wrong','Section',${bsit},1::smallint,'new',${other.id})`);
    expect(r.error).toMatch(/isn't open for this program and year/);
    expect(await one(`select count(*)::int n from students where id='2026-9095'`)).toEqual({ n: 0 });
  });

  it("refuses students", async () => {
    expect((await as("authenticated", STU, `select public.add_student('2026-9097','X','Y',${bsit},1::smallint,'new')`)).error).toBeTruthy();
  });
});

describe("save_grades and the grade change log", () => {
  let enr;
  beforeAll(async () => {
    enr = (await db.query(`select e.id from enrollments e join class_offerings o on o.id = e.offering_id join sections s on s.id = o.section_id join school_terms t on t.id = s.school_term_id and t.is_current where e.student_id = '2026-9099' order by e.id limit 2`)).rows.map((r) => Number(r.id));
  });

  it("saves several grades at once and derives the status", async () => {
    const r = await as("authenticated", SEC, `select public.save_grades('[{"enrollment_id":${enr[0]},"midterm":2.25,"final":2.0,"status":"auto"},{"enrollment_id":${enr[1]},"midterm":3.0,"final":null,"status":"incomplete"}]'::jsonb) n`);
    expect(r.rows[0].n).toBe(2);
    const rows = (await db.query(`select status, final_grade from enrollments where id in (${enr.join(",")}) order by id`)).rows;
    expect(rows[0].status).toBe("passed");
    expect(rows[1]).toMatchObject({ status: "incomplete", final_grade: null });
  });

  it("records who changed each grade", async () => {
    const log = (await as("authenticated", SEC, `select changed_by_name from v_grade_changes where student_id = '2026-9099'`)).rows;
    expect(log).toHaveLength(2);
    expect(log.every((r) => r.changed_by_name === "Demo Secretary")).toBe(true);
  });

  it("hides the log from students", async () => {
    expect((await as("authenticated", STU, `select * from v_grade_changes`)).rows).toHaveLength(0);
  });

  it("changes nothing when any grade in the batch fails", async () => {
    const r = await as("authenticated", SEC, `select public.save_grades('[{"enrollment_id":${enr[0]},"midterm":1.0,"final":1.0,"status":"auto"},{"enrollment_id":999999,"midterm":1,"final":1,"status":"auto"}]'::jsonb)`);
    expect(r.error).toBeTruthy();
    expect(Number((await one(`select final_grade from enrollments where id = ${enr[0]}`)).final_grade)).toBe(2);
  });

  it("rejects grades outside the SJC scale", async () => {
    expect((await as("authenticated", SEC, `update enrollments set final_grade = 4.0 where id = ${enr[0]}`)).error).toBeTruthy();
  });
});

describe("schedule editing rules", () => {
  const offeringOf = (section, n = 0) => one(`
    select o.id from class_offerings o join sections s on s.id = o.section_id join school_terms t on t.id = s.school_term_id and t.is_current
    where s.name = '${section}' order by o.id offset ${n} limit 1`);
  const lab = () => one(`select id from rooms where kind = 'laboratory' and not is_shared order by name limit 1`);

  it("blocks two classes at the same time in one section", async () => {
    const taken = await one(`
      select m.weekday, m.starts_at, m.ends_at, o.section_id from class_meetings m join class_offerings o on o.id = m.offering_id
      join sections s on s.id = o.section_id where s.name = 'BSIT 1-S' order by m.id limit 1`);
    const other = await one(`select id from class_offerings where section_id = ${taken.section_id} and id not in (select offering_id from class_meetings where weekday = ${taken.weekday} and starts_at = '${taken.starts_at}') limit 1`);
    const r = await as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at) values (${other.id}, ${taken.weekday}, '${taken.starts_at}', '${taken.ends_at}')`);
    expect(r.error).toMatch(/^BSIT 1-S already has/);
  });

  it("blocks double-booking a room, but allows the shared gym", async () => {
    const a = await offeringOf("BSCS 3-S");
    const b = await offeringOf("BSCS 4-S");
    const room = await lab();
    const gym = await one(`select id from rooms where is_shared limit 1`);
    expect((await as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at, room_id) values (${a.id}, 6, '17:00', '18:00', ${room.id})`)).error).toBeUndefined();
    const clash = await as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at, room_id) values (${b.id}, 6, '17:30', '18:30', ${room.id})`);
    expect(clash.error).toMatch(/is already taken then by/);
    expect((await as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at, room_id) values (${a.id}, 6, '19:00', '20:00', ${gym.id})`)).error).toBeUndefined();
    expect((await as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at, room_id) values (${b.id}, 6, '19:00', '20:00', ${gym.id})`)).error).toBeUndefined();
  });

  it("blocks a time that clashes for a student already in the class", async () => {
    // Put a BSCS 2-S student into a class from another section (at a free Saturday time), then try to give
    // one of that student's own classes an overlapping Saturday time. Sections share weekly slots, so search
    // for a class whose weekly times don't already clash with the student's.
    const student = await one(`select r.student_id from registrations r join sections s on s.id = r.section_id join school_terms t on t.id = s.school_term_id and t.is_current where s.name = 'BSCS 2-S' order by r.student_id limit 1`);
    const candidates = (await db.query(`select o.id from class_offerings o join sections s on s.id = o.section_id join school_terms t on t.id = s.school_term_id and t.is_current where s.name <> 'BSCS 2-S' order by o.id`)).rows;
    let extra = null;
    for (const c of candidates) {
      const added = await as("authenticated", SEC, `insert into enrollments (student_id, offering_id) values ('${student.student_id}', ${c.id}) returning id`);
      if (!added.error) { extra = c; break; }
    }
    expect(extra).not.toBeNull();
    await db.exec(`insert into class_meetings (offering_id, weekday, starts_at, ends_at) values (${extra.id}, 6, '13:00', '14:00')`);
    const own = await offeringOf("BSCS 2-S");
    const r = await as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at) values (${own.id}, 6, '13:30', '14:30')`);
    expect(r.error).toMatch(/^Student .* in this class has/);
  });

  it("refuses schedule edits from students", async () => {
    const a = await offeringOf("BSIT 2-S");
    expect((await as("authenticated", STU, `insert into class_meetings (offering_id, weekday, starts_at, ends_at) values (${a.id}, 6, '06:00', '07:00') returning id`)).error).toBeTruthy();
  });
});

// Every way a class time can collide, on an otherwise empty day (Sunday) so only these rows are in play.
describe("class time clash scenarios", () => {
  let a, b, other, room1, room2, shed;
  const add = (off, from, to, room = null) => as("authenticated", SEC, `insert into class_meetings (offering_id, weekday, starts_at, ends_at, room_id) values (${off}, 7, '${from}', '${to}', ${room ?? "null"}) returning id`);
  const clear = () => db.exec("delete from class_meetings where weekday = 7");
  beforeAll(async () => {
    const cur = "(select id from school_terms where is_current)";
    // two subjects of one section, and one subject of a section with no students in common
    const secA = await one(`select s.id from sections s where s.school_term_id = ${cur} order by s.id limit 1`);
    [a, b] = (await db.query(`select id from class_offerings where section_id = ${secA.id} order by id limit 2`)).rows.map((r) => r.id);
    other = (await one(`select o.id from class_offerings o join sections s on s.id = o.section_id where s.school_term_id = ${cur} and s.id <> ${secA.id}
      and not exists (select 1 from enrollments e1 join enrollments e2 on e2.student_id = e1.student_id where e1.offering_id = o.id and e2.offering_id in (${a}, ${b})) order by o.id limit 1`)).id;
    [room1, room2] = (await db.query("select id from rooms where not is_shared order by name limit 2")).rows.map((r) => r.id);
    shed = (await one("select id from rooms where is_shared limit 1")).id;
  });

  it("refuses the same subject twice at the same time, even in a different room or with no room", async () => {
    await clear();
    expect((await add(a, "10:00", "11:00", room1)).error).toBeUndefined();
    for (const [from, to, room] of [["10:00", "11:00", room2], ["10:00", "11:00", null], ["10:00", "11:00", room1], ["10:30", "11:30", room2], ["09:30", "10:30", null], ["10:15", "10:45", null], ["09:00", "12:00", null]]) {
      expect((await add(a, from, to, room)).error).toMatch(/already has a class on Sunday/);
    }
  });
  it("allows classes that only touch end to start", async () => {
    await clear();
    await add(a, "10:00", "11:00", room1);
    expect((await add(a, "11:00", "12:00", room1)).error).toBeUndefined();
    expect((await add(b, "09:00", "10:00", room1)).error).toBeUndefined();
  });
  it("refuses two subjects of one section at the same time", async () => {
    await clear();
    await add(a, "10:00", "11:00", room1);
    expect((await add(b, "10:30", "11:30", room2)).error).toMatch(/already has/);
  });
  it("refuses a room that another section is using, and allows another room or no room", async () => {
    await clear();
    await add(a, "10:00", "11:00", room1);
    expect((await add(other, "10:00", "11:00", room1)).error).toMatch(/is already taken then by/);
    expect((await add(other, "10:00", "11:00", room2)).error).toBeUndefined();
  });
  it("lets two sections share the PE shed", async () => {
    await clear();
    expect((await add(a, "13:00", "14:00", shed)).error).toBeUndefined();
    expect((await add(other, "13:00", "14:00", shed)).error).toBeUndefined();
  });
  it("applies the same rules when a time is changed, without clashing with itself", async () => {
    await clear();
    const first = (await add(a, "10:00", "11:00", room1)).rows[0].id;
    const second = (await add(a, "14:00", "15:00", room1)).rows[0].id;
    expect((await as("authenticated", SEC, `update class_meetings set ends_at = '11:30' where id = ${first}`)).error).toBeUndefined();
    expect((await as("authenticated", SEC, `update class_meetings set starts_at = '10:30', ends_at = '11:30' where id = ${second}`)).error).toMatch(/already has a class/);
  });
  it("keeps class times between 7:30 AM and 8:30 PM, ending after they start", async () => {
    await clear();
    expect((await add(a, "07:00", "08:00")).error).toMatch(/between 7:30 AM and 8:30 PM/);
    expect((await add(a, "20:00", "21:00")).error).toMatch(/between 7:30 AM and 8:30 PM/);
    expect((await add(a, "10:00", "10:00")).error).toBeTruthy();
    expect((await add(a, "07:30", "08:30")).error).toBeUndefined();
    expect((await add(a, "19:30", "20:30")).error).toBeUndefined();
    await clear();
  });
});

describe("students only take subjects of their own curriculum", () => {
  const pick = () => one(`
    select st.id as student, o.id as offering from students st
    join class_offerings o on true join sections sec on sec.id = o.section_id join school_terms t on t.id = sec.school_term_id and t.is_current
    where st.program_id = (select id from programs where code = 'BSCS') and st.status = 'active'
      and sec.program_id = (select id from programs where code = 'BSIT') and sec.year_level = 1
    order by st.id, o.id limit 1`);
  it("refuses a BSCS student in a BSIT subject, however it is added", async () => {
    const x = await pick();
    const direct = await as("authenticated", SEC, `insert into enrollments (student_id, offering_id) values ('${x.student}', ${x.offering})`);
    expect(direct.error).toMatch(/Students can only take subjects of their own curriculum/);
    const plan = (await as("authenticated", SEC, `select public.subject_enroll_plan(${x.offering}, array['${x.student}']) as r`)).rows[0].r;
    expect(["other_program", "passed", "enrolled"]).toContain(plan.students[0].state);
    expect(plan.students[0].state).toBe("other_program");
    const saved = (await as("authenticated", SEC, `select public.enroll_in_subject(${x.offering}, array['${x.student}']) as r`)).rows[0].r;
    expect(saved[0]).toMatchObject({ ok: false, why: "not a subject of their curriculum" });
    expect(await one(`select count(*)::int n from enrollments where student_id = '${x.student}' and offering_id = ${x.offering}`)).toEqual({ n: 0 });
  });
});

describe("curriculum editing", () => {
  it("won't delete a subject that is scheduled or graded", async () => {
    const used = await one(`select curriculum_subject_id id from class_offerings limit 1`);
    const r = await as("authenticated", SEC, `delete from curriculum_subjects where id = ${used.id}`);
    expect(r.error).toMatch(/foreign key/);
  });

  it("deletes an unused subject", async () => {
    const cur = await one(`select c.id from curricula c join programs p on p.id = c.program_id where p.code = 'BSIT' and c.is_active`);
    await db.exec(`insert into curriculum_subjects (curriculum_id, year_level, semester, code, title, units, kind) values (${cur.id}, 4, 2, 'IT 999', 'Test subject', 3, 'major')`);
    const r = await as("authenticated", SEC, `delete from curriculum_subjects where code = 'IT 999' returning id`);
    expect(r.rows).toHaveLength(1);
  });
});

describe("enrollment rules", () => {
  it("blocks enrolling into a full class", async () => {
    const off = await one(`select o.id, (select count(*)::int from enrollments where offering_id = o.id) n from class_offerings o join sections s on s.id = o.section_id join school_terms t on t.id = s.school_term_id and t.is_current where s.name = 'BSIT 2-S' order by o.id limit 1`);
    await db.exec(`update class_offerings set capacity = ${off.n} where id = ${off.id}`);
    const r = await asDb(`insert into enrollments (student_id, offering_id) values ('2026-0001', ${off.id})`);
    expect(r.error).toMatch(/^This class is full/);
  });

  it("blocks a schedule clash", async () => {
    const pair = await one(`
      select o2.id from class_meetings m1
      join class_offerings o1 on o1.id = m1.offering_id join sections s1 on s1.id = o1.section_id and s1.name = 'BSIT 1-S'
      join school_terms t on t.id = s1.school_term_id and t.is_current
      join class_meetings m2 on m2.weekday = m1.weekday and m2.starts_at < m1.ends_at and m1.starts_at < m2.ends_at
      join class_offerings o2 on o2.id = m2.offering_id join sections s2 on s2.id = o2.section_id and s2.name <> 'BSIT 1-S' and s2.school_term_id = t.id
      limit 1`);
    const r = await asDb(`insert into enrollments (student_id, offering_id) values ('2026-0001', ${pair.id})`);
    expect(r.error).toMatch(/^Schedule clash with/);
  });
});

// Gaps found by mapping the implicit state machines (migration 0009). Each test reproduces a hole that
// used to be open: a dropped student sneaking back into a full class, history erased by a delete,
// INC with a grade, enrolling a graduated student, and capacity below the headcount.
describe("state machine rules", () => {
  const asSec = (sql) => as("authenticated", SEC, sql);
  const firstOffering = (section, n = 0) => one(`
    select o.id from class_offerings o join sections s on s.id = o.section_id
    join school_terms t on t.id = s.school_term_id and t.is_current
    where s.name = '${section}' order by o.id offset ${n} limit 1`);
  const enrollmentIds = async (offeringId) =>
    (await db.query(`select id, student_id from enrollments where offering_id = ${offeringId} order by id`)).rows.map((r) => ({ id: Number(r.id), student_id: r.student_id }));
  const save = (id, patch) => asSec(`select public.save_grades('[${JSON.stringify({ enrollment_id: id, ...patch })}]'::jsonb)`);
  const newStudent = (id, status = "active") => db.exec(`
    insert into students (id, first_name, last_name, program_id, curriculum_id, year_level, status)
    select '${id}', 'Test', 'Student', p.id, c.id, 3, '${status}'
    from programs p join curricula c on c.program_id = p.id and c.is_active where p.code = 'BSIT'`);

  it("re-checks seats when a dropped student is brought back", async () => {
    const off = await firstOffering("BSIT 3-S");
    const rows = await enrollmentIds(off.id);
    await db.exec(`update class_offerings set capacity = ${rows.length} where id = ${off.id}`); // exactly full
    // Grading must keep working in a full class.
    expect((await save(rows[1].id, { midterm: 2.0, final: null, status: "auto" })).error).toBeUndefined();
    expect((await save(rows[0].id, { midterm: null, final: null, status: "dropped" })).error).toBeUndefined();
    await newStudent("2026-9090");
    expect((await asDb(`insert into enrollments (student_id, offering_id) values ('2026-9090', ${off.id})`)).error).toBeUndefined();
    const back = await save(rows[0].id, { midterm: null, final: null, status: "auto" });
    expect(back.error).toMatch(/^This class is full/);
    expect((await one(`select status from enrollments where id = ${rows[0].id}`)).status).toBe("dropped");
  });

  it("lets a dropped student come back when a seat is free", async () => {
    const off = await firstOffering("BSIT 3-S", 1);
    const [e] = await enrollmentIds(off.id);
    expect((await save(e.id, { midterm: null, final: null, status: "dropped" })).error).toBeUndefined();
    expect((await save(e.id, { midterm: null, final: null, status: "auto" })).error).toBeUndefined();
    expect((await one(`select status from enrollments where id = ${e.id}`)).status).toBe("enrolled");
  });

  it("only enrolls students whose status is active", async () => {
    await newStudent("2026-9091", "graduated");
    const off = await firstOffering("BSIT 4-S");
    const r = await asDb(`insert into enrollments (student_id, offering_id) values ('2026-9091', ${off.id})`);
    expect(r.error).toMatch(/marked as graduated/);
  });

  it("does not enroll a shifted-out student", async () => {
    await newStudent("2026-9089", "shifted_out");
    const off = await firstOffering("BSIT 4-S");
    const r = await asDb(`insert into enrollments (student_id, offering_id) values ('2026-9089', ${off.id})`);
    expect(r.error).toMatch(/marked as shifted out/);
  });

  it("keeps INC and Dropped classes free of final grades", async () => {
    const off = await firstOffering("BSIT 4-S");
    const [e] = await enrollmentIds(off.id);
    expect((await save(e.id, { midterm: null, final: null, status: "incomplete" })).error).toBeUndefined();
    const direct = await asSec(`update enrollments set final_grade = 2.0 where id = ${e.id}`);
    expect(direct.error).toMatch(/can't have a final grade/);
    // The app's route (save_grades) resolves the INC by grading it.
    expect((await save(e.id, { midterm: null, final: 2.0, status: "auto" })).error).toBeUndefined();
    expect((await one(`select status from enrollments where id = ${e.id}`)).status).toBe("passed");
  });

  it("removes a class that has grades, and keeps a permanent log of the removal", async () => {
    const off = await firstOffering("BSIT 4-S");
    const row = (await enrollmentIds(off.id))[3];
    const id = row.id;
    await save(id, { midterm: 2.0, final: 2.25, status: "auto" });
    const student = (await one(`select student_id from enrollments where id = ${id}`)).student_id;
    const r = await asSec(`delete from enrollments where id = ${id} returning id`);
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
    // The grade edit and the removal both stay in the log, which no longer points at the deleted class.
    const log = (await db.query(`select class_removed, enrollment_id, old_final, new_final, subject_code from grade_changes where student_id = '${student}' and subject_code is not null order by id`)).rows;
    const removal = log.filter((l) => l.class_removed);
    expect(removal).toHaveLength(1);
    expect(removal[0]).toMatchObject({ enrollment_id: null, new_final: null });
    expect(Number(removal[0].old_final)).toBe(2.25);
    expect(log.some((l) => !l.class_removed)).toBe(true);
    // Log rows can't be deleted by the secretary.
    const del = await asSec(`delete from grade_changes where student_id = '${student}' returning id`);
    expect(del.rows ?? []).toHaveLength(0);
  });

  it("still lets the secretary remove a class entered by mistake", async () => {
    // A brand-new enrollment has no grades and no history (demo students already have midterm grades).
    await newStudent("2026-9092");
    const off = await firstOffering("BSIT 4-S");
    const added = await asDb(`insert into enrollments (student_id, offering_id) values ('2026-9092', ${off.id}) returning id`);
    expect(added.error).toBeUndefined();
    const r = await asSec(`delete from enrollments where id = ${added.rows[0].id} returning id`);
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
  });

  it("deletes a student added by mistake, with their classes", async () => {
    await newStudent("2026-9093");
    const off = await firstOffering("BSIT 4-S");
    await asDb(`insert into enrollments (student_id, offering_id) values ('2026-9093', ${off.id})`);
    const r = await asSec(`delete from students where id = '2026-9093' returning id`);
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
    expect((await one(`select count(*)::int n from enrollments where student_id = '2026-9093'`)).n).toBe(0);
  });

  it("won't delete a student who has grades", async () => {
    const r = await asSec(`delete from students where id = (select student_id from enrollments where midterm_grade is not null limit 1)`);
    expect(r.error).toMatch(/Shifted out/);
  });

  it("gives every demo student a name nobody else has", async () => {
    const d = await one(`select count(*)::int n, count(distinct lower(first_name || ' ' || last_name))::int names from students where id not like '2026-9%'`);
    expect(d.names).toBe(d.n);
  });

  it("sets seats for one subject at a time and won't go below the students already in it", async () => {
    const off = await firstOffering("BSIT 4-S", 1);
    const enrolled = (await one(`select count(*)::int n from enrollments where offering_id = ${off.id} and status <> 'dropped'`)).n;
    expect(enrolled).toBeGreaterThan(1);
    const tooLow = await asSec(`update class_offerings set capacity = ${enrolled - 1} where id = ${off.id}`);
    expect(tooLow.error).toMatch(/Seats can't be lower than the \d+ students/);
    expect((await asSec(`update class_offerings set capacity = ${enrolled + 5} where id = ${off.id}`)).error).toBeUndefined();
    // Only that subject changed; the section and its other subjects keep following the section's number.
    const other = await firstOffering("BSIT 4-S", 0);
    expect((await one(`select capacity from class_offerings where id = ${other.id}`)).capacity).toBeNull();
    expect((await asSec(`update class_offerings set capacity = null where id = ${off.id}`)).error).toBeUndefined();
  });

  it("won't lower a section's capacity below the students already enrolled", async () => {
    const where = `name = 'BSIT 4-S' and school_term_id = (select id from school_terms where is_current)`;
    const low = await asSec(`update sections set capacity = 5 where ${where}`);
    expect(low.error).toMatch(/Capacity can't be lower than the 10 students/);
    expect((await asSec(`update sections set capacity = 10 where ${where}`)).error).toBeUndefined();
    expect((await asSec(`update sections set capacity = 40 where ${where}`)).error).toBeUndefined();
  });
});

describe("demo grades script", () => {
  it("leaves some students complete, some partly graded and some not yet, and can run twice", async () => {
    const script = readFileSync(join(root, "demo_grades.sql"), "utf8");
    const perStudent = `
      select count(*) filter (where done = total)::int complete,
             count(*) filter (where done > 0 and done < total)::int partial,
             count(*) filter (where done = 0)::int untouched
      from (select e.student_id, count(*) total, count(*) filter (where e.final_grade is not null or e.status in ('incomplete', 'dropped')) done
            from enrollments e join class_offerings o on o.id = e.offering_id join sections s on s.id = o.section_id
            where s.school_term_id = (select id from school_terms where is_current) and e.status <> 'dropped' group by e.student_id) x`;
    await db.exec("begin");
    try {
      const before = await one(perStudent);
      await db.exec(script);
      const after = await one(perStudent);
      expect(after.complete).toBeGreaterThan(before.complete);
      expect(after.partial).toBeGreaterThan(0);
      expect(after.untouched).toBeGreaterThan(0);
      const failedSome = await one(`select count(*)::int n from enrollments where status = 'failed'`);
      expect(failedSome.n).toBeGreaterThan(0);
      await db.exec(script); // again: nothing changes
      expect(await one(perStudent)).toEqual(after);
    } finally {
      await db.exec("rollback");
    }
  }, 120_000);
});

// Runs last: it moves the current term forward. Undo is tested on the way.
describe("starting a term and enrolling sections", () => {
  const asSec = (sql) => as("authenticated", SEC, sql);
  const term = (sy, sem) => one(`select id, is_current from school_terms where school_year = '${sy}' and semester = ${sem}`);
  const rpc = async (sql) => {
    const r = await asSec(`select ${sql} as r`);
    if (r.error) throw new Error(r.error);
    return r.rows[0].r;
  };
  const list = (ids) => `array[${ids.map((i) => `'${i}'`).join(",")}]::text[]`;
  const yearOf = async (id) => (await one(`select year_level from students where id = '${id}'`)).year_level;
  let carried = [];      // students enrolled in BSIT 2-S in the 2nd semester
  let yearsAtStart = {}; // their year levels when the new school year started

  it("lets only the secretary prepare or start a term", async () => {
    expect((await as("authenticated", STU, `select public.prepare_term('2026-2027', 2::smallint, '2026-11-23', '2027-04-23')`)).error).toMatch(/Only the secretary/);
    expect((await as("authenticated", STU, `select public.begin_term('2026-2027', 2::smallint, '2026-11-23', '2027-04-23')`)).error).toMatch(/Only the secretary/);
  });

  it("won't enroll a student in a subject whose prerequisite isn't passed, even by hand", async () => {
    const pair = await one(`
      select sp.subject_id, o.id as offering_id, st.id as student_id
      from subject_prerequisites sp
      join class_offerings o on o.curriculum_subject_id = sp.subject_id
      join sections sec on sec.id = o.section_id and sec.school_term_id = (select id from school_terms where is_current)
      join curriculum_subjects cs on cs.id = sp.subject_id
      join students st on st.status = 'active' and st.curriculum_id = cs.curriculum_id
      where not exists (select 1 from enrollments e join class_offerings oo on oo.id = e.offering_id
                        where e.student_id = st.id and oo.curriculum_subject_id = sp.subject_id)
        and not exists (select 1 from enrollments e join class_offerings oo on oo.id = e.offering_id
                        where e.student_id = st.id and oo.curriculum_subject_id = sp.prerequisite_id and e.status = 'passed')
      limit 1`);
    const r = await asSec(`insert into enrollments (student_id, offering_id) values ('${pair.student_id}', ${pair.offering_id})`);
    expect(r.error).toMatch(/needs .* passed first/);
    const gaps = await asSec(`select public.prerequisite_gaps(${pair.offering_id}, array['${pair.student_id}']) as g`);
    expect(Object.keys(gaps.rows[0].g)).toEqual([pair.student_id]);
    expect(await as("authenticated", STU, `select public.prerequisite_gaps(${pair.offering_id}, array['${pair.student_id}']) as g`).then((x) => x.rows[0].g)).toEqual({});
  });

  it("refuses dates outside the school year or before the previous semester ends", async () => {
    expect((await asSec(`select public.begin_term('2027-2028', 1::smallint, '2026-11-17', '2027-01-27')`)).error).toMatch(/within school year 2027-2028/);
    expect((await asSec(`select public.begin_term('2026-2027', 2::smallint, '2026-11-01', '2027-04-23')`)).error).toMatch(/after the previous semester ends/);
    expect((await asSec(`select public.begin_term('2026-2027', 2::smallint, '2027-04-23', '2026-11-23')`)).error).toMatch(/last day after the first/);
    expect((await term("2026-2027", 2)).is_current).toBe(false);
  });

  it("starts the 2nd semester without enrolling or moving anyone", async () => {
    const snapshot = `select (select sum(year_level)::int from students) y, (select count(*)::int from enrollments) e,
                             (select count(*)::int from school_calendar_events where kind = 'classes' and starts_on = '2026-11-23') c`;
    const before = await one(snapshot);
    const r = await rpc(`public.begin_term('2026-2027', 2::smallint, '2026-11-23', '2027-04-23')`);
    expect(r.new_school_year).toBe(false);
    expect(r.sections).toBeGreaterThan(0);
    expect(r.classes).toBeGreaterThan(r.sections);
    const t2 = await term("2026-2027", 2);
    expect(t2.is_current).toBe(true);
    expect(await one(snapshot)).toEqual(before); // nobody moved, nothing enrolled, no duplicate "start of classes"
    expect((await one(`select count(*)::int n from registrations where school_term_id = ${t2.id}`)).n).toBe(0);
    // Every class is a 2nd-semester subject of its section's year.
    expect((await one(`select count(*)::int n from class_offerings o join sections s on s.id = o.section_id
      join curriculum_subjects cs on cs.id = o.curriculum_subject_id
      where s.school_term_id = ${t2.id} and (cs.semester <> 2 or cs.year_level <> s.year_level)`)).n).toBe(0);
  }, 120_000);

  it("plans and enrolls a section: last term's block, prerequisites and passed subjects skipped", async () => {
    const t2 = await term("2026-2027", 2);
    const sec = await one(`select id from sections where school_term_id = ${t2.id} and name = 'BSIT 2-S'`);
    const plan = await rpc(`public.section_enroll_plan(${sec.id})`);
    expect(plan.from_year).toBe(2);
    expect(plan.students.length).toBeGreaterThan(0);
    expect(plan.students.every((s) => s.last_section === "BSIT 2-S")).toBe(true);
    expect(plan.students.some((s) => s.to_add > 0)).toBe(true);
    carried = plan.students.map((s) => s.student_id);
    const res = await rpc(`public.enroll_in_section(${sec.id}, ${list(carried)})`);
    for (const p of plan.students) expect(res.find((x) => x.student_id === p.student_id).added).toBe(p.to_add);
    expect((await one(`select count(*)::int n from registrations where section_id = ${sec.id}`)).n).toBe(carried.length);
    const blocked = await one(`
      select count(*)::int n from enrollments e
      join class_offerings o on o.id = e.offering_id join sections s on s.id = o.section_id
      join subject_prerequisites sp on sp.subject_id = o.curriculum_subject_id
      where s.school_term_id = ${t2.id}
        and not exists (select 1 from enrollments e2 join class_offerings o2 on o2.id = e2.offering_id
                        where e2.student_id = e.student_id and o2.curriculum_subject_id = sp.prerequisite_id and e2.status = 'passed')`);
    expect(blocked.n).toBe(0);
    // Enrolling again adds nothing.
    const again = await rpc(`public.enroll_in_section(${sec.id}, ${list(carried)})`);
    expect(again.every((x) => x.added === 0)).toBe(true);
  }, 120_000);

  it("adds students to one subject: lists the section and past attempts, skips missing prerequisites", async () => {
    const t2 = await term("2026-2027", 2);
    const off = await one(`select o.id from class_offerings o join sections s on s.id = o.section_id
      where s.school_term_id = ${t2.id} and s.name = 'BSIT 2-S' order by o.id limit 1`);
    const plan = await rpc(`public.subject_enroll_plan(${off.id})`);
    expect(plan.section).toBe("BSIT 2-S");
    expect(plan.students.some((s) => s.in_block)).toBe(true); // the section's own students are listed (and pre-ticked on the page)
    expect(typeof plan.seats_left).toBe("number");
    // "Retake" means an earlier term, never the class they are in now.
    for (const s of plan.students.filter((x) => x.state === "enrolled" && x.retake)) {
      const earlier = await one(`select count(*)::int n from enrollments e join class_offerings o on o.id = e.offering_id join sections sx on sx.id = o.section_id
        where e.student_id = '${s.student_id}' and sx.school_term_id <> ${t2.id} and e.status in ('failed', 'incomplete', 'dropped')
          and o.curriculum_subject_id = (select curriculum_subject_id from class_offerings where id = ${off.id})`);
      expect(earlier.n).toBeGreaterThan(0);
    }
    expect(plan.students.length).toBeGreaterThan(0);
    for (const s of plan.students) expect(["add", "enrolled", "passed", "needs", "over_limit"]).toContain(s.state);
    const ready = plan.students.filter((s) => s.state === "add").map((s) => s.student_id);
    const blocked = plan.students.filter((s) => s.state === "needs").map((s) => s.student_id);
    if (ready.length) {
      const res = await rpc(`public.enroll_in_subject(${off.id}, ${list(ready)})`);
      expect(res.every((x) => x.ok)).toBe(true);
      const again = await rpc(`public.enroll_in_subject(${off.id}, ${list(ready.slice(0, 1))})`);
      expect(again[0].ok).toBe(false);
    }
    if (blocked.length) {
      const res = await rpc(`public.enroll_in_subject(${off.id}, ${list(blocked.slice(0, 1))})`);
      expect(res[0].ok).toBe(false);
      expect(res[0].why).toMatch(/passed first/);
    }
    expect((await as("authenticated", STU, `select public.subject_enroll_plan(${off.id})`)).error).toMatch(/Only the secretary/);
  });

  it("year level follows the enrolled subjects, never below the highest passed year", async () => {
    const t2 = await term("2026-2027", 2);
    const who = carried[0];
    const base = await yearOf(who);
    const third = await one(`select o.id from class_offerings o join sections s on s.id = o.section_id
      where s.school_term_id = ${t2.id} and s.name = 'BSIT 3-S' limit 1`);
    await asDb(`insert into enrollments (student_id, offering_id) values ('${who}', ${third.id})`); // owner: skips the prerequisite rule
    expect(await yearOf(who)).toBe(3);
    await db.exec(`delete from enrollments where student_id = '${who}' and offering_id = ${third.id}`);
    expect(await yearOf(who)).toBe(base);
  });

  it("a summer term is one section per program with the summer subjects; the secretary adds the others", async () => {
    await rpc(`public.prepare_term('2026-2027', 3::smallint, '2027-05-03', '2027-06-11')`);
    const t3 = await term("2026-2027", 3);
    const secs = (await db.query(`select s.id, s.name, p.code from sections s join programs p on p.id = s.program_id where s.school_term_id = ${t3.id} order by p.code`)).rows;
    expect(secs.map((s) => s.name)).toEqual(["ACT Summer", "BSCS Summer", "BSIT Summer"]); // one per program, no year
    // Only the curriculum's own summer subjects are offered at first (ACT has none).
    const offered = (await db.query(`select s.name, cs.semester from class_offerings o join sections s on s.id = o.section_id
      join curriculum_subjects cs on cs.id = o.curriculum_subject_id where s.school_term_id = ${t3.id}`)).rows;
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((o) => o.semester === 3)).toBe(true);
    expect(offered.some((o) => o.name === "ACT Summer")).toBe(false);

    // Candidates: subjects not offered yet, with how many students still owe each one.
    const bsit = secs.find((s) => s.code === "BSIT");
    const cands = await rpc(`public.summer_candidates(${bsit.id})`);
    expect(cands.length).toBeGreaterThan(0);
    const owed = cands.find((c) => c.owing > 0);
    expect(owed).toBeTruthy();
    expect(cands.every((c) => c.owing <= owed.owing)).toBe(true); // the most owed subject comes first
    // Adding a subject opens it; adding it twice is refused; an empty one can be taken back.
    const offId = await rpc(`public.add_summer_subject(${bsit.id}, ${owed.subject_id})`);
    expect((await asSec(`select public.add_summer_subject(${bsit.id}, ${owed.subject_id})`)).error).toMatch(/already offered/);
    expect((await rpc(`public.summer_candidates(${bsit.id})`)).some((c) => c.subject_id === owed.subject_id)).toBe(false);
    // The subject page lists the students who failed it, as retakes.
    const plan = await rpc(`public.subject_enroll_plan(${offId})`);
    expect(plan.students.some((s) => s.retake)).toBe(true);
    await rpc(`public.remove_summer_subject(${offId})`);
    expect((await one(`select count(*)::int n from class_offerings where id = ${offId}`)).n).toBe(0);
    // Not for a regular semester, and not for students.
    const regular = await one(`select s.id from sections s where s.school_term_id = (select id from school_terms where is_current) limit 1`);
    expect((await asSec(`select public.summer_candidates(${regular.id})`)).error).toMatch(/summer section/);
    expect((await as("authenticated", STU, `select public.summer_candidates(${bsit.id})`)).error).toMatch(/Only the secretary/);
  }, 120_000);

  it("a new school year: nobody moves up until enrolled; the next year's block raises the year", async () => {
    for (const id of carried) yearsAtStart[id] = await yearOf(id);
    const r = await rpc(`public.begin_term('2027-2028', 1::smallint, '2027-07-05', '2027-11-06')`);
    expect(r.new_school_year).toBe(true);
    for (const id of carried) expect(await yearOf(id)).toBe(yearsAtStart[id]); // nothing moved yet
    // The new school year's calendar has only its first and last day of classes.
    const ev = (await db.query(`select title from school_calendar_events where school_year = '2027-2028' order by starts_on`)).rows.map((x) => x.title);
    expect(ev).toEqual(["Start of Classes (1st Semester)", "End of Classes (1st Semester)"]);

    const t = await term("2027-2028", 1);
    const sec = await one(`select id from sections where school_term_id = ${t.id} and name = 'BSIT 3-S'`);
    const plan = await rpc(`public.section_enroll_plan(${sec.id})`);
    expect(plan.from_year).toBe(2); // last term's BSIT 2-S
    expect(plan.students.map((s) => s.student_id).sort()).toEqual([...carried].sort());
    // The subject page lists last term's block too, before anyone is registered in the new section.
    const off3 = await one(`select id from class_offerings where section_id = ${sec.id} order by id limit 1`);
    const sp = await rpc(`public.subject_enroll_plan(${off3.id})`);
    expect(sp.students.filter((s) => s.in_block).map((s) => s.student_id).sort()).toEqual([...carried].sort());
    const res = await rpc(`public.enroll_in_section(${sec.id}, ${list(carried)})`);
    expect(res.some((x) => x.added > 0)).toBe(true);
    for (const x of res) {
      if (x.added > 0) expect(await yearOf(x.student_id)).toBe(3);
      else expect(await yearOf(x.student_id)).toBe(yearsAtStart[x.student_id]);
    }
  }, 240_000);

  it("undo puts the previous term back, removes the new term's classes and calendar dates, restores year levels", async () => {
    const t = await term("2027-2028", 1);
    const some = await one(`select e.id from enrollments e join class_offerings o on o.id = e.offering_id
      join sections s on s.id = o.section_id where s.school_term_id = ${t.id} limit 1`);
    if (some) {
      await db.exec(`update enrollments set midterm_grade = 2.00 where id = ${some.id}`);
      expect((await asSec(`select public.undo_term_start()`)).error).toMatch(/Grades or statuses were already entered/);
      await db.exec(`update enrollments set midterm_grade = null where id = ${some.id}`);
      await db.exec(`delete from grade_changes where enrollment_id = ${some.id}`); // test only: as if no grade had been typed
    }
    const u = await rpc(`public.undo_term_start()`);
    expect(u.restored_students).toBeGreaterThan(0);
    expect((await term("2026-2027", 2)).is_current).toBe(true);
    expect((await one(`select count(*)::int n from registrations where school_term_id = ${t.id}`)).n).toBe(0);
    expect((await one(`select count(*)::int n from school_calendar_events where school_year = '2027-2028'`)).n).toBe(0);
    for (const id of carried) expect(await yearOf(id)).toBe(yearsAtStart[id]);
    // Nothing of the undone term stays behind, so starting it again builds it fresh.
    expect((await one(`select count(*)::int n from sections where school_term_id = ${t.id}`)).n).toBe(0);
  }, 120_000);

  it("starting a term again after Undo does not bring back what was added to it before", async () => {
    const sections = () => one(`select count(distinct s.id)::int sections, count(o.id)::int subjects from sections s
      left join class_offerings o on o.section_id = s.id join school_terms t on t.id = s.school_term_id and t.is_current`);
    await rpc(`public.begin_term('2027-2028', 1::smallint, '2027-07-05', '2027-11-06')`);
    const fresh = await sections();
    const extra = await one(`select o.section_id, cs.id as subject from class_offerings o join sections s on s.id = o.section_id
      join school_terms t on t.id = s.school_term_id and t.is_current
      join curriculum_subjects cs on cs.semester = 2 and cs.curriculum_id = (select curriculum_id from curriculum_subjects where id = o.curriculum_subject_id) limit 1`);
    await db.exec(`insert into class_offerings (section_id, curriculum_subject_id) values (${extra.section_id}, ${extra.subject})`);
    await rpc(`public.undo_term_start()`);
    await rpc(`public.begin_term('2027-2028', 1::smallint, '2027-07-05', '2027-11-06')`);
    expect(await sections()).toEqual(fresh);
    await rpc(`public.undo_term_start()`);
  }, 240_000);

  it("every New term path can be undone one step at a time and leaves exactly what was there before", async () => {
    const snapshot = () => one(`select
      (select school_year || '/' || semester from school_terms where is_current) as current,
      (select md5(string_agg(id || ':' || year_level || ':' || status, ',' order by id)) from students) as students,
      (select count(*)::int from sections) as sections, (select count(*)::int from class_offerings) as subjects,
      (select count(*)::int from class_meetings) as class_times, (select count(*)::int from enrollments) as subjects_taken,
      (select count(*)::int from registrations) as registrations, (select count(*)::int from school_calendar_events) as calendar`);
    // As in the app: no later term has been prepared ahead of its start (an earlier test prepared one by hand).
    await db.exec(`delete from sections s using school_terms t where t.id = s.school_term_id and (t.school_year, t.semester) > ('2026-2027', 2)
      and not exists (select 1 from registrations r where r.school_term_id = t.id)`);
    // Each path starts from the 2nd semester: [school year, semester, first day, last day] per step.
    const summer = ["2026-2027", 3, "2027-05-03", "2027-06-11"];
    const first = ["2027-2028", 1, "2027-07-05", "2027-11-06"];
    const second = ["2027-2028", 2, "2027-11-22", "2028-04-21"];
    for (const path of [[summer], [first, second], [summer, first, second]]) {
      const stack = [];
      for (const [year, semester, from, to] of path) {
        stack.push(await snapshot());
        await rpc(`public.begin_term('${year}', ${semester}::smallint, '${from}', '${to}')`);
        const now = await snapshot();
        expect(now.current).toBe(`${year}/${semester}`);
        expect((await one(`select count(o.id)::int n from class_offerings o join sections x on x.id = o.section_id
          join school_terms t on t.id = x.school_term_id and t.is_current`)).n).toBeGreaterThan(0);
      }
      while (stack.length) {
        await rpc(`public.undo_term_start()`);
        expect(await snapshot()).toEqual(stack.pop());
      }
    }
  }, 480_000);

  it("uses each student's own unit limit when enrolling a section", async () => {
    const t2 = await term("2026-2027", 2);
    const sec = await one(`select id from sections where school_term_id = ${t2.id} and name = 'BSIT 1-S'`);
    const plan = await rpc(`public.section_enroll_plan(${sec.id})`);
    const who = plan.students.find((s) => s.to_add >= 2);
    await db.exec(`update students set max_units = 3 where id = '${who.student_id}'`);
    const limited = await rpc(`public.section_enroll_plan(${sec.id}, ${list([who.student_id])})`);
    await db.exec(`update students set max_units = 30 where id = '${who.student_id}'`);
    expect(limited.students[0].to_add).toBe(1);
    expect(limited.students[0].subjects.some((x) => x.state === "over_limit")).toBe(true);
    expect((await asSec(`update students set max_units = 0 where id = '${who.student_id}'`)).error).toMatch(/max_units/);
  });
});

describe("sign-in accounts are linked by ID, not by email", () => {
  it("links the secretary by secretary ID and a student by student ID", async () => {
    expect((await one(`select secretary_id, auth_user_id is not null linked from secretaries where secretary_id = 'CCS-001'`))).toEqual({ secretary_id: "CCS-001", linked: true });
    expect((await one(`select count(*)::int n from students where auth_user_id is not null`)).n).toBe(1);
  });
  it("keeps no email on students or secretaries", async () => {
    const cols = (await db.query(`select table_name from information_schema.columns
                                  where table_schema = 'public' and column_name = 'email' and table_name in ('students', 'secretaries')`)).rows;
    expect(cols).toEqual([]);
  });
});

describe("credited subjects and withdrawal", () => {
  const sec = (sql) => as("authenticated", SEC, sql);
  const mk = async (id, type, program = "BSIT") => {
    await db.exec(`insert into students (id, first_name, last_name, program_id, curriculum_id, year_level, admission_type)
      select '${id}', 'Test', '${id}', p.id, c.id, 1, '${type}' from programs p join curricula c on c.program_id = p.id and c.is_active where p.code = '${program}'`);
  };
  const credit = (student, subjectId, final = 1.75, midterm = 2.0) => sec(`insert into student_credits (student_id, curriculum_subject_id, midterm_grade, final_grade) values ('${student}', ${subjectId}, ${midterm}, ${final}) returning id`);
  const passed = async (student, subjectId) => (await one(`select private.has_passed('${student}', ${subjectId}) p`)).p;
  // A subject with a prerequisite, and that prerequisite.
  const pair = () => one(`select sp.subject_id, sp.prerequisite_id, pre.year_level pre_year from subject_prerequisites sp
    join curriculum_subjects cs on cs.id = sp.subject_id join curriculum_subjects pre on pre.id = sp.prerequisite_id
    join curricula c on c.id = cs.curriculum_id and c.is_active join programs p on p.id = c.program_id where p.code = 'BSIT' order by pre.year_level desc, sp.subject_id limit 1`);

  beforeAll(async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    await mk("2099-0001", "transferee");
    await mk("2099-0002", "new");
    await mk("2099-0003", "shiftee");
  });

  it("only the secretary credits, only shiftees and transferees, only their own curriculum", async () => {
    const p = await pair();
    expect((await as("authenticated", STU, `insert into student_credits (student_id, curriculum_subject_id, final_grade) values ('2099-0001', ${p.prerequisite_id}, 1.5)`)).error).toMatch(/row-level security|only for shiftees/i);
    expect((await credit("2099-0002", p.prerequisite_id)).error).toMatch(/only for shiftees and transferees/);
    const other = await one(`select cs.id from curriculum_subjects cs join curricula c on c.id = cs.curriculum_id and c.is_active join programs pr on pr.id = c.program_id where pr.code = 'BSCS' limit 1`);
    expect((await credit("2099-0001", other.id)).error).toMatch(/own curriculum/);
  });

  it("a credit counts as passed, raises the year level and blocks adding the same subject", async () => {
    const p = await pair();
    expect(await passed("2099-0001", p.prerequisite_id)).toBe(false);
    expect((await credit("2099-0001", p.prerequisite_id)).error).toBeUndefined();
    expect(await passed("2099-0001", p.prerequisite_id)).toBe(true);
    expect((await one(`select year_level from students where id = '2099-0001'`)).year_level).toBe(p.pre_year);
    expect((await credit("2099-0001", p.prerequisite_id)).error).toMatch(/duplicate|unique/i);
    const off = await one(`select o.id from class_offerings o limit 1`);
    await db.exec(`update class_offerings set curriculum_subject_id = curriculum_subject_id where id = ${off.id}`);
    const same = await one(`select o.id from class_offerings o where o.curriculum_subject_id = ${p.prerequisite_id} limit 1`);
    if (same) expect((await sec(`insert into enrollments (student_id, offering_id) values ('2099-0001', ${same.id})`)).error).toMatch(/already credited/);
  });

  it("removing a credit keeps the row as the log, and a credit can't be erased or revived", async () => {
    const p = await pair();
    const row = await one(`select id from student_credits where student_id = '2099-0001' and removed_at is null`);
    await sec(`delete from student_credits where id = ${row.id}`);
    expect((await one(`select count(*)::int n from student_credits where id = ${row.id}`)).n).toBe(1);
    expect((await sec(`update student_credits set removed_at = now() where id = ${row.id}`)).error).toBeUndefined();
    expect(await one(`select removed_by from student_credits where id = ${row.id}`)).toEqual({ removed_by: SEC });
    expect(await passed("2099-0001", p.prerequisite_id)).toBe(false);
    expect((await sec(`update student_credits set removed_at = null where id = ${row.id}`)).error).toMatch(/only be removed/);
    expect((await sec(`delete from students where id = '2099-0001'`)).error).toMatch(/record is kept/);
  });

  it("needs a final grade on the official scale, and the grades can't be edited afterwards", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    await mk("2099-0006", "transferee");
    const p = await pair();
    expect((await credit("2099-0006", p.prerequisite_id, "null")).error).toMatch(/Enter the final grade/);
    expect((await credit("2099-0006", p.prerequisite_id, 1.2)).error).toMatch(/final_scale/);
    expect((await credit("2099-0006", p.prerequisite_id, 2.5)).error).toBeUndefined();
    expect((await sec(`update student_credits set final_grade = 1.0 where student_id = '2099-0006'`)).error).toMatch(/only be removed/);
  });

  it("a failed grade is kept but is not a credit: nothing counts, and the student can take the subject", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    await mk("2099-0007", "shiftee");
    const p = await pair();
    expect((await credit("2099-0007", p.prerequisite_id, 5.0)).error).toBeUndefined();
    expect((await one(`select is_credited from student_credits where student_id = '2099-0007'`)).is_credited).toBe(false);
    expect(await passed("2099-0007", p.prerequisite_id)).toBe(false);
    expect((await one(`select year_level from students where id = '2099-0007'`)).year_level).toBe(1);
    const same = await one(`select o.id from class_offerings o join sections s on s.id = o.section_id join school_terms t on t.id = s.school_term_id and t.is_current
      where o.curriculum_subject_id = ${p.prerequisite_id} limit 1`);
    if (same) expect((await sec(`select public.subject_enroll_plan(${same.id}, array['2099-0007']) p`)).rows[0].p.students[0].state).not.toBe("passed");
  });

  it("Not credited is a subject to resolve until it is corrected or passed", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    await mk("2099-0008", "transferee");
    const p = await pair();
    const resolve = async () => (await db.query(`select not_credited from v_student_deficiencies where student_id = '2099-0008'`)).rows;
    const standing = async () => (await one(`select standing from v_student_overview where id = '2099-0008'`)).standing;
    await credit("2099-0008", p.prerequisite_id, 5.0);
    expect(await resolve()).toEqual([{ not_credited: true }]);
    expect(await standing()).toBe("irregular");
    const id = (await one(`select id from student_credits where student_id = '2099-0008' and removed_at is null`)).id;
    expect((await sec(`select public.save_credit_grades('[{"id": ${id}, "midterm": 2, "final": 1.5}]') n`)).rows[0].n).toBe(1);
    expect(await resolve()).toEqual([]);
    expect(await passed("2099-0008", p.prerequisite_id)).toBe(true);
    // The old grade stays as the log.
    expect((await db.query(`select final_grade::float f, removed_at is not null gone from student_credits where student_id = '2099-0008' order by id`)).rows)
      .toEqual([{ f: 5, gone: true }, { f: 1.5, gone: false }]);
    expect((await sec(`select public.save_credit_grades('[{"id": ${id}, "midterm": 2, "final": 2}]')`)).error).toMatch(/already changed/);
  });

  it("a subject with a class record here can't be added as an earlier subject", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    const row = await one(`select e.student_id, o.curriculum_subject_id sid from enrollments e join class_offerings o on o.id = e.offering_id
      join students s on s.id = e.student_id where e.status = 'failed' and s.status = 'active' and s.admission_type in ('transferee', 'shiftee')
      and not exists (select 1 from enrollments x join class_offerings ox on ox.id = x.offering_id where x.student_id = e.student_id and ox.curriculum_subject_id = o.curriculum_subject_id and x.status in ('passed', 'enrolled')) limit 1`);
    expect(row).toBeTruthy();
    expect((await credit(row.student_id, row.sid, 1.5)).error).toMatch(/already has a class record here/);
  });

  it("a student reads only their own credits", async () => {
    const p = await pair();
    await credit("2099-0003", p.prerequisite_id);
    const mine = await as("authenticated", STU, `select count(*)::int n from student_credits`);
    expect(mine.rows[0].n).toBe(0);
    expect((await sec(`select count(*)::int n from student_credits where removed_at is null`)).rows[0].n).toBeGreaterThan(0);
  });

  it("withdrawing marks this term's subjects without a result Withdrawn, frees the seats and keeps the rest", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    await mk("2099-0004", "transferee");
    const offs = (await db.query(`select o.id from class_offerings o join sections s on s.id = o.section_id
      join school_terms t on t.id = s.school_term_id and t.is_current join curriculum_subjects cs on cs.id = o.curriculum_subject_id
      join students st on st.id = '2099-0004' and st.curriculum_id = cs.curriculum_id
      where cs.year_level = 1 and not exists (select 1 from class_meetings m where m.offering_id = o.id)
        and (select count(*) from enrollments e where e.offering_id = o.id and e.status <> 'dropped') < coalesce(o.capacity, s.capacity)
      order by o.id`)).rows;
    const all = offs.length >= 2 ? offs : (await db.query(`select o.id from class_offerings o join sections s on s.id = o.section_id
      join school_terms t on t.id = s.school_term_id and t.is_current join curriculum_subjects cs on cs.id = o.curriculum_subject_id
      join students st on st.id = '2099-0004' and st.curriculum_id = cs.curriculum_id where cs.year_level = 1 order by o.id`)).rows;
    await db.exec(`delete from class_meetings where offering_id in (${all[0].id}, ${all[1].id});
      update class_offerings set capacity = 60 where id in (${all[0].id}, ${all[1].id});
      insert into enrollments (student_id, offering_id) values ('2099-0004', ${all[0].id}), ('2099-0004', ${all[1].id});
      update enrollments set midterm_grade = 1.5, final_grade = 1.5 where student_id = '2099-0004' and offering_id = ${all[0].id}`);
    expect((await sec(`update students set status = 'dropped' where id = '2099-0004'`)).error).toBeUndefined();
    const rows = (await db.query(`select offering_id, status from enrollments where student_id = '2099-0004' order by offering_id`)).rows;
    expect(rows.map((r) => r.status)).toEqual(["passed", "withdrawn"]);
    expect((await sec(`insert into enrollments (student_id, offering_id) values ('2099-0004', ${all[2]?.id ?? all[0].id})`)).error).toMatch(/withdrawn/);
  });

  it("one subject can be withdrawn: no grade needed, the seat is freed, and it is not a subject to resolve", async () => {
    await db.exec("select set_config('request.jwt.claim.sub', '', false)");
    await mk("2099-0005", "transferee");
    const off = await one(`select o.id from class_offerings o join sections sc on sc.id = o.section_id
      join school_terms t on t.id = sc.school_term_id and t.is_current join curriculum_subjects cs on cs.id = o.curriculum_subject_id
      join students st on st.id = '2099-0005' and st.curriculum_id = cs.curriculum_id where cs.year_level = 1 order by o.id desc limit 1`);
    await db.exec(`delete from class_meetings where offering_id = ${off.id}; update class_offerings set capacity = 60 where id = ${off.id};
      insert into enrollments (student_id, offering_id) values ('2099-0005', ${off.id})`);
    const e = await one(`select id from enrollments where student_id = '2099-0005'`);
    const save = (status, final = "null") => sec(`select public.save_grades('[{"enrollment_id":${e.id},"midterm":null,"final":${final},"status":"${status}"}]'::jsonb)`);
    expect((await save("withdrawn")).error).toBeUndefined();
    expect((await one(`select status from enrollments where id = ${e.id}`)).status).toBe("withdrawn");
    expect((await one(`select count(*)::int n from v_student_deficiencies where student_id = '2099-0005'`)).n).toBe(0);
    // The seat is free again: seats can be lowered to exactly the students still taking it.
    const taking = (await one(`select count(*)::int n from enrollments where offering_id = ${off.id} and status not in ('dropped','withdrawn')`)).n;
    expect((await sec(`update class_offerings set capacity = ${Math.max(taking, 1)} where id = ${off.id}`)).error).toBeUndefined();
    // Bringing it back checks the seats again.
    if (taking >= 1) expect((await save("auto")).error).toMatch(/full/);
    await db.exec(`update class_offerings set capacity = 60 where id = ${off.id}`);
    expect((await save("auto")).error).toBeUndefined();
    // Dropped still counts against the student.
    expect((await save("dropped")).error).toBeUndefined();
    expect((await one(`select count(*)::int n from v_student_deficiencies where student_id = '2099-0005'`)).n).toBe(1);
  });

  it("a subject with a final grade can't be withdrawn", async () => {
    const e = await one(`select id from enrollments where student_id = '2099-0004' and status = 'passed' limit 1`);
    const r = await sec(`select public.save_grades('[{"enrollment_id":${e.id},"midterm":1.5,"final":null,"status":"withdrawn"}]'::jsonb)`);
    expect(r.error).toMatch(/final grade can't be withdrawn/);
  });

  it("Add students says a student withdrew from the subject this term", async () => {
    const w = await one(`select offering_id from enrollments where student_id = '2099-0004' and status = 'withdrawn' limit 1`);
    const r = await sec(`select public.subject_enroll_plan(${w.offering_id}, array['2099-0004']) p`);
    expect(r.rows[0].p.students[0].state).toBe("withdrawn");
  });
});

// Last on purpose: it leaves the database in a later term with a summer grade in it.
describe("after a summer", () => {
  const asSec = (sql) => as("authenticated", SEC, sql);
  const rpc = async (sql) => {
    const r = await asSec(`select ${sql} as r`);
    if (r.error) throw new Error(r.error);
    return r.rows[0].r;
  };

  it("keeps a summer grade on the record after the next school year starts", async () => {
    await rpc(`public.begin_term('2026-2027', 3::smallint, '2027-05-03', '2027-06-11')`);
    const off = await one(`select o.id, o.curriculum_subject_id as subject, sec.program_id from class_offerings o join sections sec on sec.id = o.section_id
      join school_terms t on t.id = sec.school_term_id and t.is_current join programs p on p.id = sec.program_id where p.code = 'BSIT' order by o.id limit 1`);
    const who = (await one(`select s.id from students s join curriculum_subjects cs on cs.curriculum_id = s.curriculum_id and cs.id = ${off.subject}
      where s.status = 'active' and not exists (select 1 from enrollments e join class_offerings x on x.id = e.offering_id where e.student_id = s.id and x.curriculum_subject_id = ${off.subject}) order by s.id limit 1`)).id;
    await asDb(`insert into enrollments (student_id, offering_id) values ('${who}', ${off.id})`); // owner: skips the prerequisite rule
    const e = await one(`select id from enrollments where student_id = '${who}' and offering_id = ${off.id}`);
    const saved = await asSec(`select public.save_grades('[{"enrollment_id": ${e.id}, "midterm": 1.75, "final": 1.5, "status": "auto"}]')`);
    expect(saved.error).toBeUndefined();
    const row = () => one(`select school_year, semester, is_current, status, final_grade::float as final from v_enrollment_details where enrollment_id = ${e.id}`);
    expect(await row()).toEqual({ school_year: "2026-2027", semester: 3, is_current: true, status: "passed", final: 1.5 });
    // With a grade in it, the summer can no longer be undone...
    expect((await asSec(`select public.undo_term_start()`)).error).toMatch(/Grades or statuses were already entered/);
    // ...and after the next school year starts it stays on the record as that year's summer.
    await rpc(`public.begin_term('2027-2028', 1::smallint, '2027-07-05', '2027-11-06')`);
    expect(await row()).toEqual({ school_year: "2026-2027", semester: 3, is_current: false, status: "passed", final: 1.5 });
    expect((await one(`select private.has_passed('${who}', ${off.subject}) as p`)).p).toBe(true);
  }, 240_000);
});

// Runs on from "after a summer" (the current term is the 1st semester of 2027-2028).
describe("an inactive student when new terms start", () => {
  const asSec = (sql) => as("authenticated", SEC, sql);
  const rpc = async (sql) => {
    const r = await asSec(`select ${sql} as r`);
    if (r.error) throw new Error(r.error);
    return r.rows[0].r;
  };

  it("stays inactive and gets no subjects through a 2nd semester, a summer, a new school year and Undo", async () => {
    const before = await one(`select s.id, s.year_level, (select count(*)::int from enrollments e where e.student_id = s.id) as subjects
      from students s where s.status = 'active' and not exists (select 1 from v_enrollment_details d where d.student_id = s.id and d.is_current and d.status = 'enrolled')
      and exists (select 1 from enrollments e where e.student_id = s.id) order by s.id limit 1`);
    expect((await asSec(`update students set status = 'inactive' where id = '${before.id}'`)).error).toBeUndefined();
    const check = async () => {
      expect(await one(`select s.status::text as status, s.year_level, (select count(*)::int from enrollments e where e.student_id = s.id) as subjects
        from students s where s.id = '${before.id}'`)).toEqual({ status: "inactive", year_level: before.year_level, subjects: before.subjects });
    };
    const terms = [["2027-2028", 2, "2027-11-22", "2028-04-21"], ["2027-2028", 3, "2028-05-01", "2028-06-09"], ["2028-2029", 1, "2028-07-03", "2028-11-04"]];
    for (const [year, semester, from, to] of terms) {
      await rpc(`public.begin_term('${year}', ${semester}::smallint, '${from}', '${to}')`);
      await check();
      const off = await one(`select o.id from class_offerings o join sections x on x.id = o.section_id join school_terms t on t.id = x.school_term_id and t.is_current
        join students s on s.program_id = x.program_id where s.id = '${before.id}' order by o.id limit 1`);
      if (!off) continue;
      const plan = await rpc(`public.subject_enroll_plan(${off.id})`);
      expect(plan.students.map((x) => x.student_id)).not.toContain(before.id);
      expect((await asSec(`insert into enrollments (student_id, offering_id) values ('${before.id}', ${off.id})`)).error).toBeTruthy();
    }
    await rpc(`public.undo_term_start()`);
    await check();
    // Coming back: set to Active again, with the same record.
    expect((await asSec(`update students set status = 'active' where id = '${before.id}'`)).error).toBeUndefined();
    expect((await one(`select count(*)::int as n from enrollments where student_id = '${before.id}'`)).n).toBe(before.subjects);
  }, 480_000);
});
