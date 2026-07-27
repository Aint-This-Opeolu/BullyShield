import { useCallback, useEffect, useState } from 'react';
import { FolderKanban } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import api from '../../api/client';
import { Card, StatusBadge, BullyingTypeBadge, EmptyState } from '../../components/ui';
import ReportDetailModal from '../../components/ReportDetailModal';

const COLUMNS = [
  { status: 'PENDING', title: 'Pending assignment' },
  { status: 'UNDER_INVESTIGATION', title: 'Under investigation' },
  { status: 'RESOLVED', title: 'Resolved' },
  { status: 'ESCALATED', title: 'Escalated' },
];

export default function AdminCases() {
  const [cases, setCases] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data }, staffRes] = await Promise.all([api.get('/cases'), api.get('/users/staff')]);
      setCases(data.cases);
      setStaff(staffRes.data.staff);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cases.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-slate-900">Cases</h1>
      <p className="mt-1 text-slate-500">
        Every report automatically becomes a case with a suggested handler. Assign it, then track
        progress here.
      </p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>
      ) : cases.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={FolderKanban} title="No cases yet" description="Cases appear automatically once students submit reports." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = cases.filter((c) => c.status === col.status);
            return (
              <div key={col.status}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-slate-700">{col.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((c) => (
                    <Card
                      key={c.caseId}
                      className="cursor-pointer p-4 transition hover:shadow-md"
                      onClick={() => setSelected(c.report.reportId)}
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
                      <p className="mt-2 truncate text-sm text-slate-700">{c.report.location}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          {c.assignedTo ? c.assignedTo.fullName : c.suggestedHandler ? `Suggested: ${c.suggestedHandler}` : 'Unassigned'}
                        </p>
                        <StatusBadge status={c.status} />
                      </div>
                    </Card>
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                      Nothing here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <ReportDetailModal reportId={selected} staff={staff} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </AppLayout>
  );
}
