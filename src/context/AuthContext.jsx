import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getAvatarUrl } from "../services/account";
import { loginEmail } from "../lib/format";

// Two roles only: "secretary" (row in public.secretaries) and "student" (row in public.students).
// The role comes from the database, never from the client.
const AuthContext = createContext(null);

async function loadProfile(authUser) {
  const uid = authUser.id;
  const avatarPromise = getAvatarUrl(authUser.user_metadata?.avatar_path);

  const { data: sec, error: secErr } = await supabase
    .from("secretaries").select("id, full_name, email").eq("auth_user_id", uid).maybeSingle();
  if (secErr) throw secErr;
  if (sec) return { role: "secretary", name: sec.full_name, email: sec.email, avatarUrl: await avatarPromise };

  const { data: stu, error: stuErr } = await supabase
    .from("students").select("id, first_name, last_name, email, year_level").eq("auth_user_id", uid).maybeSingle();
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
    supabase.auth.getUser()
      .then(({ data, error }) => { if (error) throw error; return loadProfile(data.user); })
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

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const changePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider value={{ status, user: profile, email: session?.user?.email, signIn, signOut, changePassword, refreshProfile }}>
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
