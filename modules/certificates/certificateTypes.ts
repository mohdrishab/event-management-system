export type CertificateStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface CertificateView {
  id: string;
  studentId: string;
  applicationId: string;
  eventId?: string | null;
  filePath: string;
  status: CertificateStatus;
  isLate: boolean;
  uploadedAt: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  deadline: string;
  remarks?: string | null;

  // UI extras
  signedUrl?: string | null;
  fileMissing?: boolean;
  studentName?: string | null;
  studentUSN?: string | null;
  eventName?: string | null;
  eventType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UploadCertificateInput {
  studentId: string;
  applicationId: string;
  file: File;
}

export interface ReuploadCertificateInput extends UploadCertificateInput {}

export interface ApproveRejectCertificateInput {
  certificateId: string;
  staffId: string;
  staffName: string;
  remarks?: string;
}

export interface ExtendCertificateDeadlineInput {
  certificateId: string;
  staffId: string;
  newDeadline: string; // ISO string
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  blockingApplicationIds?: string[];
}


