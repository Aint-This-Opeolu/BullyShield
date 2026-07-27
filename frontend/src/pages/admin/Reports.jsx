import { useCallback, useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import api from '../../api/client';
import { Card, StatusBadge, BullyingTypeBadge, inputClass, EmptyState } from '../../components/ui';
import ReportDetailModal from '../../components/ReportDetailModal';

const STATUS_OPTIONS = ['', 'PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'ESCALATED'];
const TYPE_OPTIONS = ['', 'PHYSICAL', 'VERBAL', 'PSYCHOLOGICAL', 'RELATIONAL', 'SEXUAL'];

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', bullyingType: '', search: '' });
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.bullyingType) params.bullyingType = filters.bullyingType;
      if (filters.search) params.search = filters.search;
      const [{ data }, staffRes] = await Promise.all([
        api.get('/reports', { params }),
        api.get('/users/staff'),
      ]);
      setReports(data.reports);
      setStaff(staffRes.data.staff);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-slate-500">All incident reports submitted by students.</p>
        </div>
      </div>

      <Card className="mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr,auto,auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Search by report ID, tracking code, or location…"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={filters.bullyingType}
            onChange={(e) => setFilters({ ...filters, bullyingType: e.target.value })}
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : reports.length === 0 ? (
          <EmptyState icon={SlidersHorizontal} title="No reports match your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Report</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Reporter</th>
                  <th className="px-5 py-3 font-medium">Assigned to</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr
                    key={r.reportId}
                    onClick={() => setSelected(r.reportId)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.reportId}</td>
                    <td className="px-5 py-3">
                      <BullyingTypeBadge type={r.bullyingType} />
                    </td>
                    <td className="max-w-[160px] truncate px-5 py-3 text-slate-700">{r.location}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {r.isAnonymous ? 'Anonymous' : r.reporter?.fullName || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{r.case?.assignedTo?.fullName || '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-400">
                      {new Date(r.dateSubmitted).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <ReportDetailModal
          reportId={selected}
          staff={staff}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </AppLayout>
  );
}
