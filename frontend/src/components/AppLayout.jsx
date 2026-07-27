import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  FolderKanban,
  Users,
  ScrollText,
  LogOut,
  FilePlus2,
  Search,
  BookOpenText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  ADMINISTRATOR: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/cases', label: 'Cases', icon: FolderKanban },
    { to: '/admin/users', label: 'User accounts', icon: Users },
    { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
  ],
  COUNSELLOR: [{ to: '/counsellor', label: 'My cases', icon: FolderKanban, end: true }],
  STUDENT: [
    { to: '/student', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/report', label: 'Report an incident', icon: FilePlus2 },
    { to: '/track', label: 'Track a report', icon: Search },
    { to: '/guidelines', label: 'Guidelines', icon: BookOpenText },
  ],
};

const ROLE_LABEL = {
  ADMINISTRATOR: 'Administrator',
  COUNSELLOR: 'Counsellor',
  STUDENT: 'Student',
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            BullyShield
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {user?.fullName?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[user?.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.9} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="font-display font-bold text-slate-900">BullyShield</span>
          </Link>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600">
            Log out
          </button>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          <nav className="flex gap-4 overflow-x-auto">
            {items.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `whitespace-nowrap py-1 text-sm font-medium ${
                    isActive ? 'text-brand-700' : 'text-slate-500'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
