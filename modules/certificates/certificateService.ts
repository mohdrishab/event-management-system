import { supabase } from '../../lib/supabaseClient';
import { certificateRepository, buildCertificateStoragePath } from './certificateRepository';
import { certificateValidation } from './certificateValidation';
import type {
  CertificateView,
  EligibilityResult,
  ReuploadCertificateInput,
  UploadCertificateInput,
  CertificateStatus,
} from './certificateTypes';

const CERTIFICATES_BUCKET = 'certificates';

export function isCertificatesFeatureEnabled(): boolean {
  const raw = import.meta.env.VITE_CERTIFICATES_FEATURE_ENABLED;
  if (raw == null || String(raw).trim() === '') return false;
  return String(raw).toLowerCase() === 'true' || String(raw) === '1';
}

async function assertCertificatesEnabled(): Promise<void> {
  if (!isCertificatesFeatureEnabled()) {
    throw new Error('Certificates feature is disabled.');
  }
}

async function calculateStorageUploadedAt(): Promise<string> {
  return new Date().toISOString();
}

export const certificateService = {
  async getUploadableApplications(studentId: string): Promise<Record<string, any>[]> {
    await assertCertificatesEnabled();

    // Approved applications for this student…
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select('id, event_name, event_type, start_date, end_date, status')
      .eq('student_id', studentId)
      .eq('status', 'approved');
    if (appsError) throw appsError;
    const appRows = apps || [];

    if (appRows.length === 0) return [];

    // … where there is no certificate row.
    const { data: certs, error: certsError } = await supabase
      .from('certificates')
      .select('application_id')
      .eq('student_id', studentId)
      .in(
        'application_id',
        appRows.map(a => a.id),
      );
    if (certsError) throw certsError;
    const withCert = new Set((certs || []).map((c: any) => String(c.application_id)));

    return appRows.filter(a => !withCert.has(String(a.id)));
  },

  async calculateDeadline(applicationId: string): Promise<string> {
    const app = await certificateRepository.getApplicationForCertificate(applicationId);
    if (!app) throw new Error('Application not found for deadline calculation.');

    const endDateRaw = app.end_date != null ? String(app.end_date) : null;
    if (!endDateRaw) {
      // Fallback to "now" if the app doesn't contain an end date.
      return new Date().toISOString();
    }

    // If Supabase stores `end_date` as DATE (YYYY-MM-DD), push to end-of-day.
    const endDateIso =
      endDateRaw.length === 10 && !endDateRaw.includes('T') ? `${endDateRaw}T23:59:59.999Z` : endDateRaw;

    const d = new Date(endDateIso);
    if (isNaN(d.getTime())) throw new Error('Could not compute a valid certificate deadline.');
    return d.toISOString();
  },

  markLateIfNeeded(uploadedAtIso: string, deadlineIso: string): boolean {
    const uploaded = new Date(uploadedAtIso);
    const deadline = new Date(deadlineIso);
    if (isNaN(uploaded.getTime()) || isNaN(deadline.getTime())) return false;
    return uploaded.getTime() > deadline.getTime();
  },

  async uploadCertificate(input: UploadCertificateInput): Promise<CertificateView> {
    await assertCertificatesEnabled();

    await certificateValidation.validateFileForCertificateUpload(input.file);

    const { eventId } = await certificateValidation.validatePermissionForCertificateUpload({
      studentId: input.studentId,
      applicationId: input.applicationId,
    });

    const deadline = await this.calculateDeadline(input.applicationId);
    certificateValidation.validateDeadline(deadline);

    const uploadedAt = await calculateStorageUploadedAt();
    const isLate = this.markLateIfNeeded(uploadedAt, deadline);

    const filePath = buildCertificateStoragePath(input.studentId, input.applicationId);

    const { error: uploadError } = await supabase.storage
      .from(CERTIFICATES_BUCKET)
      .upload(filePath, input.file, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (uploadError) throw uploadError;

    // Insert / overwrite the certificate row for this application.
    await certificateRepository.upsertCertificate({
      studentId: input.studentId,
      applicationId: input.applicationId,
      eventId: eventId ?? null,
      filePath,
      deadline,
      uploadedAt,
      isLate,
    });

    const view = await certificateRepository.getCertificateByApplicationId(input.applicationId);
    if (!view) throw new Error('Uploaded certificate record not found.');
    return view;
  },

  async reuploadCertificate(input: ReuploadCertificateInput): Promise<CertificateView> {
    await assertCertificatesEnabled();

    const existing = await certificateRepository.getCertificateByApplicationId(input.applicationId);
    if (existing && existing.status !== 'rejected' && existing.status !== 'revoked') {
      throw new Error('Re-upload is only allowed when a certificate was rejected or revoked.');
    }

    // Re-upload overwrites both storage object and certificate row.
    return this.uploadCertificate(input);
  },

  async getStudentCertificates(studentId: string): Promise<CertificateView[]> {
    if (!isCertificatesFeatureEnabled()) return [];
    return certificateRepository.getStudentCertificates(studentId);
  },

  async getCertificateStatus(applicationId: string): Promise<CertificateView | null> {
    if (!isCertificatesFeatureEnabled()) return null;
    return certificateRepository.getCertificateByApplicationId(applicationId);
  },

  async getAllCertificates(): Promise<CertificateView[]> {
    if (!isCertificatesFeatureEnabled()) return [];
    return certificateRepository.getCertificatesForHod('all');
  },

  async approveCertificate(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    remarks?: string;
  }): Promise<CertificateView> {
    await assertCertificatesEnabled();
    const updated = await certificateRepository.updateCertificateDecision({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      status: 'approved',
      remarks: params.remarks,
    });
    const view = await certificateRepository.getCertificateByApplicationId(updated.applicationId);
    return view || updated;
  },

  async rejectCertificate(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    remarks?: string;
  }): Promise<CertificateView> {
    await assertCertificatesEnabled();
    const updated = await certificateRepository.updateCertificateDecision({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      status: 'rejected',
      remarks: params.remarks,
    });
    const view = await certificateRepository.getCertificateByApplicationId(updated.applicationId);
    return view || updated;
  },

  async revokeCertificate(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    remarks?: string;
  }): Promise<CertificateView> {
    await assertCertificatesEnabled();
    const updated = await certificateRepository.updateCertificateDecision({
      certificateId: params.certificateId,
      staffId: params.staffId,
      staffName: params.staffName,
      status: 'revoked',
      remarks: params.remarks,
    });
    const view = await certificateRepository.getCertificateByApplicationId(updated.applicationId);
    return view || updated;
  },
};

