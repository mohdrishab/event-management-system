import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { DataTable } from '../../components/hod/DataTable';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { isCertificatesFeatureEnabled } from '../../modules/certificates/certificateService';
import { staffCertificateService } from '../../modules/certificates/staffCertificateService';
import type { CertificateStatus, CertificateView } from '../../modules/certificates/certificateTypes';
import { format } from 'date-fns';
import { Check, X, FileText, Clock } from 'lucide-react';
import { safeDate } from '../StudentDashboard';

function getCertificateStatusBadge(status: CertificateStatus) {
  const normalized = status.toUpperCase();
  if (normalized === 'APPROVED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
        <Check className="w-3 h-3 mr-1" /> Approved
      </span>
    );
  }
  if (normalized === 'REJECTED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        <X className="w-3 h-3 mr-1" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
      <Clock className="w-3 h-3 mr-1" /> Pending
    </span>
  );
}

export const HodCertificatesPage: React.FC = () => {
  const { user } = useHodPortal();
  const certificatesEnabled = isCertificatesFeatureEnabled();

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | CertificateStatus>('all');
  const [lateOnly, setLateOnly] = useState(false);

  const [certificates, setCertificates] = useState<CertificateView[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [extendDeadlineDate, setExtendDeadlineDate] = useState('');

  const selectedCertificate = useMemo(() => {
    if (!selectedCertificateId) return null;
    return certificates.find(c => c.id === selectedCertificateId) || null;
  }, [certificates, selectedCertificateId]);

  const load = async () => {
    if (!certificatesEnabled) {
      setCertificates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await staffCertificateService.getCertificatesForHod(statusFilter);
      setCertificates(rows);
    } catch (err) {
      console.error('Failed to load certificates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, lateOnly, certificatesEnabled]);

  const filteredCertificates = useMemo(() => {
    let rows = [...certificates];
    if (lateOnly) rows = rows.filter(c => c.isLate);
    return rows.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  }, [certificates, lateOnly]);

  useEffect(() => {
    if (!selectedCertificateId) return;
    if (!selectedCertificate) {
      setSelectedCertificateId(null);
      setRemarks('');
      setExtendDeadlineDate('');
    }
  }, [selectedCertificateId, selectedCertificate]);

  const columns = useMemo(() => {
    return [
      {
        id: 'student',
        header: 'Student',
        cell: (c: CertificateView) => (
          <div>
            <div className="font-medium text-gray-900">{c.studentName || '—'}</div>
            <div className="text-xs text-gray-500">{c.studentUSN || ''}</div>
          </div>
        ),
      },
      {
        id: 'event',
        header: 'Event',
        cell: (c: CertificateView) => (
          <div>
            <div className="font-medium text-gray-900">{c.eventName || c.eventType || '—'}</div>
            {c.startDate && c.endDate ? (
              <div className="text-xs text-gray-500">
                {format(safeDate(c.startDate), 'MMM d')} - {format(safeDate(c.endDate), 'MMM d, yyyy')}
              </div>
            ) : (
              <div className="text-xs text-gray-500">—</div>
            )}
          </div>
        ),
      },
      {
        id: 'deadline',
        header: 'Deadline',
        cell: (c: CertificateView) => (
          <div>
            <div className="font-medium text-gray-900">{c.deadline ? format(safeDate(c.deadline), 'MMM d, yyyy') : '—'}</div>
            {c.isLate && (
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
                <Clock className="w-3 h-3" /> Late
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'uploaded',
        header: 'Uploaded',
        cell: (c: CertificateView) => (
          <div className="text-sm text-gray-800">
            {c.uploadedAt ? format(safeDate(c.uploadedAt), 'MMM d, yyyy') : '—'}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (c: CertificateView) => getCertificateStatusBadge(c.status),
      },
      {
        id: 'file',
        header: 'File',
        cell: (c: CertificateView) =>
          c.signedUrl && !c.fileMissing ? (
            <a
              href={c.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-orange-700 hover:text-orange-800"
            >
              <FileText className="w-4 h-4" /> View
            </a>
          ) : (
            <span className="text-xs text-red-700 font-semibold">{c.fileMissing ? 'Missing' : 'Unavailable'}</span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (c: CertificateView) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCertificateId(c.id);
                setRemarks(c.remarks || '');
                setExtendDeadlineDate(c.deadline ? String(c.deadline).slice(0, 10) : '');
              }}
            >
              Review
            </Button>
          </div>
        ),
        className: 'text-right',
      },
    ];
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-gray-500">Loading certificates…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {!certificatesEnabled ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-600">
          Certificates module is disabled.
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Certificates</h2>
              <p className="text-sm text-gray-500">View all certificate uploads, including late submissions.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select
                className="rounded-xl border border-gray-200 px-3 py-3 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                type="button"
                onClick={() => setLateOnly(v => !v)}
                className={`rounded-xl border px-3 py-3 text-sm shadow-sm transition-colors ${
                  lateOnly
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Late only
              </button>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={filteredCertificates}
            rowKey={(r: CertificateView) => r.id}
            emptyMessage="No certificates match your filters."
          />

          {selectedCertificate && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Certificate Review</h3>
                  <div className="mt-2 text-sm text-gray-700">
                    <div className="font-semibold">{selectedCertificate.studentName || 'Student'}</div>
                    <div className="text-gray-500">{selectedCertificate.studentUSN || ''}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  {selectedCertificate.signedUrl && !selectedCertificate.fileMissing ? (
                    <a
                      href={selectedCertificate.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-orange-700 hover:text-orange-800"
                    >
                      <FileText className="w-4 h-4" /> View PDF
                    </a>
                  ) : (
                    <div className="text-xs text-red-700 font-medium">
                      {selectedCertificate.fileMissing ? 'File missing in storage.' : 'File unavailable.'}
                    </div>
                  )}
                  {selectedCertificate.isLate && (
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                      <Clock className="w-3 h-3" /> Late upload
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <h4 className="text-sm font-bold text-gray-900">Event</h4>
                  <div className="mt-2 font-semibold text-gray-900">{selectedCertificate.eventName || selectedCertificate.eventType || '—'}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Deadline: {selectedCertificate.deadline ? format(safeDate(selectedCertificate.deadline), 'MMM d, yyyy') : '—'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <h4 className="text-sm font-bold text-gray-900">Remarks</h4>
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                    placeholder="Add remarks (optional)…"
                    rows={4}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Extend deadline
                    </label>
                    <input
                      type="date"
                      className="w-full sm:w-[180px] px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      value={extendDeadlineDate}
                      onChange={e => setExtendDeadlineDate(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const dateStr = extendDeadlineDate;
                      if (!dateStr) return;
                      try {
                        const newDeadlineIso = new Date(`${dateStr}T23:59:59.999Z`).toISOString();
                        await staffCertificateService.extendDeadline({
                          certificateId: selectedCertificate.id,
                          staffId: user.id,
                          staffRole: user.role,
                          newDeadline: newDeadlineIso,
                        });
                        await load();
                        setSelectedCertificateId(null);
                        setRemarks('');
                      } catch (err: any) {
                        alert(err?.message || 'Failed to extend deadline.');
                      }
                    }}
                  >
                    Extend
                  </Button>
                </div>

                <div className="flex gap-3 sm:justify-end">
                  <Button
                    onClick={async () => {
                      try {
                        await staffCertificateService.approveCertificate({
                          certificateId: selectedCertificate.id,
                          staffId: user.id,
                          staffName: user.name,
                          staffRole: user.role,
                          remarks: remarks || undefined,
                        });
                        await load();
                        setSelectedCertificateId(null);
                        setRemarks('');
                      } catch (err: any) {
                        alert(err?.message || 'Failed to approve certificate.');
                      }
                    }}
                    disabled={selectedCertificate.status !== 'pending'}
                  >
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>

                  <Button
                    variant="danger"
                    onClick={async () => {
                      try {
                        await staffCertificateService.rejectCertificate({
                          certificateId: selectedCertificate.id,
                          staffId: user.id,
                          staffName: user.name,
                          staffRole: user.role,
                          remarks: remarks || undefined,
                        });
                        await load();
                        setSelectedCertificateId(null);
                        setRemarks('');
                      } catch (err: any) {
                        alert(err?.message || 'Failed to reject certificate.');
                      }
                    }}
                    disabled={selectedCertificate.status !== 'pending'}
                  >
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

