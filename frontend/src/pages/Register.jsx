import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Field, inputClass } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(form.fullName, form.email, form.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1600);
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
              <UserPlus className="h-5 w-5" strokeWidth={1.9} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Create your account</h1>
              <p className="text-sm text-slate-500">For students who want to track named reports</p>
            </div>
          </div>

          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
              Account created. Taking you to the login page…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name" htmlFor="fullName" required>
                <input
                  id="fullName"
                  required
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  autoComplete="name"
                />
              </Field>
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
              <Field
                label="Password"
                htmlFor="password"
                required
                hint="At least 8 characters, with an uppercase letter and a number."
              >
                <input
                  id="password"
                  type="password"
                  required
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password" htmlFor="confirm" required>
                <input
                  id="confirm"
                  type="password"
                  required
                  className={inputClass}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </PublicLayout>
  );
}
