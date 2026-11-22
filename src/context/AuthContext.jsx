import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getAvatarUrl } from "../services/account";
import { loginEmail } from "../lib/login";
import { clearCaches } from "../lib/cache";

// Two roles only: "secretary" (row in public.secretaries) and "student" (row in public.students).
// The role comes from the database, never from the client.
const AuthContext = createContext(null);

async function loadProfile(authUser) {
  const uid = authUser.id;
  const avatarPromise = getAvatarUrl(authUser.user_metadata?.avatar_path);

  // Both lookups go out together (one round trip of waiting instead of two); row-level security
  // returns a row only from the table this person belongs to.
  const [{ data: sec, error: secErr }, { data: stu, error: stuErr }] = await Promise.all([
    supabase.from("secretaries").select("id, full_name, email").eq("auth_user_id", uid).maybeSingle(),
    supabase.from("students").select("id, first_name, last_name, email, year_level").eq("auth_user_id", uid).maybeSingle(),
  ]);
  if (secErr) throw secErr;
  if (sec) return { role: "secretary", name: sec.full_name, email: sec.email, avatarUrl: await avatarPromise };
  if (stuErr) throw stuErr;
  if (stu) {
    return {
      role: "student", studentId: stu.id, name: `${stu.first_name} ${stu.last_name}`,
      email: stu.email, yearLevel: stu.year_level, avatarUrl: await avatarPromise,
    };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [loaded, setLoaded] = useState({ uid: null, profile: null, failed: false });
  const [version, setVersion] = useState(0); // bump to reload the profile after an edit

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resolve the role outside the auth callback (Supabase recommends not awaiting inside it).
  const uid = session?.user?.id;
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    clearCaches(); // never show one person's remembered pages to the next person on this browser
    // The session already holds the user; the database (row-level security) checks the token on every query,
    // so a separate "who am I" request before loading the profile would only add waiting time.
    supabase.auth.getSession()
      .then(({ data, error }) => { if (error || !data.session) throw error || new Error("Signed out"); return loadProfile(data.session.user); })
      .then((profile) => alive && setLoaded({ uid, profile, failed: false }))
      .catch(() => alive && setLoaded({ uid, profile: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [uid, version]);

  const refreshProfile = useCallback(() => setVersion((v) => v + 1), []);

  // loading | signed-out | ready | unlinked | error
  const status =
    session === undefined ? "loading"
    : !uid ? "signed-out"
    : loaded.uid !== uid ? "loading"
    : loaded.failed ? "error"
    : loaded.profile ? "ready" : "unlinked";
  const profile = status === "ready" ? loaded.profile : null;

  // Accepts a student ID (2025-0001) or a staff email; see loginEmail() in lib/format.js.
  const signIn = useCallback(async (identifier, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(identifier), password });

    if (error) throw error;
  }, []);

  const signOut = useCallback(() => { clearCaches(); return supabase.auth.signOut(); }, []);

  const changePassword = useCallback(async (password) => {
    // Also clears the "must change password" mark the secretary's reset puts on the account.
    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    if (error) throw error;
  }, []);

  const mustChangePassword = status === "ready" && session?.user?.user_metadata?.must_change_password === true;

  return (
    <AuthContext.Provider value={{ status, user: profile, email: session?.user?.email, mustChangePassword, signIn, signOut, changePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
