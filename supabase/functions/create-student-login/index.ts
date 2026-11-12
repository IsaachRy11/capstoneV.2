// Creates the sign-in account for a student the secretary just added.
// Only a signed-in secretary may call it. The service-role key stays on the server.
// Secret needed: STUDENT_DEFAULT_PASSWORD (supabase secrets set). SUPABASE_URL, SUPABASE_ANON_KEY
// and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const LOGIN_DOMAIN = "students.ccs-monitor.test"; // keep in sync with src/lib/login.js
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Who is calling? Must be a secretary (checked with the caller's own token, so RLS applies).
    const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: me } = await asCaller.auth.getUser();
    if (!me?.user) return reply({ error: "Sign in first." }, 401);
    const { data: isSec } = await asCaller.from("secretaries").select("id").eq("auth_user_id", me.user.id).maybeSingle();
    if (!isSec) return reply({ error: "Only the secretary can create student logins." }, 403);

    const { studentId } = await req.json();
    if (!/^\d{4}-\d{4}$/.test(studentId ?? "")) return reply({ error: "Student ID must look like 2026-0001." }, 400);
    const password = Deno.env.get("STUDENT_DEFAULT_PASSWORD");
    if (!password) return reply({ error: "The starting password is not set on the server." }, 500);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: student } = await admin.from("students").select("id, auth_user_id").eq("id", studentId).maybeSingle();
    if (!student) return reply({ error: "No student with that ID." }, 404);
    if (student.auth_user_id) return reply({ ok: true, alreadyHadLogin: true });

    const { data, error } = await admin.auth.admin.createUser({
      email: `${studentId}@${LOGIN_DOMAIN}`, password, email_confirm: true, user_metadata: { student_id: studentId },
    });
    if (error) return reply({ error: error.message }, 400);
    const { error: linkError } = await admin.from("students").update({ auth_user_id: data.user.id }).eq("id", studentId);
    if (linkError) return reply({ error: linkError.message }, 500);
    return reply({ ok: true });
  } catch (e) {
    return reply({ error: String((e as Error).message ?? e) }, 500);
  }
});
