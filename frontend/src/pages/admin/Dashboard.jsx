import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { FileText, Clock, FolderSearch, CheckCircle2, ArrowUpRight, TriangleAlert } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import api from '../../api/client';
import { Card, StatusBadge, BullyingTypeBadge } from '../../components/ui';

const TYPE_COLORS = {
  PHYSICAL: '#b91c1c',
  VERBAL: '#b45309',
  PSYCHOLOGICAL: '#3b66f5',
  RELATIONAL: '#0f9d8e',
  SEXUAL: '#7c3aed',
};

const STAT_CARDS = [
  { key: 'total', label: 'Total reports', icon: FileText, tone: 'text-slate-700 bg-slate-100' },
  { key: 'pending', label: 'Pending', icon: Clock, tone: 'text-amber-700 bg-amber-50' },
  { key: 'underInvestigation', label: 'Under investigation', icon: FolderSearch, tone: 'text-blue-700 bg-blue-50' },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'escalated', label: 'Escalated', icon: TriangleAlert, tone: 'text-red-700 bg-red-50' },
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/dashboard');
        setData(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard.');
      }
    })();
  }, []);

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">An overview of all reported incidents.</p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            {STAT_CARDS.map(({ key, label, icon: Icon, tone }) => (
              <Card key={key} className="p-4">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.9} />
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{data.totals[key]}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="p-6 lg:col-span-3">
              <p className="text-sm font-semibold text-slate-800">Reports over the last 6 months</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="#3b66f5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 lg:col-span-2">
              <p className="text-sm font-semibold text-slate-800">By incident type</p>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byType}
                      dataKey="count"
                      nameKey="type"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {data.byType.map((entry) => (
                        <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5">
                {data.byType.map((t) => (
                  <li key={t.type} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[t.type] || '#94a3b8' }}
                      />
                      {t.type.charAt(0) + t.type.slice(1).toLowerCase()}
                    </span>
                    <span className="font-medium text-slate-800">{t.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Recent activity</p>
              <Link
                to="/admin/reports"
                className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
              >
                View all reports <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {data.recentReports.map((r) => (
                <div key={r.reportId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-slate-400">{r.reportId}</p>
                    <p className="truncate text-sm text-slate-700">
                      {r.location} {r.isAnonymous && <span className="text-slate-400">· anonymous</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <BullyingTypeBadge type={r.bullyingType} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
              {data.recentReports.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">No reports yet.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
