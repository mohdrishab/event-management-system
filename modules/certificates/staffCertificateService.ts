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
    if (!isCertificatesFeatureEnabled()) return [];
    return certificateService.getAllCertificates().then(list => list.filter(c => c.status === 'pending'));
  },

  async approveCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }): Promise<CertificateView> {
    if (!isCertificatesFeatureEnabled()) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);

    return certificateService.approveCertificate({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      remarks: params.remarks,
    });
  },

  async rejectCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }): Promise<CertificateView> {
    if (!isCertificatesFeatureEnabled()) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);

    return certificateService.rejectCertificate({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      remarks: params.remarks,
    });
  },

  async extendDeadline(params: ExtendCertificateDeadlineInput & { staffRole?: string }): Promise<CertificateView> {
    if (!isCertificatesFeatureEnabled()) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);

    const updated = await certificateRepository.extendCertificateDeadline({
      certificateId: params.certificateId,
      newDeadline: params.newDeadline,
    });

    const view = await certificateRepository.getCertificateByApplicationId(updated.applicationId);
    if (!view) return updated;
    return view;
  },

  async getCertificatesForHod(status: CertificateStatus | 'all'): Promise<CertificateView[]> {
    if (!isCertificatesFeatureEnabled()) return [];
    if (status === 'all') return certificateService.getAllCertificates();
    return certificateService.getAllCertificates().then(list => list.filter(c => c.status === status));
  },

  async revokeCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }): Promise<CertificateView> {
    if (!isCertificatesFeatureEnabled()) throw new Error('Certificates feature is disabled.');
    assertStaffCanDecide(params.staffRole);
    return certificateService.revokeCertificate({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      remarks: params.remarks,
    });
  },
};

