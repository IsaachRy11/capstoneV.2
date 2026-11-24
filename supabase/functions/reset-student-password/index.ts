// Resets a student's password. Only a signed-in secretary may call it.
// Sets a random one-time password (returned once, to hand to the student) and makes the student
// choose their own password at the next sign-in. Creates the login if the student has none.
import { createClient } from "npm:@supabase/supabase-js@2";

const LOGIN_DOMAIN = "students.ccs-monitor.test"; // keep in sync with src/lib/login.js
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: me } = await asCaller.auth.getUser();
    if (!me?.user) return reply({ error: "Sign in first." }, 401);
    const { data: isSec } = await asCaller.from("secretaries").select("id").eq("auth_user_id", me.user.id).maybeSingle();
    if (!isSec) return reply({ error: "Only the secretary can reset student passwords." }, 403);

    const { studentId } = await req.json();
    if (!/^\d{4}-\d{4}$/.test(studentId ?? "")) return reply({ error: "Student ID must look like 2026-0001." }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: student } = await admin.from("students").select("id, auth_user_id").eq("id", studentId).maybeSingle();
    if (!student) return reply({ error: "No student with that ID." }, 404);

    const password = tempPassword();
    if (student.auth_user_id) {
      const { error } = await admin.auth.admin.updateUserById(student.auth_user_id, { password, user_metadata: { must_change_password: true } });
      if (error) return reply({ error: error.message }, 400);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: `${studentId}@${LOGIN_DOMAIN}`, password, email_confirm: true,
        user_metadata: { student_id: studentId, must_change_password: true },
      });
      if (error) return reply({ error: error.message }, 400);
      const { error: linkError } = await admin.from("students").update({ auth_user_id: data.user.id }).eq("id", studentId);
      if (linkError) return reply({ error: linkError.message }, 500);
    }
    return reply({ ok: true, tempPassword: password });
  } catch (e) {
    return reply({ error: String((e as Error).message ?? e) }, 500);
  }
});
