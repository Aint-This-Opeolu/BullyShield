import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Guidelines from './pages/Guidelines';
import TrackReport from './pages/Track';
import ReportIncident from './pages/ReportIncident';

import StudentOverview from './pages/student/Overview';

import AdminDashboard from './pages/admin/Dashboard';
import AdminReports from './pages/admin/Reports';
import AdminCases from './pages/admin/Cases';
import AdminUsers from './pages/admin/Users';
import AdminAuditLogs from './pages/admin/AuditLogs';

import CounsellorCases from './pages/counsellor/Cases';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/track" element={<TrackReport />} />
          <Route path="/report" element={<ReportIncident />} />

          {/* Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute roles={['STUDENT']}>
                <StudentOverview />
              </ProtectedRoute>
            }
          />

          {/* Administrator */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMINISTRATOR']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={['ADMINISTRATOR']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cases"
            element={
              <ProtectedRoute roles={['ADMINISTRATOR']}>
                <AdminCases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['ADMINISTRATOR']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute roles={['ADMINISTRATOR']}>
                <AdminAuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Counsellor */}
          <Route
            path="/counsellor"
            element={
              <ProtectedRoute roles={['COUNSELLOR']}>
                <CounsellorCases />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
