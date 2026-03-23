import React, { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { useHodPortal } from '../../contexts/HodPortalContext';
import { isCertificatesFeatureEnabled } from '../../modules/certificates/certificateService';
import { staffCertificateService } from '../../modules/certificates/staffCertificateService';
import type { CertificateView } from '../../modules/certificates/certificateTypes';
import { format } from 'date-fns';
import { Check, X, FileText } from 'lucide-react';
import { safeDate } from '../StudentDashboard';

export const HodCertificatesPage: React.FC = () => {
  const { user } = useHodPortal();
  const [certificatesEnabled, setCertificatesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateView[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const enabled = await isCertificatesFeatureEnabled();
      setCertificatesEnabled(enabled);
      if (!enabled) {
        setCertificates([]);
        return;
      }
      const rows = await staffCertificateService.getCertificatesForHod('all');
      setCertificates(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-gray-500">Loading certificates…</span>
      </div>
    );
  }

  if (!certificatesEnabled) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-600">Certificates module is disabled.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <h2 className="text-2xl font-bold text-gray-900">Certificates</h2>
      {certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-600">No certificates found.</div>
      ) : (
        <div className="space-y-4">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">{cert.studentName || 'Student'} ({cert.studentUSN || '—'})</div>
                <div className="text-sm text-gray-600">{cert.eventName || cert.eventType || 'Event'}</div>
                <div className="text-xs text-gray-500">Uploaded: {cert.uploadedAt ? format(safeDate(cert.uploadedAt), 'MMM d, yyyy') : '—'}</div>
                <div className="mt-1 text-xs font-medium">
                  {cert.verified ? <span className="text-green-700">Verified</span> : <span className="text-yellow-700">Pending verification</span>}
                </div>
                {cert.signedUrl && (
                  <a href={cert.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-orange-700 mt-2">
                    <FileText className="w-3 h-3" /> View PDF
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={async () => { await staffCertificateService.approveCertificate({ certificateId: cert.id, staffId: user.id, staffName: user.name, staffRole: user.role }); await load(); }}>
                  <Check className="w-4 h-4 mr-1" /> Verify
                </Button>
                <Button variant="danger" onClick={async () => { await staffCertificateService.rejectCertificate({ certificateId: cert.id, staffId: user.id, staffName: user.name, staffRole: user.role }); await load(); }}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

