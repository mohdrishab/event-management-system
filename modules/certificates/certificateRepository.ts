import { supabase } from '../../lib/supabaseClient';
import type { CertificateStatus, CertificateView } from './certificateTypes';

const CERTIFICATES_BUCKET = 'certificates';

export function buildCertificateStoragePath(uid: string, eventId: string) {
  return `${uid}/${eventId}/certificate.pdf`;
}

async function toSignedUrl(fileUrl: string): Promise<{ signedUrl: string | null; fileMissing: boolean }> {
  if (!fileUrl) return { signedUrl: null, fileMissing: true };
  if (/^https?:\/\//i.test(fileUrl)) return { signedUrl: fileUrl, fileMissing: false };
  try {
    const { data, error } = await supabase.storage.from(CERTIFICATES_BUCKET).createSignedUrl(fileUrl, 60 * 60);
    if (error) return { signedUrl: null, fileMissing: true };
    return { signedUrl: data?.signedUrl ?? null, fileMissing: false };
  } catch {
    return { signedUrl: null, fileMissing: true };
  }
}

function mapCertificateRow(row: Record<string, any>): CertificateView {
  const verified = row.verified === true || String(row.verified).toLowerCase() === 'true';
  return {
    id: String(row.id),
    uid: String(row.uid),
    eventId: row.event_id != null ? String(row.event_id) : null,
    fileUrl: row.file_url != null ? String(row.file_url) : '',
    verified,
    status: verified ? 'approved' : 'pending',
    uploadedAt: row.uploaded_at ? String(row.uploaded_at) : null,
    verifiedBy: row.verified_by != null ? String(row.verified_by) : null,
  };
}

async function enrichCertificateViews(rows: CertificateView[]): Promise<CertificateView[]> {
  const eventIds = Array.from(new Set(rows.map(r => r.eventId).filter(Boolean))) as string[];
  const uids = Array.from(new Set(rows.map(r => r.uid).filter(Boolean)));

  const [appsResult, studentsResult] = await Promise.all([
    eventIds.length
      ? supabase
          .from('applications')
          .select('uid, event_id, event_name, event_type, start_date, end_date')
          .in('event_id', eventIds)
      : Promise.resolve({ data: [], error: null } as any),
    uids.length ? supabase.from('students').select('id, name, usn').in('id', uids) : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (appsResult.error) throw appsResult.error;
  if (studentsResult.error) throw studentsResult.error;

  const appByUidEvent = new Map<string, any>();
  for (const a of appsResult.data || []) {
    appByUidEvent.set(`${String(a.uid)}::${String(a.event_id)}`, a);
  }
  const studentById = new Map<string, any>((studentsResult.data || []).map((s: any) => [String(s.id), s]));

  const enriched: CertificateView[] = [];
  for (const c of rows) {
    const app = c.eventId ? appByUidEvent.get(`${c.uid}::${c.eventId}`) : null;
    const student = studentById.get(c.uid);
    const { signedUrl, fileMissing } = await toSignedUrl(c.fileUrl);
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
  return enriched.sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')));
}

export const certificateRepository = {
  async getStudentCertificates(uid: string): Promise<CertificateView[]> {
    const { data, error } = await supabase.from('certificates').select('*').eq('uid', uid);
    if (error) throw error;
    return enrichCertificateViews((data || []).map((r: Record<string, any>) => mapCertificateRow(r)));
  },

  async getCertificateByUidAndEvent(uid: string, eventId: string): Promise<CertificateView | null> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('uid', uid)
      .eq('event_id', eventId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [enriched] = await enrichCertificateViews([mapCertificateRow(data as Record<string, any>)]);
    return enriched || null;
  },

  async getCertificateById(certificateId: string): Promise<CertificateView | null> {
    const { data, error } = await supabase.from('certificates').select('*').eq('id', certificateId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [enriched] = await enrichCertificateViews([mapCertificateRow(data as Record<string, any>)]);
    return enriched || null;
  },

  async getCertificatesForHod(status: CertificateStatus | 'all'): Promise<CertificateView[]> {
    let query = supabase.from('certificates').select('*');
    if (status === 'pending') query = query.eq('verified', false);
    if (status === 'approved') query = query.eq('verified', true);
    const { data, error } = await query;
    if (error) throw error;
    return enrichCertificateViews((data || []).map((r: Record<string, any>) => mapCertificateRow(r)));
  },

  async getApplicationForCertificate(applicationId: string): Promise<Record<string, any> | null> {
    const { data, error } = await supabase
      .from('applications')
      .select('id, uid, event_id, event_type, end_date')
      .eq('id', applicationId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async upsertCertificate(params: {
    uid: string;
    eventId: string;
    fileUrl: string;
    uploadedAt: string;
    verified?: boolean;
    verifiedBy?: string | null;
  }): Promise<CertificateView> {
    const { data, error } = await supabase
      .from('certificates')
      .upsert(
        {
          uid: params.uid,
          event_id: params.eventId,
          file_url: params.fileUrl,
          uploaded_at: params.uploadedAt,
          verified: params.verified ?? false,
          verified_by: params.verifiedBy ?? null,
        },
        { onConflict: 'uid,event_id' }
      )
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Failed to upsert certificate record.');
    return mapCertificateRow(data as Record<string, any>);
  },

  async updateCertificateVerification(params: {
    certificateId: string;
    verified: boolean;
    staffId?: string | null;
  }): Promise<CertificateView> {
    const { data, error } = await supabase
      .from('certificates')
      .update({
        verified: params.verified,
        verified_by: params.staffId ?? null,
      })
      .eq('id', params.certificateId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Certificate not found.');
    return mapCertificateRow(data as Record<string, any>);
  },

  async getPreviousCertificateRequiredApplicationIds(params: { studentId: string }): Promise<string[]> {
    const { data, error } = await supabase
      .from('applications')
      .select('event_id')
      .eq('uid', params.studentId)
      .eq('status', 'approved');
    if (error) throw error;
    return Array.from(new Set((data || []).map((r: Record<string, any>) => String(r.event_id || '')).filter(Boolean)));
  },

  async getExistingCertificateApplicationIds(params: { studentId: string; applicationIds: string[] }): Promise<string[]> {
    if (params.applicationIds.length === 0) return [];
    const { data, error } = await supabase
      .from('certificates')
      .select('event_id')
      .eq('uid', params.studentId)
      .in('event_id', params.applicationIds);
    if (error) throw error;
    return (data || []).map((r: Record<string, any>) => String(r.event_id));
  },
};

