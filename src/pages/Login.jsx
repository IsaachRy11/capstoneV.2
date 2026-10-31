import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { FormError, SealLogo } from "../components/ui";

const DEMO_ACCOUNTS = [
  { id: "demo.secretary@ccs-monitor.test", label: "Demo secretary", hint: "Fills in the email" },
  { id: "2025-0001", label: "Demo student", hint: "Fills in student ID 2025-0001" },
];

export default function Login() {
  const { signIn, status, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Student ID, email or password is incorrect." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-ground">
      <section className="flex min-h-[320px] flex-[1_1_480px] flex-col justify-between gap-12 p-8 sm:p-14"
        style={{ background: "var(--panel)", color: "var(--panel-ink)", backgroundImage: "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)", backgroundSize: "40px 40px" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-0.5"><SealLogo size={44} /></span>
          <div>
            <div className="font-display text-[16px] font-bold">CCS Subject Monitoring System</div>
            <div className="text-[13px]" style={{ color: "var(--panel-soft)" }}>Saint Joseph College</div>
          </div>
        </div>
        <div className="flex max-w-[520px] flex-col gap-5">
          <div className="text-[13px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--panel-soft)" }}>College of Computer Studies</div>
          <h1 className="text-[36px] font-extrabold leading-[1.12] tracking-tight sm:text-[44px]" style={{ color: "var(--panel-ink)" }}>Every subject, section and standing in one place.</h1>
          <p className="text-[17px] leading-relaxed" style={{ color: "var(--panel-soft)" }}>Track enrolment, grades and academic standing for BSIT, BSCS and ACT students, from first year to graduation.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-[13px]" style={{ color: "var(--panel-soft)" }}>
          <span className="font-mono tracking-wide">CODE · INNOVATE · TRANSFORM</span>
          <span>Maasin City, Southern Leyte</span>
        </div>
      </section>

      <section className="relative flex flex-[1_1_480px] items-center justify-center px-6 py-12">
        <button className="icon-btn absolute right-4 top-4" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="flex w-full max-w-[400px] flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h2 className="text-[28px] font-bold tracking-tight">Sign in</h2>
            <p className="text-[15px] text-ink-2">Students: use your student ID. Staff: use your email.</p>
          </div>

          {status === "unlinked" && (
            <div role="alert" className="flex flex-col items-start gap-2 rounded-lg px-4 py-3 text-[14px] tone-warn">
              This account isn't linked to a student or secretary record yet. Ask the CCS office to add your email.
              <button className="font-semibold underline" onClick={signOut}>Sign in with another account</button>
            </div>
          )}
          {status === "error" && <FormError error="Signed in, but your record couldn't be loaded. Check your connection and reload." />}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="email">Student ID or email</label>
              <input id="email" type="text" inputMode="text" className="field h-11" placeholder="e.g. 2025-0001" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} className="field h-11 pr-12" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="icon-btn absolute right-0.5 top-0.5" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <FormError error={error} />
            <button type="submit" className="btn btn-primary mt-1 h-11" disabled={busy}>
              {busy ? "Signing in…" : <>Sign in <ArrowRight size={17} aria-hidden="true" /></>}
            </button>
            <p className="text-[13px] text-ink-3">Forgot your password? Ask the CCS office to reset it.</p>
          </form>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
              <span className="h-px flex-1 bg-line" />Demo accounts<span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.id} type="button" onClick={() => setIdentifier(a.id)}
                  className="rounded-[10px] border border-line bg-surface px-3.5 py-3 text-left hover:border-accent">
                  <div className="text-[14px] font-semibold text-ink">{a.label}</div>
                  <div className="truncate text-[12px] text-ink-3">{a.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
