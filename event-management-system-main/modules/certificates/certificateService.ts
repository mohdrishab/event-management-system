import { supabase } from '../../lib/supabaseClient';
import { certificateRepository, buildCertificateStoragePath } from './certificateRepository';
import { certificateValidation } from './certificateValidation';
import type {
  CertificateView,
  ReuploadCertificateInput,
  UploadCertificateInput,
  CertificateStatus,
} from './certificateTypes';

const CERTIFICATES_BUCKET = 'certificates';

let cachedCertificatesFeatureEnabled: boolean | null = null;
let cachedCertificatesFeatureEnabledPromise: Promise<boolean> | null = null;

function parseBooleanish(val: any): boolean {
  if (val === true || val === false) return val;
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y';
}

function getCertificatesFeatureEnabledFromEnv(): boolean {
  const raw = import.meta.env.VITE_CERTIFICATES_FEATURE_ENABLED;
  if (raw == null || String(raw).trim() === '') return false;
  return parseBooleanish(raw);
}

async function getCertificatesFeatureEnabledFromDb(): Promise<boolean> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('feature_name', 'certificate_module')
    .maybeSingle();

  if (error) throw error;
  return parseBooleanish(data?.enabled);
}

export async function isCertificatesFeatureEnabled(): Promise<boolean> {
  if (cachedCertificatesFeatureEnabled != null) return cachedCertificatesFeatureEnabled;

  if (!cachedCertificatesFeatureEnabledPromise) {
    cachedCertificatesFeatureEnabledPromise = getCertificatesFeatureEnabledFromDb()
      .catch(() => {
        // Fallback to env-var behavior to avoid hard failures if DB table/column differs.
        return getCertificatesFeatureEnabledFromEnv();
      })
      .finally(() => {
        cachedCertificatesFeatureEnabledPromise = null;
      });
  }

  cachedCertificatesFeatureEnabled = await cachedCertificatesFeatureEnabledPromise;
  return cachedCertificatesFeatureEnabled;
}

async function assertCertificatesEnabled(): Promise<void> {
  if (!(await isCertificatesFeatureEnabled())) {
    throw new Error('Certificates feature is disabled.');
  }
}

export const certificateService = {
  async getUploadableApplications(studentId: string): Promise<Record<string, any>[]> {
    await assertCertificatesEnabled();

    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select('id, student_id, event_id, event_name, event_type, start_date, end_date, status')
      .eq('student_id', studentId)
      .in('status', ['pending', 'approved']);
    if (appsError) throw appsError;
    return (apps || []).filter((a: any) => !!a.event_id);
  },

  async uploadCertificate(input: UploadCertificateInput): Promise<CertificateView> {
    await assertCertificatesEnabled();

    await certificateValidation.validateFileForCertificateUpload(input.file);
    await certificateValidation.validatePermissionForCertificateUpload({
      uid: input.uid,
      eventId: input.eventId,
    });

    const uploadedAt = new Date().toISOString();
    const filePath = buildCertificateStoragePath(input.uid, input.eventId);

    const { error: uploadError } = await supabase.storage
      .from(CERTIFICATES_BUCKET)
      .upload(filePath, input.file, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (uploadError) throw uploadError;
    
    // Update applications table with certificate details
    const { error: updateAppError } = await supabase
      .from('applications')
      .update({
        certificate_uploaded: true,
        certificate_url: filePath,
        certificate_uploaded_at: uploadedAt
      })
      .eq('student_id', input.uid)
      .eq('event_id', input.eventId);
      
    if (updateAppError) throw updateAppError;

    await certificateRepository.upsertCertificate({
      uid: input.uid,
      eventId: input.eventId,
      fileUrl: filePath,
      uploadedAt,
      verified: false,
    });

    const view = await certificateRepository.getCertificateByUidAndEvent(input.uid, input.eventId);
    if (!view) throw new Error('Uploaded certificate record not found.');
    return view;
  },

  async reuploadCertificate(input: ReuploadCertificateInput): Promise<CertificateView> {
    await assertCertificatesEnabled();
    // Update applications table with new certificate details
    const { error: updateAppError } = await supabase
      .from('applications')
      .update({
        certificate_uploaded: true,
        certificate_url: input.file.name,
        certificate_uploaded_at: new Date().toISOString()
      })
      .eq('student_id', input.uid)
      .eq('event_id', input.eventId);
      
    if (updateAppError) throw updateAppError;
    
    return this.uploadCertificate(input);
  },

  async getStudentCertificates(uid: string): Promise<CertificateView[]> {
    if (!(await isCertificatesFeatureEnabled())) return [];
    return certificateRepository.getStudentCertificates(uid);
  },

  async getCertificateStatus(uid: string, eventId: string): Promise<CertificateView | null> {
    if (!(await isCertificatesFeatureEnabled())) return null;
    return certificateRepository.getCertificateByUidAndEvent(uid, eventId);
  },

  async getAllCertificates(): Promise<CertificateView[]> {
    if (!(await isCertificatesFeatureEnabled())) return [];
    return certificateRepository.getCertificatesForHod('all');
  },

  async approveCertificate(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    remarks?: string;
  }): Promise<CertificateView> {
    await assertCertificatesEnabled();
    void params.staffName;
    void params.remarks;
    return certificateRepository.updateCertificateVerification({
      certificateId: params.certificateId,
      verified: true,
      staffId: params.staffId,
    });
  },

  async rejectCertificate(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    remarks?: string;
  }): Promise<CertificateView> {
    await assertCertificatesEnabled();
    void params.staffName;
    void params.remarks;
    return certificateRepository.updateCertificateVerification({
      certificateId: params.certificateId,
      verified: false,
      staffId: params.staffId,
    });
  },

  async revokeCertificate(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    remarks?: string;
  }): Promise<CertificateView> {
    await assertCertificatesEnabled();
    void params.staffName;
    void params.remarks;
    return certificateRepository.updateCertificateVerification({
      certificateId: params.certificateId,
      verified: false,
      staffId: params.staffId,
    });
  },
};

