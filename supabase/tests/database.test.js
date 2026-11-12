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
  await db.exec(`insert into auth.users (email) values ('demo.secretary@ccs-monitor.test'), ('demo.student@ccs-monitor.test')`);
  const users = (await db.query(`select email, id from auth.users`)).rows;
  SEC = users.find((u) => u.email.startsWith("demo.secretary")).id;
  STU = users.find((u) => u.email.startsWith("demo.student")).id;
}, 120_000);

describe("seed data", () => {
  it("has the official curriculum", async () => {
    expect(await one(`select count(*)::int n from curriculum_subjects`)).toEqual({ n: 91 });
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
    expect(made).toEqual({ r: 1, e: 7 });
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
    const r = await as("authenticated", SEC, `insert into enrollments (student_id, offering_id) values ('2026-0001', ${off.id})`);
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
    const r = await as("authenticated", SEC, `insert into enrollments (student_id, offering_id) values ('2026-0001', ${pair.id})`);
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
    expect((await asSec(`insert into enrollments (student_id, offering_id) values ('2026-9090', ${off.id})`)).error).toBeUndefined();
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
    const r = await asSec(`insert into enrollments (student_id, offering_id) values ('2026-9091', ${off.id})`);
    expect(r.error).toMatch(/marked as graduated/);
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
    const added = await asSec(`insert into enrollments (student_id, offering_id) values ('2026-9092', ${off.id}) returning id`);
    expect(added.error).toBeUndefined();
    const r = await asSec(`delete from enrollments where id = ${added.rows[0].id} returning id`);
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
  });

  it("won't lower a section's capacity below the students already enrolled", async () => {
    const where = `name = 'BSIT 4-S' and school_term_id = (select id from school_terms where is_current)`;
    const low = await asSec(`update sections set capacity = 5 where ${where}`);
    expect(low.error).toMatch(/Capacity can't be lower than the 10 students/);
    expect((await asSec(`update sections set capacity = 10 where ${where}`)).error).toBeUndefined();
    expect((await asSec(`update sections set capacity = 40 where ${where}`)).error).toBeUndefined();
  });
});
