import { useState } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { FormError, PageHeader, SectionHeader } from "../components/ui";

function PasswordForm() {
  const { changePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setDone(false);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await changePassword(pw);
      setPw("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4 px-5 py-5">
      <div><label className="label" htmlFor="new-pw">New password</label><input id="new-pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
      <div><label className="label" htmlFor="confirm-pw">Confirm new password</label><input id="confirm-pw" type="password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
      <FormError error={error} />
      {done && <p role="status" className="rounded-lg px-3 py-2 text-[13px] tone-ok">Password changed. Use it the next time you sign in.</p>}
      <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></div>
    </form>
  );
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: Sun, swatch: ["#F7F6F3", "#FFFFFF", "#C2410C"] },
    { value: "dark", label: "Dark", icon: Moon, swatch: ["#0E1320", "#151B2B", "#4361D8"] },
  ];

  return (
    <>
      <PageHeader title="Settings" />

      <section className="card overflow-hidden">
        <SectionHeader title="Appearance" subtitle="Saved on this device." />
        <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-4 px-5 py-5">
          {options.map(({ value, label, icon: Icon, swatch }) => {
            const on = theme === value;
            return (
              <button key={value} role="radio" aria-checked={on} onClick={() => !on && toggleTheme()}
                className={`flex w-[200px] flex-col gap-3 rounded-xl border-2 p-3 text-left ${on ? "border-accent" : "border-line hover:border-ink-3"}`}>
                <div className="flex h-20 overflow-hidden rounded-lg border border-line" aria-hidden="true">
                  <div className="w-1/3" style={{ background: swatch[1] }} />
                  <div className="flex flex-1 flex-col justify-end gap-1.5 p-2.5" style={{ background: swatch[0] }}>
                    <div className="h-2 w-3/4 rounded" style={{ background: swatch[1] }} />
                    <div className="h-2 w-1/3 rounded" style={{ background: swatch[2] }} />
                  </div>
                </div>
                <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <Icon size={16} aria-hidden="true" />{label}
                  {on && <Check size={16} className="ml-auto text-accent" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <SectionHeader title="Password" subtitle="At least 8 characters." />
        <PasswordForm />
      </section>
    </>
  );
}
