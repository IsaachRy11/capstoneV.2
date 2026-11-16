import { useState } from "react";
import { Flag, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTermEdge } from "../hooks/useCalendar";
import { termLabel } from "../lib/format";

// On a semester's first or last day of classes, a small popup says so (every page, both roles). Closing it hides it
// for the rest of that day in this browser. Phones: above the tab bar; computers: bottom right.
const KEY = "ccs-term-edge-closed";
const todayKey = (edge) => `${new Date().toDateString()}|${edge.edge}|${edge.term.id}`;
function wasClosed(edge) {
  try { return localStorage.getItem(KEY) === todayKey(edge); } catch { return false; }
}

export default function TermEdgePop() {
  const edge = useTermEdge();
  const [closed, setClosed] = useState(false);
  if (!edge || closed || wasClosed(edge)) return null;
  const start = edge.edge === "start";
  const close = () => {
    setClosed(true);
    try { localStorage.setItem(KEY, todayKey(edge)); } catch { /* not remembered in private mode */ }
  };
  return (
    <div role="status" className="no-print card fixed bottom-24 left-4 right-4 z-40 flex items-start gap-3 p-4 shadow-xl sm:left-auto sm:w-[360px] lg:bottom-6 lg:right-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: start ? "var(--ok-bg)" : "var(--info-bg)", color: start ? "var(--ok)" : "var(--info)" }}>
        <Flag size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">{start ? "First day of classes" : "Last day of classes"}</p>
        <p className="mt-0.5 text-[14px] text-ink-2">{termLabel(edge.term)} {start ? "starts today." : "ends today."}</p>
        <Link to="/calendar" onClick={close} className="mt-1.5 inline-flex min-h-8 items-center text-[13px] font-semibold">Open the calendar</Link>
      </div>
      <button type="button" className="icon-btn -mr-1 -mt-1" onClick={close} aria-label="Close"><X size={18} /></button>
    </div>
  );
}
