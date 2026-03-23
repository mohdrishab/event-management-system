import { certificateRepository } from './certificateRepository';

function getStorageCertificateMaxSizeBytes(): number {
  const raw = import.meta.env.VITE_STORAGE_CERTIFICATE_MAX_SIZE;
  if (raw == null || String(raw).trim() === '') {
    throw new Error('Missing `VITE_STORAGE_CERTIFICATE_MAX_SIZE` config for certificate uploads.');
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid `VITE_STORAGE_CERTIFICATE_MAX_SIZE` config (must be a positive number in bytes).');
  }
  return parsed;
}

function isPdfFile(file: File): boolean {
  const byType = file.type === 'application/pdf';
  const byName = file.name.toLowerCase().endsWith('.pdf');
  return byType || byName;
}

export const certificateValidation = {
  async validateFileForCertificateUpload(file: File): Promise<void> {
    if (!file) throw new Error('No file selected.');
    if (!isPdfFile(file)) throw new Error('Only PDF files are allowed for certificates.');

    const maxSizeBytes = getStorageCertificateMaxSizeBytes();
    if (file.size > maxSizeBytes) {
      throw new Error(`Certificate file is too large. Max size is ${maxSizeBytes} bytes.`);
    }
  },

  async validatePermissionForCertificateUpload(params: {
    studentId: string;
    applicationId: string;
  }): Promise<{ eventId?: string | null; eventType?: string | null }> {
    const app = await certificateRepository.getApplicationForCertificate(params.applicationId);
    if (!app) throw new Error('Application not found.');

    const ownerId = app.student_id != null ? String(app.student_id) : null;
    if (!ownerId || ownerId !== params.studentId) {
      throw new Error('You are not allowed to upload a certificate for this application.');
    }

    const eventType = app.event_type != null ? String(app.event_type) : null;
    return {
      eventId: app.event_id != null ? String(app.event_id) : null,
      eventType,
    };
  },

  validateDeadline(deadlineIso: string): void {
    if (!deadlineIso) throw new Error('Missing certificate deadline.');
    const d = new Date(deadlineIso);
    if (isNaN(d.getTime())) throw new Error('Invalid certificate deadline.');
  },
};

