import { useAsync } from "./useAsync";
import { getCalendarEvents, getTerms } from "../services/catalog";
import { classStatus, edgesOn, termEdges } from "../lib/calendar";

// Whether today is a class day, from the official calendar (term dates + school_calendar_events).
// Shares its data with the Calendar page (same cache key). Returns null while loading, so pages show nothing special yet.
export function useClassStatus() {
  const { data } = useAsync(async () => ({ terms: await getTerms(), events: await getCalendarEvents() }), [], "calendar");
  return data ? classStatus(new Date(), data.terms, data.events) : null;
}

// Today's semester flag: { edge: "start" | "end", term } on the first or last day of classes, otherwise null.
export function useTermEdge() {
  const { data } = useAsync(async () => ({ terms: await getTerms(), events: await getCalendarEvents() }), [], "calendar");
  return data ? edgesOn(termEdges(data.terms), new Date())[0] ?? null : null;
}
