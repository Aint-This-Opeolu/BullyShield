import { useCallback, useEffect, useState } from 'react';
import { FolderKanban } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import api from '../../api/client';
import { Card, StatusBadge, BullyingTypeBadge, EmptyState } from '../../components/ui';
import ReportDetailModal from '../../components/ReportDetailModal';

export default function CounsellorCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cases/assigned');
      setCases(data.cases);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your cases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-slate-900">My cases</h1>
      <p className="mt-1 text-slate-500">Cases currently assigned to you for investigation.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>
      ) : cases.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={FolderKanban} title="No cases assigned to you yet" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <Card
              key={c.caseId}
              className="cursor-pointer p-5 transition hover:shadow-md"
              onClick={() => {
                console.log('clicked', c.report?.reportId);
                setSelected(c.report.reportId);
              }}
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-slate-400">{c.caseId}</p>
                {c.priority === 'Priority' && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    PRIORITY
                  </span>
                )}
              </div>
              <div className="mt-2">
                <BullyingTypeBadge type={c.report.bullyingType} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{c.report.location}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(c.report.dateSubmitted).toLocaleDateString()}
                {c.report.isAnonymous ? ' · anonymous' : c.report.reporter ? ` · ${c.report.reporter.fullName}` : ''}
              </p>
              <div className="mt-3">
                <StatusBadge status={c.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <ReportDetailModal reportId={selected} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </AppLayout>
  );
}
