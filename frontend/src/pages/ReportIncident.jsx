import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, X, CheckCircle2, Copy, ShieldQuestion } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Button, Card, Field, inputClass } from '../components/ui';

const TYPES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VERBAL', label: 'Verbal' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological' },
  { value: 'RELATIONAL', label: 'Relational / Social' },
  { value: 'SEXUAL', label: 'Sexual harassment' },
];

const MAX_FILES = 5;

export default function ReportIncident() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    bullyingType: '',
    description: '',
    location: '',
    isAnonymous: !user,
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const addFiles = (list) => {
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.bullyingType) return setError('Please select the type of incident.');
    if (form.description.trim().length < 10)
      return setError('Please describe what happened in a bit more detail (at least 10 characters).');
    if (!form.location.trim()) return setError('Please tell us where this happened.');
    if (!form.isAnonymous && !user)
      return setError('Please log in to submit a named report, or choose to report anonymously.');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('bullyingType', form.bullyingType);
      fd.append('description', form.description);
      fd.append('location', form.location);
      fd.append('isAnonymous', String(form.isAnonymous));
      files.forEach((f) => fd.append('evidence', f));

      const { data } = await api.post('/reports', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong submitting your report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!result?.trackingCode) return;
    await navigator.clipboard.writeText(result.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (result) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">Report submitted</h1>
          <p className="mt-2 text-slate-600">
            Thank you for speaking up. Save your tracking code below — you'll need it to check on
            your report's progress.
          </p>

          <Card className="mt-6 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your tracking code
            </p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <p className="font-mono text-2xl font-bold tracking-widest text-brand-700">
                {result.trackingCode}
              </p>
              <button
                onClick={copyCode}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Copy tracking code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied && <p className="mt-1 text-xs text-emerald-600">Copied!</p>}
          </Card>

          <div className="mt-6 flex justify-center gap-3">
            <Button as={Link} to="/track" variant="secondary">
              Track this report
            </Button>
            <Button as={Link} to="/">
              Back to home
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="font-display text-3xl font-bold text-slate-900">Report an incident</h1>
        <p className="mt-2 text-slate-600">
          Take your time. Everything you share here is encrypted and only visible to authorised
          staff.
        </p>

        <Card className="mt-8 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="What type of incident was this?" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setForm({ ...form, bullyingType: t.value })}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      form.bullyingType === t.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="What happened?"
              htmlFor="description"
              required
              hint="Include what was said or done, and roughly when it occurred."
            >
              <textarea
                id="description"
                rows={6}
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <Field label="Where did it happen?" htmlFor="location" required>
              <input
                id="location"
                className={inputClass}
                placeholder="e.g. Library, 2nd floor"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>

            <Field label="Evidence (optional)" hint="Images, PDF, or Word documents. Up to 5 files, 10MB each.">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
                <UploadCloud className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-500">Click to choose files</span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    >
                      <span className="truncate">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={form.isAnonymous}
                  onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
                />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <ShieldQuestion className="h-4 w-4" /> Report anonymously
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {form.isAnonymous
                      ? 'Your identity will not be collected or stored.'
                      : user
                      ? `This report will be linked to your account (${user.email}).`
                      : 'Uncheck only if you are logged in — otherwise your report will be sent anonymously.'}
                  </span>
                </span>
              </label>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting…' : 'Submit report'}
            </Button>
          </form>
        </Card>
      </div>
    </PublicLayout>
  );
}
