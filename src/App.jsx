import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import { LoadingState } from "./components/ui";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudentHome = lazy(() => import("./pages/StudentHome"));
const Students = lazy(() => import("./pages/Students"));
const StudentRecord = lazy(() => import("./pages/StudentRecord"));
const Sections = lazy(() => import("./pages/Sections"));
const Curriculum = lazy(() => import("./pages/Curriculum"));
const Profile = lazy(() => import("./pages/Profile"));
const Progress = lazy(() => import("./pages/Progress"));
const Settings = lazy(() => import("./pages/Settings"));

function SecretaryOnly({ children }) {
  const { user } = useAuth();
  return user.role === "secretary" ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { status, user } = useAuth();

  if (status === "loading") return <LoadingState label="Signing in…" />;

  return (
    <Suspense fallback={<LoadingState />}>
      {status !== "ready" ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={user.role === "secretary" ? <Dashboard /> : <StudentHome />} />
            <Route path="students" element={<SecretaryOnly><Students /></SecretaryOnly>} />
            <Route path="students/:id" element={<SecretaryOnly><StudentRecord /></SecretaryOnly>} />
            <Route path="sections" element={<SecretaryOnly><Sections /></SecretaryOnly>} />
            <Route path="record" element={user.role === "secretary" ? <Navigate to="/students" replace /> : <StudentRecord />} />
            <Route path="progress" element={user.role === "secretary" ? <Navigate to="/" replace /> : <Progress />} />
            <Route path="curriculum" element={<Curriculum />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </Suspense>
  );
}
