import { useCallback, useEffect, useState } from "react";

// Runs an async loader whenever `deps` change and exposes { data, error, loading, reload }.
// - New deps → `loading` is true until the new result arrives (no stale data from other deps).
// - reload() → keeps showing the current data while fetching again (no spinner flash after a save).
export function useAsync(loader, deps = []) {
  const depsKey = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ depsKey: null, data: null, error: null });

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(loader)
      .then((data) => alive && setState({ depsKey, data, error: null }))
      .catch((error) => alive && setState({ depsKey, data: null, error }));
    return () => {
      alive = false;
    };
    // The loader is re-created every render; depsKey + tick are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const fresh = state.depsKey === depsKey;
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: !fresh,
    reload,
  };
}
