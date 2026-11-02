import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { EditingWindowProvider } from './context/EditingWindowContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import FullPageLoader from './components/FullPageLoader.jsx';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TimetableList from './pages/TimetableList.jsx';
import TimetableDetail from './pages/TimetableDetail.jsx';
import CreateTimetable from './pages/CreateTimetable.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Tasks from './pages/Tasks.jsx';
import NotificationCenter from './pages/NotificationCenter.jsx';
import NotificationHistory from './pages/NotificationHistory.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <EditingWindowProvider>
      <AppLayout />
    </EditingWindowProvider>
  );
}

function GuestRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthLayout />;
}

export default function App() {
  const { theme } = useTheme();
  return (
    <>
      <Routes>
        <Route element={<GuestRoutes />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        {/* Reset password is reachable whether or not a session exists. */}
        <Route element={<AuthLayout />}>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timetable" element={<TimetableList />} />
          <Route path="/timetable/new" element={<CreateTimetable />} />
          <Route path="/timetable/:id" element={<TimetableDetail />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/notifications/history" element={<NotificationHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '10px',
            fontSize: '14px',
            background: theme === 'dark' ? '#18181b' : '#fff',
            color: theme === 'dark' ? '#f4f4f5' : '#18181b',
            border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
          },
        }}
      />
    </>
  );
}
