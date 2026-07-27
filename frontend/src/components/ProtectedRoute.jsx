import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathFor } from './PublicLayout';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  return children;
}
