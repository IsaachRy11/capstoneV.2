import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env (see README).");
}

export const supabase = createClient(url, key);

// Throws the Supabase error so callers can use try/catch and one error UI.
export async function unwrap(promise) {
  const { data, error, count } = await promise;
  if (error) throw error;
  return count !== undefined && count !== null && data === null ? count : data;
}
