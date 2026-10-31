import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { getStudent } from "../services/students";
import { removeAvatar, updateSecretaryName, uploadAvatar } from "../services/account";
import { Avatar, ErrorState, FormError, LoadingState, PageHeader, SectionHeader, StandingBadge } from "../components/ui";
import { STUDENT_TYPE, yearLabel } from "../lib/format";


function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-t border-line-2 px-5 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
      <dt className="text-[13px] font-semibold text-ink-3">{label}</dt>
      <dd className="text-[15px] text-ink">{children}</dd>
    </div>
  );
}

function PhotoSection() {
  const { user, refreshProfile } = useAuth();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-5 px-5 py-5">
      <Avatar name={user.name} url={user.avatarUrl} size={80} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input ref={input} id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            onChange={(e) => e.target.files[0] && run(() => uploadAvatar(e.target.files[0]))} />
          <label htmlFor="photo" className={`btn btn-secondary btn-sm ${busy ? "pointer-events-none opacity-55" : ""}`}>
            <Camera size={15} aria-hidden="true" />{busy ? "Saving…" : user.avatarUrl ? "Change photo" : "Upload photo"}
          </label>
          {user.avatarUrl && (
            <button className="btn btn-secondary btn-sm" onClick={() => run(removeAvatar)} disabled={busy}><Trash2 size={15} aria-hidden="true" />Remove</button>
          )}
        </div>
        <p className="text-[13px] text-ink-3">JPG, PNG or WebP. It's cropped to a square and resized automatically.</p>
        <FormError error={error} />
      </div>
    </div>
  );
}

function SecretaryName() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await updateSecretaryName(name);
      refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="flex max-w-md flex-col gap-3 border-t border-line-2 px-5 py-5">
      <label className="label !mb-0" htmlFor="full-name">Display name</label>
      <div className="flex gap-2.5">
        <input id="full-name" className="field" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        <button className="btn btn-primary" type="submit" disabled={busy || name.trim() === user.name}>{busy ? "Saving…" : "Save"}</button>
      </div>
      <FormError error={error} />
      {saved && <p role="status" className="text-[13px] text-ok">Name saved.</p>}
    </form>
  );
}

export default function Profile() {
  const { user, email } = useAuth();
  const isStudent = user.role === "student";
  const { data: student, error, loading, reload } = useAsync(
    () => (isStudent ? getStudent(user.studentId) : Promise.resolve(null)),
    [isStudent, user.studentId]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Profile"
        subtitle={isStudent
          ? "Your photo is yours to change. For any other correction, contact the CCS office."
          : "Your photo and display name."} />

      <section className="card overflow-hidden">
        <SectionHeader title="Photo" subtitle="Shown in the top bar. Only signed-in users can see it." />
        <PhotoSection />
        {!isStudent && <SecretaryName />}
      </section>

      <section className="card overflow-hidden">
        <SectionHeader title="Account" />
        <dl>
          <Row label="Sign-in email">
            {email}
            {!isStudent && <p className="mt-1 text-[13px] text-ink-3">Changing it needs email confirmation, which isn't set up yet. See the note in supabase/README.md.</p>}
          </Row>
          {isStudent && student && (
            <>
              <Row label="Student ID"><span className="font-mono">{student.id}</span></Row>
              <Row label="Program">{student.program_name}</Row>
              <Row label="Year level">{yearLabel(student.year_level)}</Row>
              <Row label="Section">{student.section_name || "Not registered this semester"}</Row>
              <Row label="Student type">{STUDENT_TYPE[student.admission_type]}</Row>
              <Row label="Standing"><StandingBadge standing={student.standing} /> <Link to="/record" className="ml-2 text-[14px] font-semibold">View record</Link></Row>
            </>
          )}
        </dl>
      </section>
    </>
  );
}
