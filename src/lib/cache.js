// Small in-memory caches so moving between pages doesn't refetch what the browser already has.
// Nothing here survives a page refresh, and everything is emptied when the signed-in person changes.

// 1) Promise cache for data that rarely changes (programs, curriculum, current term).
const promises = new Map();
export function cached(key, loader, ttlMs = 5 * 60 * 1000) {
  const hit = promises.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = Promise.resolve().then(loader);
  promises.set(key, { at: Date.now(), promise });
  promise.catch(() => promises.get(key)?.promise === promise && promises.delete(key)); // never keep a failure
  return promise;
}
// Call after a write that changes cached data, e.g. forget("curriculum").
export function forget(prefix) {
  for (const k of promises.keys()) if (k.startsWith(prefix)) promises.delete(k);
}

// 2) Last result of each page's loader (see useAsync): shown at once on the next visit while fresh data loads.
export const pageResults = new Map();

export function clearCaches() {
  promises.clear();
  pageResults.clear();
}
