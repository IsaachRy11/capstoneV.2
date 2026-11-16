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
  await db.exec(`insert into auth.users (email) values ('ccs-001@staff.ccs-monitor.test'), ('demo.student@ccs-monitor.test')`);
  const users = (await db.query(`select email, id from auth.users`)).rows;
  SEC = users.find((u) => u.email.startsWith("ccs-001")).id;
  STU = users.find((u) => u.email.startsWith("demo.student")).id;
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
  it("creates the student, registers them and enrolls them in every class of their section", async () => {
    const r = await as("authenticated", SEC, `select public.add_student('2026-9099','Test','Student','test.student@x.test',${bsit},1::smallint,'new') sec`);
    expect(r.rows[0].sec).toBe("BSIT 1-S");
    const made = await one(`select (select count(*)::int from registrations where student_id='2026-9099') r, (select count(*)::int from enrollments where student_id='2026-9099') e`);
    expect(made).toEqual({ r: 1, e: 9 }); // BSIT 1st year, 1st semester: 9 subjects (AY 2024-2025 checklist)
  });

  it("leaves nothing behind when it fails", async () => {
    const r = await as("authenticated", SEC, `select public.add_student('2026-9098','Dup','Email','test.student@x.test',${bsit},1::smallint,'new')`);
    expect(r.error).toBeTruthy();
    expect(await one(`select count(*)::int n from students where id='2026-9098'`)).toEqual({ n: 0 });
  });

  it("puts the student in the section you choose", async () => {
    const t = await one(`select id from sections where name = 'BSIT 1-T' and school_term_id = (select id from school_terms where is_current)`);
    const r = await as("authenticated", SEC, `select public.add_student('2026-9096','Pick','Section','pick.section@x.test',${bsit},1::smallint,'new',${t.id}) sec`);
    expect(r.error).toBeUndefined();
    expect(r.rows[0].sec).toBe("BSIT 1-T");
  });

  it("refuses a section from another program or year, and adds nobody", async () => {
    const other = await one(`select id from sections where name = 'BSCS 2-S' and school_term_id = (select id from school_terms where is_current)`);
    const r = await as("authenticated", SEC, `select public.add_student('2026-9095','Wrong','Section','wrong.section@x.test',${bsit},1::smallint,'new',${other.id})`);
    expect(r.error).toMatch(/isn't open for this program and year/);
    expect(await one(`select count(*)::int n from students where id='2026-9095'`)).toEqual({ n: 0 });
  });

  it("without a choice, uses the section with the most free seats", async () => {
    await db.exec(`update sections set capacity = 60 where name = 'BSIT 1-V' and school_term_id = (select id from school_terms where is_current)`);
    const r = await as("authenticated", SEC, `select public.add_student('2026-9094','Most','Seats','most.seats@x.test',${bsit},1::smallint,'new') sec`);
    await db.exec(`update sections set capacity = 40 where name = 'BSIT 1-V' and school_term_id = (select id from school_terms where is_current)`);
    expect(r.rows[0].sec).toBe("BSIT 1-V");
  });

  it("refuses students", async () => {
    expect((await as("authenticated", STU, `select public.add_student('2026-9097','X','Y','x@y.test',${bsit},1::smallint,'new')`)).error).toBeTruthy();
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
    insert into students (id, first_name, last_name, email, program_id, curriculum_id, year_level, status)
    select '${id}', 'Test', 'Student', 'test${id}@x.test', p.id, c.id, 3, '${status}'
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

  it("won't delete a class that has grades, and keeps the history", async () => {
    const off = await firstOffering("BSIT 4-S");
    const id = (await enrollmentIds(off.id))[3].id;
    await save(id, { midterm: 2.0, final: 2.25, status: "auto" });
    const r = await asSec(`delete from enrollments where id = ${id}`);
    expect(r.error).toMatch(/Mark the class as Dropped/);
    expect((await one(`select count(*)::int n from grade_changes where enrollment_id = ${id}`)).n).toBe(1);
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
describe("starting a new term and a new school year", () => {
  const asSec = (sql) => as("authenticated", SEC, sql);
  const term = (sy, sem) => one(`select id, is_current from school_terms where school_year = '${sy}' and semester = ${sem}`);
  const rpc = async (sql) => {
    const r = await asSec(`select ${sql} as r`);
    if (r.error) throw new Error(r.error);
    return r.rows[0].r;
  };

  it("lets only the secretary prepare a term", async () => {
    const r = await as("authenticated", STU, `select public.prepare_term('2026-2027', 2::smallint, '2026-11-23', '2027-04-23')`);
    expect(r.error).toMatch(/Only the secretary/);
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
    // The warning shown before adding names the same prerequisite.
    const gaps = await asSec(`select public.prerequisite_gaps(${pair.offering_id}, array['${pair.student_id}']) as g`);
    expect(Object.keys(gaps.rows[0].g)).toEqual([pair.student_id]);
    expect(await as("authenticated", STU, `select public.prerequisite_gaps(${pair.offering_id}, array['${pair.student_id}']) as g`).then((x) => x.rows[0].g)).toEqual({});
  });

  it("prepares the 2nd semester from the curriculum, copying sections and class times", async () => {
    const r = await rpc(`public.prepare_term('2026-2027', 2::smallint, '2026-11-23', '2027-04-23')`);
    expect(r.sections).toBeGreaterThan(0);
    // Every class is a 2nd-semester subject of its section's year in the active curriculum.
    const wrong = await one(`
      select count(*)::int n from class_offerings o
      join sections s on s.id = o.section_id join curriculum_subjects cs on cs.id = o.curriculum_subject_id
      where s.school_term_id = ${r.term_id} and (cs.semester <> 2 or cs.year_level <> s.year_level)`);
    expect(wrong.n).toBe(0);
    expect(r.classes).toBeGreaterThan(r.sections);
    const again = await asSec(`select public.prepare_term('2026-2027', 2::smallint, '2026-11-23', '2027-04-23')`);
    expect(again.error).toMatch(/already prepared/);
  }, 60_000);

  it("previews a start without changing anything", async () => {
    const t = await term("2026-2027", 2);
    const before = await one(`select (select count(*)::int from registrations) r, (select count(*)::int from enrollments) e,
                                     (select sum(year_level)::int from students) y`);
    const p = await rpc(`public.preview_term_start(${t.id})`);
    expect(p.error).toBeUndefined();
    expect(p.registered).toBeGreaterThan(0);
    expect(p.classes_added).toBeGreaterThan(0);
    expect(p.new_school_year).toBe(false);
    expect(p.moved_up).toBe(0);
    const after = await one(`select (select count(*)::int from registrations) r, (select count(*)::int from enrollments) e,
                                    (select sum(year_level)::int from students) y`);
    expect(after).toEqual(before);
    expect((await term("2026-2027", 2)).is_current).toBe(false);
  }, 120_000);

  it("leaves out subjects past a student's own unit limit", async () => {
    const term2 = await term("2026-2027", 2);
    const who = await one(`select r.student_id from registrations r where r.school_term_id = (select id from school_terms where is_current) limit 1`);
    await db.exec(`update students set max_units = 3 where id = '${who.student_id}'`);
    const p = await rpc(`public.preview_term_start(${term2.id})`);
    await db.exec(`update students set max_units = 30 where id = '${who.student_id}'`);
    expect(p.over_limit.some((x) => x.student_id === who.student_id)).toBe(true);
    expect((await asSec(`update students set max_units = 0 where id = '${who.student_id}'`)).error).toMatch(/max_units/);
  }, 120_000);

  it("starts the 2nd semester: same year levels, no class whose prerequisite isn't passed, then undoes it", async () => {
    const t = await term("2026-2027", 2);
    const years = await one(`select sum(year_level)::int y from students`);
    const r = await rpc(`public.start_term(${t.id})`);
    expect((await term("2026-2027", 2)).is_current).toBe(true);
    expect((await one(`select sum(year_level)::int y from students`)).y).toBe(years.y);
    const blocked = await one(`
      select count(*)::int n from enrollments e
      join class_offerings o on o.id = e.offering_id join sections s on s.id = o.section_id
      join subject_prerequisites sp on sp.subject_id = o.curriculum_subject_id
      where s.school_term_id = ${t.id}
        and not exists (select 1 from enrollments e2 join class_offerings o2 on o2.id = e2.offering_id
                        where e2.student_id = e.student_id and o2.curriculum_subject_id = sp.prerequisite_id and e2.status = 'passed')`);
    expect(blocked.n).toBe(0);
    expect(r.registered).toBeGreaterThan(0);

    const u = await rpc(`public.undo_term_start()`);
    expect(u.restored_students).toBeGreaterThan(0);
    expect((await term("2026-2027", 1)).is_current).toBe(true);
    expect((await one(`select count(*)::int n from registrations where school_term_id = ${t.id}`)).n).toBe(0);
  }, 120_000);

  it("starts a new school year: everyone moves up except the last year, carried subjects are placed", async () => {
    // A 1st-year student who failed a 1st-semester subject (the seed has some).
    const failed = await one(`
      select e.student_id, o.curriculum_subject_id subject from enrollments e
      join class_offerings o on o.id = e.offering_id join curriculum_subjects cs on cs.id = o.curriculum_subject_id
      join students st on st.id = e.student_id
      where e.status = 'failed' and cs.year_level = 1 and cs.semester = 1 and st.year_level = 1 and st.status = 'active'
        and not exists (select 1 from subject_prerequisites sp where sp.subject_id = cs.id)
      limit 1`);
    const sem2 = await term("2026-2027", 2);
    await rpc(`public.start_term(${sem2.id})`);

    const lastYear = await one(`select count(*)::int n from students st join programs p on p.id = st.program_id
                                where st.status = 'active' and st.year_level = p.duration_years`);
    await rpc(`public.prepare_term('2027-2028', 1::smallint, '2027-07-05', '2027-11-06')`);
    const next = await term("2027-2028", 1);
    const yearsBefore = (await one(`select sum(year_level)::int y from students`)).y;
    const r = await rpc(`public.start_term(${next.id})`);
    expect(r.new_school_year).toBe(true);
    expect(r.moved_up).toBeGreaterThan(0);
    // Last-year students who didn't graduate stay in their last year.
    expect(r.stayed_in_last_year).toBe(lastYear.n - r.graduated);
    expect((await one(`select count(*)::int n from students st join programs p on p.id = st.program_id
                       where st.year_level > p.duration_years`)).n).toBe(0);

    if (failed) {
      const st = await one(`select year_level from students where id = '${failed.student_id}'`);
      expect(st.year_level).toBe(2);
      // The failed 1st-year subject was carried into a 1st-year class of the new term (or reported as unplaced).
      const carried = await one(`
        select count(*)::int n from enrollments e join class_offerings o on o.id = e.offering_id
        join sections s on s.id = o.section_id
        where e.student_id = '${failed.student_id}' and o.curriculum_subject_id = ${failed.subject} and s.school_term_id = ${next.id}`);
      const reported = r.to_place.concat(r.waiting, r.over_limit).some((x) => x.student_id === failed.student_id);
      expect(carried.n).toBe(0);
      expect(reported).toBe(true);
    }
    expect(r.to_place.length).toBeGreaterThan(0);

    // Undo is refused once a grade is entered in the new term. Clearing the grade doesn't help: the change stays in
    // the grade history, and a class with history is never deleted.
    const someEnrollment = await one(`select e.id from enrollments e join class_offerings o on o.id = e.offering_id
                                       join sections sec on sec.id = o.section_id where sec.school_term_id = ${next.id} limit 1`);
    await db.exec(`update enrollments set midterm_grade = 2.00 where id = ${someEnrollment.id}`);
    const refused = await asSec(`select public.undo_term_start()`);
    expect(refused.error).toMatch(/Grades or statuses were already entered/);
    await db.exec(`update enrollments set midterm_grade = null where id = ${someEnrollment.id}`);
    expect((await asSec(`select public.undo_term_start()`)).error).toMatch(/Grades or statuses were already entered/);
    // Test only: wipe that history (as if no grade had ever been typed) to check the undo itself.
    await db.exec(`delete from grade_changes where enrollment_id = ${someEnrollment.id}`);

    // Going back: the previous semester is current again, the new term's classes and registrations are gone,
    // and every student has their old year level and status. The prepared term itself is kept.
    const u = await rpc(`public.undo_term_start()`);
    expect(u.restored_students).toBeGreaterThan(0);
    expect((await term("2026-2027", 2)).is_current).toBe(true);
    expect((await term("2027-2028", 1)).is_current).toBe(false);
    expect((await one(`select count(*)::int n from registrations where school_term_id = ${next.id}`)).n).toBe(0);
    expect((await one(`select count(*)::int n from enrollments e join class_offerings o on o.id = e.offering_id
                       join sections sec on sec.id = o.section_id where sec.school_term_id = ${next.id}`)).n).toBe(0);
    expect((await one(`select sum(year_level)::int y from students`)).y).toBe(yearsBefore);
    expect((await one(`select count(*)::int n from sections where school_term_id = ${next.id}`)).n).toBeGreaterThan(0);
  }, 240_000);
});
