import { useCallback, useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Card, Button, Field, inputClass } from '../../components/ui';

const ROLE_LABEL = {
  STUDENT: 'Student',
  ADMINISTRATOR: 'Administrator',
  COUNSELLOR: 'Counsellor',
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'COUNSELLOR', password: '', department: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/users', form);
      setShowForm(false);
      setForm({ fullName: '', email: '', role: 'COUNSELLOR', password: '', department: '' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user.');
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">User accounts</h1>
          <p className="mt-1 text-slate-500">Manage Administrator, Counsellor, and Student accounts.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <UserPlus className="h-4 w-4" /> New staff account
        </Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card className="mt-6 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{u.fullName}</td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3 text-slate-500">{ROLE_LABEL[u.role]}</td>
                    <td className="px-5 py-3 text-slate-500">{u.department || '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.id !== me.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className="text-xs font-medium text-brand-700 hover:underline"
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">New staff account</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Full name" required>
                <input
                  required
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Role" required>
                <select
                  className={inputClass}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="COUNSELLOR">Counsellor</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
              </Field>
              <Field label="Department">
                <input
                  className={inputClass}
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </Field>
              <Field label="Temporary password" required hint="At least 8 characters.">
                <input
                  type="password"
                  required
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              )}
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Creating…' : 'Create account'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
