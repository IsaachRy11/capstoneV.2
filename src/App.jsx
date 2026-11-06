import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import { LoadingState } from "./components/ui";

const Login = lazy(() => import("./features/account/LoginPage"));
const Landing = lazy(() => import("./features/landing/LandingPage"));
const Dashboard = lazy(() => import("./features/dashboard/DashboardPage"));
const StudentHome = lazy(() => import("./features/home/StudentHomePage"));
const Students = lazy(() => import("./features/students/StudentsPage"));
const StudentRecord = lazy(() => import("./features/students/StudentRecordPage"));
const Sections = lazy(() => import("./features/sections/SectionsPage"));
const Curriculum = lazy(() => import("./features/curriculum/CurriculumPage"));
const Profile = lazy(() => import("./features/account/ProfilePage"));
const Progress = lazy(() => import("./features/progress/ProgressPage"));
const Schedule = lazy(() => import("./features/schedules/StudentSchedulePage"));
const SectionSchedules = lazy(() => import("./features/schedules/SectionSchedulesPage"));
const Settings = lazy(() => import("./features/account/SettingsPage"));
const Help = lazy(() => import("./features/account/HelpPage"));
const Privacy = lazy(() => import("./features/account/PrivacyPage"));
const CalendarPage = lazy(() => import("./features/calendar/CalendarPage"));

function SecretaryOnly({ children }) {
  const { user } = useAuth();
  return user.role === "secretary" ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { status, user } = useAuth();

  if (status === "loading") return <LoadingState label="Signing in…" />;

  return (
    <Suspense fallback={<LoadingState />}>
      {status === "unlinked" || status === "error" ? (
        <Login />
      ) : status !== "ready" ? (
        // Signed out: public landing page, sign-in page; anything else goes to sign-in.
        <Routes>
          <Route index element={<Landing />} />
          <Route path="signin" element={<Login />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={user.role === "secretary" ? <Dashboard /> : <StudentHome />} />
            <Route path="students" element={<SecretaryOnly><Students /></SecretaryOnly>} />
            <Route path="students/:id" element={<SecretaryOnly><StudentRecord /></SecretaryOnly>} />
            <Route path="sections" element={<SecretaryOnly><Sections /></SecretaryOnly>} />
            <Route path="schedules" element={<SecretaryOnly><SectionSchedules /></SecretaryOnly>} />
            <Route path="record" element={user.role === "secretary" ? <Navigate to="/students" replace /> : <StudentRecord />} />
            <Route path="progress" element={user.role === "secretary" ? <Navigate to="/" replace /> : <Progress />} />
            <Route path="schedule" element={user.role === "secretary" ? <Navigate to="/" replace /> : <Schedule />} />
            <Route path="curriculum" element={<Curriculum />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </Suspense>
  );
}
