import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// The one Back button, in the top bar on every screen except Home. It works like the browser's Back; if this was
// the first page opened (nothing to go back to), it goes Home.
export default function GlobalBack() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === "/") return null;
  return (
    <button type="button" onClick={() => (location.key === "default" ? navigate("/") : navigate(-1))} aria-label="Back"
      className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-2 text-[14px] font-semibold text-ink-2 hover:bg-hover hover:text-ink sm:px-3">
      <ArrowLeft size={18} aria-hidden="true" /><span className="hidden sm:inline">Back</span>
    </button>
  );
}
