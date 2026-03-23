import type {
  ExtendCertificateDeadlineInput,
  ApproveRejectCertificateInput,
  ReuploadCertificateInput,
  UploadCertificateInput,
} from './certificateTypes';
import { certificateService } from './certificateService';
import { staffCertificateService } from './staffCertificateService';

export const certificateController = {
  async uploadCertificate(input: UploadCertificateInput) {
    return certificateService.uploadCertificate(input);
  },

  async reuploadCertificate(input: ReuploadCertificateInput) {
    return certificateService.reuploadCertificate(input);
  },

  async getStudentCertificates(uid: string) {
    return certificateService.getStudentCertificates(uid);
  },

  async getCertificateStatus(uid: string, eventId: string) {
    return certificateService.getCertificateStatus(uid, eventId);
  },

  async getPendingCertificates() {
    return staffCertificateService.getPendingCertificates();
  },

  async approveCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }) {
    return staffCertificateService.approveCertificate(params);
  },

  async rejectCertificate(params: ApproveRejectCertificateInput & { staffRole?: string }) {
    return staffCertificateService.rejectCertificate(params);
  },

  async extendDeadline(params: ExtendCertificateDeadlineInput & { staffRole?: string }) {
    return staffCertificateService.extendDeadline(params);
  },
};

