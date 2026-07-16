import type { ClinicalReportStatus } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { clinicalStatusBadgeClasses } from "@/lib/design-system/clinical";

/** @deprecated Prefer ClinicalStatusBadge; kept for workspace imports. */
export function clinicalStatusBadgeClass(status: ClinicalReportStatus): string {
  return clinicalStatusBadgeClasses(status);
}
