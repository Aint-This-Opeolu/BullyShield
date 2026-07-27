import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import PublicLayout, { dashboardPathFor } from '../components/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, inputClass } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const redirectTo = location.state?.from || dashboardPathFor(user.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <Card className="p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <LogIn className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500">Log in to your BullyShield account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email address" htmlFor="email" required>
              <input
                id="email"
                type="email"
                required
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <input
                id="password"
                type="password"
                required
                className={inputClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New here?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:underline">
              Create a student account
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-slate-400">
            Reporting anonymously? You don't need an account —{' '}
            <Link to="/report" className="font-medium text-slate-600 hover:underline">
              report an incident
            </Link>{' '}
            directly.
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
