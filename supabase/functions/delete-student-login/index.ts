// Removes the sign-in account left behind after the secretary deleted a student.
// Only a secretary may call it, and only once the student row is gone.
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
    const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: me } = await asCaller.auth.getUser();
    if (!me?.user) return reply({ error: "Sign in first." }, 401);
    const { data: isSec } = await asCaller.from("secretaries").select("id").eq("auth_user_id", me.user.id).maybeSingle();
    if (!isSec) return reply({ error: "Only the secretary can remove student logins." }, 403);

    const { studentId } = await req.json();
    if (!/^\d{4}-\d{4}$/.test(studentId ?? "")) return reply({ error: "Student ID must look like 2026-0001." }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: still } = await admin.from("students").select("id").eq("id", studentId).maybeSingle();
    if (still) return reply({ error: "That student still exists." }, 409);

    const email = `${studentId}@${LOGIN_DOMAIN}`;
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return reply({ error: error.message }, 500);
      const user = data.users.find((u) => u.email?.toLowerCase() === email);
      if (user) {
        const { error: delError } = await admin.auth.admin.deleteUser(user.id);
        if (delError) return reply({ error: delError.message }, 500);
        return reply({ ok: true });
      }
      if (data.users.length < 1000) break;
    }
    return reply({ ok: true, noLogin: true });
  } catch (e) {
    return reply({ error: String((e as Error).message ?? e) }, 500);
  }
});
