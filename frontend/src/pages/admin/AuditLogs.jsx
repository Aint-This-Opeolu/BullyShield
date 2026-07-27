import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import api from '../../api/client';
import { Card, EmptyState } from '../../components/ui';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/audit-logs');
        setLogs(data.logs);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-bold text-slate-900">Audit logs</h1>
      <p className="mt-1 text-slate-500">A record of significant actions across the system.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Card className="mt-6 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No activity yet" />
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Performed by</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.logId}>
                    <td className="px-5 py-3 text-slate-700">{l.action}</td>
                    <td className="px-5 py-3 text-slate-500">{l.performedBy}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{l.affectedRecordId || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-400">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
