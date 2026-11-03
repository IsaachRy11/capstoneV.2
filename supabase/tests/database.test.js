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
  it("has the official curriculum and 10 students per program per year", async () => {
    expect(await one(`select count(*)::int n from curriculum_subjects`)).toEqual({ n: 91 });
    const perGroup = (await db.query(`select count(*)::int n from students group by program_id, year_level`)).rows;
    expect(perGroup.every((r) => r.n === 10)).toBe(true);
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
    expect((await as("authenticated", SEC, `select count(*)::int n from students`)).rows[0].n).toBe(100);
  });

  it("does not let a student change grades or the curriculum", async () => {
    expect((await as("authenticated", STU, `update enrollments set final_grade = 1 returning id`)).rows).toHaveLength(0);
    expect((await as("authenticated", STU, `update curriculum_subjects set units = 1 returning id`)).rows).toHaveLength(0);
  });

  it("keeps the security helpers out of the public API", async () => {
    expect((await as("authenticated", SEC, `select public.is_secretary()`)).error).toBeTruthy();
  });
});

describe("add_student (one transaction)", () => {
  it("creates the student, registers them and enrolls them in every class of their section", async () => {
    const r = await as("authenticated", SEC, `select public.add_student('2026-0099','Test','Student','test.student@x.test',${bsit},1::smallint,'new') sec`);
    expect(r.rows[0].sec).toBe("BSIT 1-S");
    const made = await one(`select (select count(*)::int from registrations where student_id='2026-0099') r, (select count(*)::int from enrollments where student_id='2026-0099') e`);
    expect(made).toEqual({ r: 1, e: 7 });
  });

  it("leaves nothing behind when it fails", async () => {
    const r = await as("authenticated", SEC, `select public.add_student('2026-0098','Dup','Email','test.student@x.test',${bsit},1::smallint,'new')`);
    expect(r.error).toBeTruthy();
    expect(await one(`select count(*)::int n from students where id='2026-0098'`)).toEqual({ n: 0 });
  });

  it("refuses students", async () => {
    expect((await as("authenticated", STU, `select public.add_student('2026-0097','X','Y','x@y.test',${bsit},1::smallint,'new')`)).error).toBeTruthy();
  });
});

describe("save_grades and the grade change log", () => {
  let enr;
  beforeAll(async () => {
    enr = (await db.query(`select e.id from enrollments e join class_offerings o on o.id = e.offering_id join sections s on s.id = o.section_id join school_terms t on t.id = s.school_term_id and t.is_current where e.student_id = '2026-0099' order by e.id limit 2`)).rows.map((r) => Number(r.id));
  });

  it("saves several grades at once and derives the status", async () => {
    const r = await as("authenticated", SEC, `select public.save_grades('[{"enrollment_id":${enr[0]},"midterm":2.25,"final":2.0,"status":"auto"},{"enrollment_id":${enr[1]},"midterm":3.0,"final":null,"status":"incomplete"}]'::jsonb) n`);
    expect(r.rows[0].n).toBe(2);
    const rows = (await db.query(`select status, final_grade from enrollments where id in (${enr.join(",")}) order by id`)).rows;
    expect(rows[0].status).toBe("passed");
    expect(rows[1]).toMatchObject({ status: "incomplete", final_grade: null });
  });

  it("records who changed each grade", async () => {
    const log = (await as("authenticated", SEC, `select changed_by_name from v_grade_changes where student_id = '2026-0099'`)).rows;
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
    // Put a BSCS 2-S student into one BSCS 3-S class (at a free Saturday time), then try to move
    // another BSCS 2-S class onto that same time.
    const extra = await offeringOf("BSCS 3-S", 1);
    await db.exec(`insert into class_meetings (offering_id, weekday, starts_at, ends_at) values (${extra.id}, 6, '13:00', '14:00')`);
    const student = await one(`select r.student_id from registrations r join sections s on s.id = r.section_id join school_terms t on t.id = s.school_term_id and t.is_current where s.name = 'BSCS 2-S' order by r.student_id limit 1`);
    await db.exec(`insert into enrollments (student_id, offering_id) values ('${student.student_id}', ${extra.id})`);
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
