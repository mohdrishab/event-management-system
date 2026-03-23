
import React, { useEffect, useMemo, useState } from 'react';
import { User, LeaveApplication } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/Button';
import { DashboardLayout } from '../components/layout';
import { Check, X, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { staffCertificateService } from '../modules/certificates/staffCertificateService';
import { isCertificatesFeatureEnabled } from '../modules/certificates/certificateService';
import type { CertificateView } from '../modules/certificates/certificateTypes';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

type ViewMode = 'TRADITIONAL';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [viewMode] = useState<ViewMode>('TRADITIONAL');
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [pendingCertificates, setPendingCertificates] = useState<CertificateView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [certificatesEnabled, setCertificatesEnabled] = useState(false);

  const isHOD = user.role === 'hod';

  const safeDate = (dateString: string | undefined | null) => {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const all = await storageService.getApplications();
      setApplications(all);
      if (certificatesEnabled) {
        const certs = await staffCertificateService.getPendingCertificates();
        setPendingCertificates(certs);
      } else {
        setPendingCertificates([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const enabled = await isCertificatesFeatureEnabled().catch(() => false);
      if (!cancelled) setCertificatesEnabled(enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadData();
  }, [certificatesEnabled]);

  const pendingApps = useMemo(
    () => applications.filter(a => String(a.status || '').toLowerCase() === 'pending'),
    [applications]
  );

  const handleDecision = async (appId: string, status: 'approved' | 'rejected') => {
    await storageService.updateApplicationStatus(appId, status, user.id, user.name);
    await loadData(true);
  };

  return (
    <DashboardLayout
      sidebarProps={{ viewMode, onViewModeChange: () => {}, isHOD, canApproveGlobal: true, isSwipeTheme: false, portalTitle: isHOD ? 'HOD Portal' : 'Faculty Portal' }}
      navbarProps={{ user, isHOD, isSwipeTheme: false, pageLabel: 'Pending requests', isRefreshing, onRefresh: () => loadData(true), onLogout }}
    >
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Pending Applications</h2>
              {pendingApps.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">No pending applications.</div>
              ) : (
                pendingApps.map(app => (
                  <div key={app.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-gray-900">{app.studentName || 'Student'} ({app.studentUSN || '—'})</div>
                        <div className="text-sm text-gray-600">{app.eventName}</div>
                        <div className="text-xs text-gray-500">{format(safeDate(app.startDate), 'MMM d')} - {format(safeDate(app.endDate), 'MMM d, yyyy')}</div>
                        <div className="text-sm text-gray-700 mt-2">{app.sop || app.reason || 'No SOP provided.'}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleDecision(app.id, 'approved')}><Check className="w-4 h-4 mr-1" /> Approve</Button>
                        <Button variant="danger" onClick={() => handleDecision(app.id, 'rejected')}><X className="w-4 h-4 mr-1" /> Reject</Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Pending Certificates</h2>
              {!certificatesEnabled ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">Certificates module is disabled.</div>
              ) : pendingCertificates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">No pending certificates.</div>
              ) : (
                pendingCertificates.map(cert => (
                  <div key={cert.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-900">{cert.studentName || 'Student'} ({cert.studentUSN || '—'})</div>
                      <div className="text-sm text-gray-600">{cert.eventName || cert.eventType || 'Event'}</div>
                      <div className="text-xs text-gray-500">Uploaded: {cert.uploadedAt ? format(safeDate(cert.uploadedAt), 'MMM d, yyyy') : '—'}</div>
                      {cert.signedUrl && <a href={cert.signedUrl} target="_blank" rel="noreferrer" className="text-xs text-orange-700 inline-flex items-center gap-1 mt-1"><FileText className="w-3 h-3" /> View PDF</a>}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={async () => { await staffCertificateService.approveCertificate({ certificateId: cert.id, staffId: user.id, staffName: user.name, staffRole: user.role }); await loadData(true); }}>Verify</Button>
                      <Button variant="danger" onClick={async () => { await staffCertificateService.rejectCertificate({ certificateId: cert.id, staffId: user.id, staffName: user.name, staffRole: user.role }); await loadData(true); }}>Reject</Button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
