import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FormError, SealLogo } from "../../components/ui";

// Shown instead of the app until the person replaces the temporary password the CCS Secretary's Office gave them.
export default function FirstSignInPage() {
  const { changePassword, signOut } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw === "123456789") return setError("Choose a password that is different from the temporary one.");
    if (pw !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await changePassword(pw);
    } catch (err) {
      setError(/different/i.test(err.message) ? "Choose a password that is different from the one you were given." : err.message);
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <form onSubmit={submit} className="card flex w-full max-w-md flex-col gap-4 p-6">
        <SealLogo size={44} />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Choose your own password</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">You signed in with a temporary password. Replace it with one only you know. You'll use the new one from now on.</p>
        </div>
        <div><label className="label" htmlFor="first-pw">New password</label><input id="first-pw" type="password" className="field h-11" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></div>
        <div><label className="label" htmlFor="first-confirm">Confirm new password</label><input id="first-confirm" type="password" className="field h-11" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
        <FormError error={error} />
        <button type="submit" className="btn btn-primary h-11" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
        <button type="button" className="btn btn-secondary" onClick={signOut}>Sign out</button>
      </form>
    </main>
  );
}
