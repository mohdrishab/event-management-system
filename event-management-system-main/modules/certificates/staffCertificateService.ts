import type {
  CertificateStatus,
  ExtendCertificateDeadlineInput,
  ApproveRejectCertificateInput,
  CertificateView,
} from './certificateTypes';
import { isCertificatesFeatureEnabled, certificateService } from './certificateService';

function assertStaffCanDecide(role: string | undefined) {
  if (role !== 'professor' && role !== 'hod') {
    throw new Error('Only staff (Professor/HoD) can approve or reject certificates.');
  }
}

export const staffCertificateService = {
  async getPendingCertificates(): Promise<CertificateView[]> {
    if (!(await isCertificatesFeatureEnabled())) return [];
    return certificateService.getAllCertificates().then(list => list.filter(c => c.verified === false));
  },

  async approveCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }): Promise<CertificateView> {
    if (!(await isCertificatesFeatureEnabled())) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);

    return certificateService.approveCertificate({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      remarks: params.remarks,
    });
  },

  async rejectCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }): Promise<CertificateView> {
    if (!(await isCertificatesFeatureEnabled())) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);

    return certificateService.rejectCertificate({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      remarks: params.remarks,
    });
  },

  async extendDeadline(params: ExtendCertificateDeadlineInput & { staffRole?: string }): Promise<CertificateView> {
    void params;
    throw new Error('Deadline extension is not supported by the finalized certificates schema.');
  },

  async getCertificatesForHod(status: CertificateStatus | 'all'): Promise<CertificateView[]> {
    if (!(await isCertificatesFeatureEnabled())) return [];
    if (status === 'all') return certificateService.getAllCertificates();
    if (status === 'pending') return certificateService.getAllCertificates().then(list => list.filter(c => !c.verified));
    if (status === 'approved') return certificateService.getAllCertificates().then(list => list.filter(c => c.verified));
    return [];
  },

  async revokeCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }): Promise<CertificateView> {
    if (!(await isCertificatesFeatureEnabled())) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);
    return certificateService.revokeCertificate({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      remarks: params.remarks,
    });
  },
};

