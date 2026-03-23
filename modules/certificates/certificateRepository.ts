import { supabase } from '../../lib/supabaseClient';
import type {
  CertificateStatus,
  CertificateView,
  EligibilityResult,
} from './certificateTypes';

const CERTIFICATES_BUCKET = 'certificates';

export function buildCertificateStoragePath(studentId: string, applicationId: string) {
  return `${studentId}/${applicationId}/certificate.pdf`;
}

function mapStatus(status: any): CertificateStatus {
  const normalized = String(status).toLowerCase();
  if (normalized === 'approved') return 'approved';
  if (normalized === 'rejected') return 'rejected';
  if (normalized === 'revoked') return 'revoked';
  return 'pending';
}

async function tryCreateSignedUrl(filePath: string): Promise<{ signedUrl: string | null; fileMissing: boolean }> {
  try {
    const { data, error } = await supabase
      .storage
      .from(CERTIFICATES_BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (error) return { signedUrl: null, fileMissing: true };
    return { signedUrl: data?.signedUrl ?? null, fileMissing: false };
  } catch {
    return { signedUrl: null, fileMissing: true };
  }
}

function mapCertificateRow(row: Record<string, any>): CertificateView {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    applicationId: String(row.application_id),
    eventId: row.event_id != null ? String(row.event_id) : null,
    filePath: String(row.file_path),
    status: mapStatus(row.status),
    isLate: row.is_late === true || String(row.is_late) === 'true',
    uploadedAt: row.uploaded_at ? String(row.uploaded_at) : new Date().toISOString(),
    deadline: row.deadline ? String(row.deadline) : new Date().toISOString(),
    verifiedBy: row.verified_by != null ? String(row.verified_by) : null,
    verifiedAt: row.verified_at != null ? String(row.verified_at) : null,
    remarks: row.remarks != null ? String(row.remarks) : null,
  };
}

type ApplicationRowForCertificates = {
  id: string;
  student_id: string;
  event_id?: string | null;
  event_name?: string | null;
  event_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export const certificateRepository = {
  async getStudentCertificates(studentId: string): Promise<CertificateView[]> {
    const { data: certRows, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId);

    if (error) throw error;
    const rows = certRows || [];

    const certificateViews = rows.map(mapCertificateRow);
    const applicationIds = certificateViews.map(c => c.applicationId);
    const studentIds = Array.from(new Set(certificateViews.map(c => c.studentId)));

    // Enrich with application + student info for UI.
    const { data: appsRows, error: appsError } = await supabase
      .from('applications')
      .select('id, student_id, event_id, event_name, event_type, start_date, end_date')
      .in('id', applicationIds);

    if (appsError) throw appsError;

    const appsById = new Map<string, ApplicationRowForCertificates>(
      (appsRows || []).map(r => [
        String(r.id),
        {
          id: String(r.id),
          student_id: String(r.student_id),
          event_id: r.event_id != null ? String(r.event_id) : null,
          event_name: r.event_name != null ? String(r.event_name) : null,
          event_type: r.event_type != null ? String(r.event_type) : null,
          start_date: r.start_date != null ? String(r.start_date) : null,
          end_date: r.end_date != null ? String(r.end_date) : null,
        },
      ]),
    );

    const { data: studentsRows, error: studentsError } = await supabase
      .from('students')
      .select('id, name, usn')
      .in('id', studentIds);

    if (studentsError) throw studentsError;

    const studentsById = new Map<string, { name: string | null; usn: string | null }>(
      (studentsRows || []).map((s: Record<string, any>) => [
        String(s.id),
        { name: s.name != null ? String(s.name) : null, usn: s.usn != null ? String(s.usn) : null },
      ]),
    );

    // Create signed URLs (or mark missing files) for viewing.
    const enriched: CertificateView[] = [];
    for (const c of certificateViews) {
      const { signedUrl, fileMissing } = await tryCreateSignedUrl(c.filePath);
      const app = appsById.get(c.applicationId);
      const student = studentsById.get(c.studentId);

      enriched.push({
        ...c,
        signedUrl,
        fileMissing,
        studentName: student?.name ?? null,
        studentUSN: student?.usn ?? null,
        eventName: app?.event_name ?? null,
        eventType: app?.event_type ?? null,
        startDate: app?.start_date ?? null,
        endDate: app?.end_date ?? null,
      });
    }

    return enriched.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  },

  async getCertificateByApplicationId(applicationId: string): Promise<CertificateView | null> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const cert = mapCertificateRow(data as Record<string, any>);

    const { signedUrl, fileMissing } = await tryCreateSignedUrl(cert.filePath);
    return { ...cert, signedUrl, fileMissing };
  },

  async getPendingCertificates(): Promise<CertificateView[]> {
    const { data: certRows, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('status', 'pending');

    if (error) throw error;
    const rows = certRows || [];
    const certificateViews = rows.map(mapCertificateRow);

    const applicationIds = certificateViews.map(c => c.applicationId);
    const studentIds = Array.from(new Set(certificateViews.map(c => c.studentId)));

    const { data: appsRows, error: appsError } = await supabase
      .from('applications')
      .select('id, student_id, event_id, event_name, event_type, start_date, end_date')
      .in('id', applicationIds);
    if (appsError) throw appsError;

    const appsById = new Map<string, ApplicationRowForCertificates>(
      (appsRows || []).map(r => [
        String(r.id),
        {
          id: String(r.id),
          student_id: String(r.student_id),
          event_id: r.event_id != null ? String(r.event_id) : null,
          event_name: r.event_name != null ? String(r.event_name) : null,
          event_type: r.event_type != null ? String(r.event_type) : null,
          start_date: r.start_date != null ? String(r.start_date) : null,
          end_date: r.end_date != null ? String(r.end_date) : null,
        },
      ]),
    );

    const { data: studentsRows, error: studentsError } = await supabase
      .from('students')
      .select('id, name, usn')
      .in('id', studentIds);
    if (studentsError) throw studentsError;

    const studentsById = new Map<string, { name: string | null; usn: string | null }>(
      (studentsRows || []).map((s: Record<string, any>) => [
        String(s.id),
        { name: s.name != null ? String(s.name) : null, usn: s.usn != null ? String(s.usn) : null },
      ]),
    );

    const enriched: CertificateView[] = [];
    for (const c of certificateViews) {
      const { signedUrl, fileMissing } = await tryCreateSignedUrl(c.filePath);
      const app = appsById.get(c.applicationId);
      const student = studentsById.get(c.studentId);

      enriched.push({
        ...c,
        signedUrl,
        fileMissing,
        studentName: student?.name ?? null,
        studentUSN: student?.usn ?? null,
        eventName: app?.event_name ?? null,
        eventType: app?.event_type ?? null,
        startDate: app?.start_date ?? null,
        endDate: app?.end_date ?? null,
      });
    }

    return enriched.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  },

  async getCertificatesForHod(status: CertificateStatus | 'all'): Promise<CertificateView[]> {
    let query = supabase.from('certificates').select('*');
    if (status !== 'all') query = query.eq('status', status);

    const { data: certRows, error } = await query;
    if (error) throw error;
    const rows = certRows || [];
    const certificateViews = rows.map(mapCertificateRow);

    const applicationIds = certificateViews.map(c => c.applicationId);
    const studentIds = Array.from(new Set(certificateViews.map(c => c.studentId)));

    const { data: appsRows, error: appsError } = await supabase
      .from('applications')
      .select('id, student_id, event_id, event_name, event_type, start_date, end_date')
      .in('id', applicationIds);
    if (appsError) throw appsError;

    const appsById = new Map<string, ApplicationRowForCertificates>(
      (appsRows || []).map(r => [
        String(r.id),
        {
          id: String(r.id),
          student_id: String(r.student_id),
          event_id: r.event_id != null ? String(r.event_id) : null,
          event_name: r.event_name != null ? String(r.event_name) : null,
          event_type: r.event_type != null ? String(r.event_type) : null,
          start_date: r.start_date != null ? String(r.start_date) : null,
          end_date: r.end_date != null ? String(r.end_date) : null,
        },
      ]),
    );

    const { data: studentsRows, error: studentsError } = await supabase
      .from('students')
      .select('id, name, usn')
      .in('id', studentIds);
    if (studentsError) throw studentsError;

    const studentsById = new Map<string, { name: string | null; usn: string | null }>(
      (studentsRows || []).map((s: Record<string, any>) => [
        String(s.id),
        { name: s.name != null ? String(s.name) : null, usn: s.usn != null ? String(s.usn) : null },
      ]),
    );

    const enriched: CertificateView[] = [];
    for (const c of certificateViews) {
      const { signedUrl, fileMissing } = await tryCreateSignedUrl(c.filePath);
      const app = appsById.get(c.applicationId);
      const student = studentsById.get(c.studentId);

      enriched.push({
        ...c,
        signedUrl,
        fileMissing,
        studentName: student?.name ?? null,
        studentUSN: student?.usn ?? null,
        eventName: app?.event_name ?? null,
        eventType: app?.event_type ?? null,
        startDate: app?.start_date ?? null,
        endDate: app?.end_date ?? null,
      });
    }

    return enriched.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  },

  async getApplicationForCertificate(applicationId: string): Promise<Record<string, any> | null> {
    const { data, error } = await supabase
      .from('applications')
      .select('id, student_id, event_id, event_type, end_date')
      .eq('id', applicationId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async upsertCertificate(params: {
    studentId: string;
    applicationId: string;
    eventId?: string | null;
    filePath: string;
    deadline: string;
    uploadedAt: string;
    isLate: boolean;
  }): Promise<CertificateView> {
    const row = {
      student_id: params.studentId,
      application_id: params.applicationId,
      event_id: params.eventId ?? null,
      file_path: params.filePath,
      status: 'pending' as CertificateStatus,
      is_late: params.isLate,
      uploaded_at: params.uploadedAt,
      deadline: params.deadline,
      verified_by: null,
      verified_at: null,
      remarks: null,
    };

    const { data, error } = await supabase
      .from('certificates')
      .upsert(row, { onConflict: 'application_id' })
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to upsert certificate record');
    return mapCertificateRow(data as Record<string, any>);
  },

  async getCertificateStatusForApplication(applicationId: string): Promise<CertificateView | null> {
    return this.getCertificateByApplicationId(applicationId);
  },

  async updateCertificateDecision(params: {
    certificateId: string;
    staffId: string;
    staffName: string;
    status: Exclude<CertificateStatus, 'pending'>; // approved | rejected | revoked
    remarks?: string;
  }): Promise<CertificateView> {
    const verifiedAt = new Date().toISOString();

    // For approved / rejected we enforce a pending-only transition.
    // For revoked we allow from approved or rejected.
    let query = supabase.from('certificates').update({
      status: params.status,
      verified_by: params.staffId,
      verified_at: verifiedAt,
      remarks: params.remarks ?? null,
    })
      .eq('id', params.certificateId);

    if (params.status === 'approved' || params.status === 'rejected') {
      query = query.eq('status', 'pending');
    } else if (params.status === 'revoked') {
      query = query.in('status', ['approved', 'rejected']);
    }

    const { data, error } = await query.select('*').maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Certificate already decided or no longer pending');

    return mapCertificateRow(data as Record<string, any>);
  },

  async extendCertificateDeadline(params: {
    certificateId: string;
    newDeadline: string; // ISO
  }): Promise<CertificateView> {
    const { data: existing, error: existingError } = await supabase
      .from('certificates')
      .select('uploaded_at, deadline, is_late')
      .eq('id', params.certificateId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) throw new Error('Certificate not found');

    const uploadedAt = existing.uploaded_at ? String(existing.uploaded_at) : null;
    const uploadedDate = uploadedAt ? new Date(uploadedAt) : null;
    const deadlineDate = new Date(params.newDeadline);

    if (!uploadedDate || isNaN(uploadedDate.getTime()) || isNaN(deadlineDate.getTime())) {
      throw new Error('Invalid uploaded/deadline date');
    }

    const isLate = uploadedDate.getTime() > deadlineDate.getTime();

    const { data, error } = await supabase
      .from('certificates')
      .update({
        deadline: params.newDeadline,
        is_late: isLate,
      })
      .eq('id', params.certificateId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to extend deadline');
    return mapCertificateRow(data as Record<string, any>);
  },

  async getPreviousCertificateRequiredApplicationIds(params: { studentId: string }): Promise<string[]> {
    // New rule: any approved application requires a certificate.
    const { data, error } = await supabase
      .from('applications')
      .select('id, status')
      .eq('student_id', params.studentId)
      .eq('status', 'approved');

    if (error) throw error;
    return (data || []).map((r: Record<string, any>) => String(r.id));
  },

  async getExistingCertificateApplicationIds(params: { studentId: string; applicationIds: string[] }): Promise<string[]> {
    if (params.applicationIds.length === 0) return [];
    const { data, error } = await supabase
      .from('certificates')
      .select('application_id')
      .eq('student_id', params.studentId)
      .in('application_id', params.applicationIds);

    if (error) throw error;
    return (data || []).map((r: Record<string, any>) => String(r.application_id));
  },
};

