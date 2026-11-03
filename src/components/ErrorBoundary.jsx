import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Catches a crash inside one page so the rest of the app (sidebar, top bar) keeps working.
// AppShell re-mounts it per route, so moving to another page clears the error.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="card flex flex-col items-start gap-3 p-6">
        <div className="flex items-center gap-2 font-semibold text-bad">
          <AlertTriangle size={18} aria-hidden="true" /> This page ran into a problem
        </div>
        <p className="text-[14px] text-ink-2">The rest of the app still works. Reload to try again, or open another page from the menu.</p>
        <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
