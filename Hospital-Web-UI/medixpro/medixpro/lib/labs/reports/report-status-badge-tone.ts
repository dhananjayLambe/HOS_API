import { reportStatusBadgeClassName as badgeFromTokens } from "@/lib/labs/reports/queue-tokens";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";

/** High-contrast report status pills — delegates to queue-tokens. */
export function reportStatusBadgeClassName(status: ReportOperationalStatus): string {
  return badgeFromTokens(status);
}
