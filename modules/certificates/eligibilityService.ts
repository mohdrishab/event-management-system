import { certificateRepository } from './certificateRepository';
import type { EligibilityResult } from './certificateTypes';
import { isCertificatesFeatureEnabled } from './certificateService';

export const eligibilityService = {
  async checkStudentEligibilityForNewEvent(params: {
    studentId: string;
  }): Promise<EligibilityResult> {
    // Feature flag off => do not block application submissions.
    if (!(await isCertificatesFeatureEnabled())) {
      return { eligible: true };
    }

    const previousRequiredApplicationIds =
      await certificateRepository.getPreviousCertificateRequiredApplicationIds({ studentId: params.studentId });

    if (previousRequiredApplicationIds.length === 0) {
      return { eligible: true };
    }

    const existingCertificateApplicationIds =
      await certificateRepository.getExistingCertificateApplicationIds({
        studentId: params.studentId,
        applicationIds: previousRequiredApplicationIds,
      });

    const existingSet = new Set(existingCertificateApplicationIds);
    const missing = previousRequiredApplicationIds.filter(id => !existingSet.has(id));

    if (missing.length > 0) {
      return {
        eligible: false,
        reason:
          'You must upload certificates for your previous approved application(s) before applying again.',
        blockingApplicationIds: missing,
      };
    }

    return { eligible: true };
  },
};

