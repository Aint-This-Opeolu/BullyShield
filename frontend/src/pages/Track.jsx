import { useState } from 'react';
import { Search } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import api from '../api/client';
import { Button, Card, Field, inputClass, BullyingTypeBadge } from '../components/ui';
import StatusTimeline from '../components/StatusTimeline';

export default function TrackReport() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!code.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.get(`/reports/track/${encodeURIComponent(code.trim())}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not find a report with that tracking code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Search className="h-6 w-6" strokeWidth={1.9} />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-slate-900">Track your report</h1>
          <p className="mt-2 text-slate-600">
            Enter the tracking code you received when you submitted your report.
          </p>
        </div>

        <Card className="mt-8 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Tracking code" htmlFor="code">
                <input
                  id="code"
                  className={`${inputClass} tracking-widest`}
                  placeholder="e.g. YF6HZ33W"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Check status'}
            </Button>
          </form>
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </p>
          )}
        </Card>

        {result && (
          <Card className="mt-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm text-slate-500">{result.reportId}</p>
              <BullyingTypeBadge type={result.bullyingType} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Submitted {new Date(result.dateSubmitted).toLocaleString()}
            </p>

            <div className="mt-8">
              <StatusTimeline status={result.status} />
            </div>

            {result.resolutionOutcome && (
              <div className="mt-8 rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
                <p className="text-sm font-semibold text-emerald-800">Outcome</p>
                <p className="mt-1 text-sm text-emerald-700">{result.resolutionOutcome}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}
