import { useEffect, useState } from 'react';
import { X, Paperclip, User, MapPin, Calendar, Send } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, BullyingTypeBadge, Button, inputClass } from './ui';

const STATUS_OPTIONS = ['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'ESCALATED'];

export default function ReportDetailModal({ reportId, onClose, onChanged, staff = [] }) {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/reports/${reportId}`);
      setReport(data.report);
      setStatusDraft(data.report.case?.status || 'PENDING');
      setResolutionDraft(data.report.case?.resolutionOutcome || '');
      setAssignTo(data.report.case?.assignedTo?.id || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const caseId = report?.case?.caseId;

  const handleAssign = async () => {
    if (!assignTo) return;
    setSaving(true);
    try {
      await api.patch(`/cases/${caseId}/assign`, { assignedToId: assignTo });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign case.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await api.patch(`/cases/${caseId}/status`, {
        status: statusDraft,
        resolutionOutcome: statusDraft === 'RESOLVED' ? resolutionDraft : undefined,
      });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/cases/${caseId}/notes`, { note });
      setNote('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add note.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Report detail</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && <div className="p-6 text-sm text-slate-500">Loading…</div>}
        {error && !loading && (
          <div className="m-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {report && !loading && (
          <div className="flex-1 space-y-6 px-6 py-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-slate-500">{report.reportId}</p>
                <BullyingTypeBadge type={report.bullyingType} />
                {report.case && <StatusBadge status={report.case.status} />}
                {report.isAnonymous && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Anonymous
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(report.dateSubmitted).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {report.location}
                </span>
                {report.reporter && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {report.reporter.fullName} ({report.reporter.email})
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {report.description}
              </p>
            </div>

            {report.evidence?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evidence</p>
                <ul className="mt-2 space-y-2">
                  {report.evidence.map((ev) => (
                    <li key={ev.fileId}>
                      <a
                        href={`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '').replace(/\/api$/, '') || ''}/api/evidence/${ev.fileId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="truncate">{ev.originalName}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.case && (
              <>
                {user.role === 'ADMINISTRATOR' && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Assignment {report.case.suggestedHandler && `· suggested: ${report.case.suggestedHandler}`}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <select
                        className={inputClass}
                        value={assignTo}
                        onChange={(e) => setAssignTo(e.target.value)}
                      >
                        <option value="">Select staff…</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.role === 'ADMINISTRATOR' ? 'Admin / Disciplinary' : 'Counsellor'})
                          </option>
                        ))}
                      </select>
                      <Button onClick={handleAssign} disabled={saving || !assignTo} variant="secondary">
                        Assign
                      </Button>
                    </div>
                    {report.case.assignedTo && (
                      <p className="mt-2 text-xs text-slate-500">
                        Currently assigned to <strong>{report.case.assignedTo.fullName}</strong>
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Update status</p>
                  <div className="mt-2 flex flex-col gap-2">
                    <select
                      className={inputClass}
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    {statusDraft === 'RESOLVED' && (
                      <textarea
                        className={inputClass}
                        rows={3}
                        placeholder="Resolution outcome (shown to the reporter when they track this report)"
                        value={resolutionDraft}
                        onChange={(e) => setResolutionDraft(e.target.value)}
                      />
                    )}
                    <Button onClick={handleStatusUpdate} disabled={saving} variant="secondary" className="self-start">
                      Save status
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Investigation notes
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      className={inputClass}
                      placeholder="Add a note…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    />
                    <Button onClick={handleAddNote} disabled={savingNote || !note.trim()} variant="secondary">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {report.case.notes?.map((n) => (
                      <li key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="text-slate-700">{n.note}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                    {(!report.case.notes || report.case.notes.length === 0) && (
                      <li className="text-sm text-slate-400">No notes yet.</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
