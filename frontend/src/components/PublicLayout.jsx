import { Link, NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'}`;

export default function PublicLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              BullyShield
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/report" className={navLinkClass}>
              Report an incident
            </NavLink>
            <NavLink to="/track" className={navLinkClass}>
              Track a report
            </NavLink>
            <NavLink to="/guidelines" className={navLinkClass}>
              Guidelines
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button as={Link} to={dashboardPathFor(user.role)} variant="secondary">
                Go to dashboard
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost">
                  Log in
                </Button>
                <Button as={Link} to="/register" variant="primary">
                  Create student account
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-slate-500 sm:flex-row">
          <p>BullyShield — Incident Reporting &amp; Management System</p>
          <p>Your safety, taken seriously.</p>
        </div>
      </footer>
    </div>
  );
}

export function dashboardPathFor(role) {
  if (role === 'ADMINISTRATOR') return '/admin';
  if (role === 'COUNSELLOR') return '/counsellor';
  return '/student';
}
