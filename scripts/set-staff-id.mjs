// Sets or changes a secretary's staff ID sign-in (for example CCS-001).
// Run on your own PC only:  npm run accounts:staff -- CCS-002 CCS-001
//   1st argument: the new staff ID (letters, a dash, 3+ digits)
//   2nd argument: the secretary's current staff ID (leave it out when there is only one secretary)
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

const [staffId, currentId] = process.argv.slice(2);
if (!isStaffId(staffId ?? "")) {
  console.error("Usage: npm run accounts:staff -- NEW-ID [CURRENT-ID]   e.g. CCS-002 CCS-001");
  process.exit(1);
}
const env = { ...readEnv(".env"), ...readEnv(".env.local") };
if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL (.env) or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const target = loginEmail(staffId);

let q = admin.from("secretaries").select("id, auth_user_id, staff_id");
if (currentId) q = q.ilike("staff_id", currentId.trim());
const { data: rows, error } = await q;
if (error || !rows || rows.length !== 1) { console.error(currentId ? "No secretary with that staff ID." : "More than one secretary: give the current staff ID too."); process.exit(1); }
const sec = rows[0];
if (!sec.auth_user_id) { console.error("That secretary has no login yet. Create it in Supabase → Authentication first."); process.exit(1); }

const { error: e1 } = await admin.auth.admin.updateUserById(sec.auth_user_id, { email: target, email_confirm: true });
if (e1) { console.error(e1.message); process.exit(1); }
const { error: e2 } = await admin.from("secretaries").update({ staff_id: staffId.toUpperCase() }).eq("id", sec.id);
if (e2) { console.error(e2.message); process.exit(1); }
console.log(`Done. Sign in with staff ID ${staffId.toUpperCase()} and the same password as before.`);
