import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import MainLayout from './layouts/MainLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
const StudentRecord = lazy(() => import('./pages/StudentRecord'))
const EnrollmentSections = lazy(() => import('./pages/EnrollmentSections'))
const Subjects = lazy(() => import('./pages/Subjects'))
const Login = lazy(() => import('./pages/Login'))

function PageFallback() {
  return (
    <div className="w-full min-h-[300px] flex items-center justify-center p-8">
      <div className="w-8 h-8 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        
        <Route
          path="/"
          element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentRecord />} />
          <Route path="sections" element={<EnrollmentSections />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  </StrictMode>
)