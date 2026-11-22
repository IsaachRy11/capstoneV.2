import { useCallback, useEffect, useState } from "react";
import { pageResults } from "../lib/cache";

// Runs an async loader whenever `deps` change and exposes { data, error, loading, reload }.
// - New deps → `loading` is true until the new result arrives (no stale data from other deps).
// - reload() → keeps showing the current data while fetching again (no spinner flash after a save).
// - `key` (optional) → the last result for this key + deps is remembered while the app is open, so
//   coming back to a page shows it at once and refreshes it in the background (no spinner).
export function useAsync(loader, deps = [], key = null) {
  const depsKey = JSON.stringify(deps);
  const cacheKey = key ? `${key}:${depsKey}` : null;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ depsKey: null, data: null, error: null });

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (cacheKey && data != null) pageResults.set(cacheKey, data);
        if (alive) setState({ depsKey, data, error: null });
      })
      .catch((error) => alive && setState({ depsKey, data: null, error }));
    return () => {
      alive = false;
    };
    // The loader is re-created every render; depsKey + tick are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const fresh = state.depsKey === depsKey;
  const remembered = !fresh && cacheKey ? pageResults.get(cacheKey) ?? null : null;
  return {
    data: fresh ? state.data : remembered,
    error: fresh ? state.error : null,
    loading: !fresh && remembered === null,
    reload,
  };
}
