// Gives a secretary a staff ID sign-in (for example CCS-001) instead of an email.
// Run on your own PC only:  npm run accounts:staff -- CCS-001 demo.secretary@ccs-monitor.test
//   1st argument: the new staff ID (letters, a dash, 3+ digits)
//   2nd argument: the secretary's current email (as stored in the secretaries table)
//
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (never commit it). The password is not changed.
// The sign-in address becomes ccs-001@staff.ccs-monitor.test, so the secretary signs in with the ID.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { isStaffId, loginEmail } from "../src/lib/login.js";

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
}

const [staffId, currentEmail] = process.argv.slice(2);
if (!isStaffId(staffId ?? "") || !currentEmail) {
  console.error("Usage: npm run accounts:staff -- CCS-001 current.email@example.com");
  process.exit(1);
}
const env = { ...readEnv(".env"), ...readEnv(".env.local") };
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL (.env) or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const target = loginEmail(staffId);

const { data: sec, error } = await admin.from("secretaries").select("id, auth_user_id, email").ilike("email", currentEmail.trim()).maybeSingle();
if (error || !sec) { console.error("No secretary with that email."); process.exit(1); }
if (!sec.auth_user_id) { console.error("That secretary has no login yet. Create it in Supabase → Authentication first."); process.exit(1); }

const { error: e1 } = await admin.auth.admin.updateUserById(sec.auth_user_id, { email: target, email_confirm: true });
if (e1) { console.error(e1.message); process.exit(1); }
const { error: e2 } = await admin.from("secretaries").update({ email: target }).eq("id", sec.id);
if (e2) { console.error(e2.message); process.exit(1); }
console.log(`Done. Sign in with staff ID ${staffId.toUpperCase()} and the same password as before.`);
