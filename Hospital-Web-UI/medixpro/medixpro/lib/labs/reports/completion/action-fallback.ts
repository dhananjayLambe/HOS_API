import type { ReportActionTargets } from "@/lib/labs/reports/api/v1/reports-api-mappers";

/** Phase 1: operators use Upload → Ready for delivery → Delivered (no separate Mark Ready step). */
export const PHASE1_HIDE_MARK_READY_UI = true;

const MARK_READY = "MARK_READY";

function normalizeActionToken(action: string): string {
  return action.trim().toUpperCase();
}

/**
 * Deterministic chip actions when API omits or partially provides `available_actions`.
 * Never returns an empty list when any report line exists.
 */
export function resolveChipAvailableActions(
  apiActions: string[] | undefined,
  targets: ReportActionTargets,
): string[] {
  const actions = new Set<string>();

  if (apiActions?.length) {
    for (const raw of apiActions) {
      const action = normalizeActionToken(raw);
      if (PHASE1_HIDE_MARK_READY_UI && action === MARK_READY) {
        if (targets.sendWhatsappReportId) actions.add("SEND_WHATSAPP");
        continue;
      }
      actions.add(action);
    }
  }

  if (actions.size === 0) {
    if (targets.uploadReportId) actions.add("UPLOAD_REPORT");
    if (targets.markReadyReportId) {
      if (PHASE1_HIDE_MARK_READY_UI) {
        if (targets.sendWhatsappReportId) actions.add("SEND_WHATSAPP");
      } else {
        actions.add(MARK_READY);
      }
    }
    if (targets.sendWhatsappReportId) actions.add("SEND_WHATSAPP");
    if (targets.retryDeliveryLogId) actions.add("RETRY_DELIVERY");
  }

  if (
    actions.has("SEND_WHATSAPP") ||
    actions.has("RETRY_DELIVERY") ||
    actions.has("UPLOAD_REPORT") ||
    actions.has("CORRECT_REPORT")
  ) {
    actions.add("VIEW_REPORT");
  }

  if (actions.size === 0) {
    actions.add("VIEW_REPORT");
  }

  return [...actions];
}
