import { Navigate, useSearchParams } from "react-router-dom";
import AddToSubject from "./AddToSubject";

// Add students to a subject (?offering=ID), opened from a subject on Section allocations. It is the only enrolling
// page: students are added one subject at a time and can be in different sections for different subjects.
export default function AddStudentsPage() {
  const [params] = useSearchParams();
  const offeringId = Number(params.get("offering"));
  if (!offeringId) return <Navigate to="/sections" replace />;
  return <AddToSubject offeringId={offeringId} />;
}
