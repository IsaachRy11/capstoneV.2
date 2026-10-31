// Creates a login for every student so they can sign in with their student ID.
// Run on your own PC only:  npm run accounts:students
//
// Needs in .env.local (never commit it):
//   SUPABASE_SERVICE_ROLE_KEY=...   Supabase → Project Settings → API → service_role (secret!)
//   STUDENT_DEFAULT_PASSWORD=...    starting password for new accounts (demo only)
//
// Safe to run again: students who already have a working ID login are skipped.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { STUDENT_LOGIN_DOMAIN, loginEmail } from "../src/lib/format.js";

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
}

const env = { ...readEnv(".env"), ...readEnv(".env.local") };
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const password = env.STUDENT_DEFAULT_PASSWORD || env.DEMO_STUDENT_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error("Missing VITE_SUPABASE_URL (.env), SUPABASE_SERVICE_ROLE_KEY or STUDENT_DEFAULT_PASSWORD (.env.local).");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// All existing logins, keyed by id and by email.
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 1000) break;
}
const byId = new Map(users.map((u) => [u.id, u]));
const byEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u]));

const { data: students, error } = await admin.from("students").select("id, auth_user_id").order("id");
if (error) throw error;

let created = 0, linked = 0, renamed = 0, skipped = 0;
for (const s of students) {
  const target = loginEmail(s.id); // e.g. 2025-0001@students.ccs-monitor.test
  const current = s.auth_user_id ? byId.get(s.auth_user_id) : null;

  if (current) {
    if (current.email?.toLowerCase() === target) { skipped++; continue; }
    // Already has a login (e.g. the old demo student email): switch it to the ID login, keep its password.
    const { error: e } = await admin.auth.admin.updateUserById(current.id, { email: target, email_confirm: true });
    if (e) { console.error(`  ${s.id}: ${e.message}`); continue; }
    renamed++;
    continue;
  }

  let user = byEmail.get(target);
  if (!user) {
    const { data, error: e } = await admin.auth.admin.createUser({
      email: target, password, email_confirm: true, user_metadata: { student_id: s.id },
    });
    if (e) { console.error(`  ${s.id}: ${e.message}`); continue; }
    user = data.user;
    created++;
  } else {
    linked++;
  }
  const { error: e } = await admin.from("students").update({ auth_user_id: user.id }).eq("id", s.id);
  if (e) console.error(`  ${s.id}: could not link (${e.message})`);
}

console.log(`Done. Created ${created}, linked ${linked}, switched to ID login ${renamed}, already set ${skipped}.`);
console.log(`Students sign in with their student ID (login domain: ${STUDENT_LOGIN_DOMAIN}).`);
