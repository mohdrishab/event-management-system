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
    uid: string;
    eventId: string;
  }): Promise<void> {
    const existing = await certificateRepository.getCertificateByUidAndEvent(params.uid, params.eventId);
    if (existing && existing.verified) {
      throw new Error('A verified certificate already exists for this event.');
    }
  },

  validateDeadline(deadlineIso: string): void {
    void deadlineIso;
  },
};

