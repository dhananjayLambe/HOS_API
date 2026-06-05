import type {
  ReportArtifactType,
  ReportChipViewModel,
  ReportDeliveryState,
  ReportLifecycleStatus,
  TestWorkflowAction,
  TestWorkflowViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";

export const SENT_DELIVERY_STATES: ReportDeliveryState[] = ["sent", "delivered", "viewed"];

export function isFailedReport(report: ReportChipViewModel): boolean {
  return report.status === "failed" || report.status === "failed_delivery" || report.deliveryState === "failed";
}

export function isRejectedReport(report: ReportChipViewModel): boolean {
  return false;
}

export function isCorrectedPendingResend(report: ReportChipViewModel): boolean {
  return (report.status === "corrected" || Boolean(report.isReuploaded)) && !SENT_DELIVERY_STATES.includes(report.deliveryState);
}

export function isUpdatedReportPendingSend(report: ReportChipViewModel): boolean {
  return isCorrectedPendingResend(report);
}

export function isPendingUpload(report: ReportChipViewModel): boolean {
  return report.status === "pending" || report.status === "failed_upload" || report.status === "rejected";
}

export function isReadyToSend(report: ReportChipViewModel): boolean {
  return report.status === "ready" || isCorrectedPendingResend(report);
}

export function isReportSent(report: ReportChipViewModel): boolean {
  return report.status === "sent" || SENT_DELIVERY_STATES.includes(report.deliveryState);
}

/** Reports that already have an upload and may be replaced (ready, sent, corrected, etc.). */
export function isReuploadEligible(report: ReportChipViewModel): boolean {
  if (isReportSent(report) || report.artifacts.length > 0) return true;
  if (isReadyToSend(report) || report.status === "uploaded" || report.status === "corrected") {
    return true;
  }
  return (
    report.availableActions?.some((action) => {
      const key = action.trim().toUpperCase();
      return key === "CORRECT_REPORT" || key === "REUPLOAD_REPORT";
    }) ?? false
  );
}

export function reportStatusLabel(status: ReportLifecycleStatus, deliveryState?: ReportDeliveryState): string {
  if (deliveryState === "failed") return "Failed";
  switch (status) {
    case "pending":
      return "Pending";
    case "uploaded":
      return "Uploaded";
    case "ready":
      return "Ready";
    case "sent":
      return "Sent";
    case "failed":
    case "failed_upload":
    case "failed_delivery":
      return "Failed";
    case "rejected":
      return "Pending";
    case "corrected":
      return "Updated Report";
  }
}

export function inferArtifactType(fileName: string, mimeType: string): ReportArtifactType {
  const lower = fileName.toLowerCase();
  const type = mimeType.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".txt") || type.includes("csv")) {
    return "RAW_MACHINE_DATA";
  }
  if (lower.endsWith(".pdf") || type === "application/pdf" || type.startsWith("image/")) {
    return "PRIMARY_REPORT";
  }
  return "SUPPORTING_FILE";
}

const API_ACTION_TO_WORKFLOW: Record<string, TestWorkflowAction> = {
  CORRECT_REPORT: "REUPLOAD",
  REUPLOAD_REPORT: "REUPLOAD",
  VIEW_REPORT: "VIEW",
  DOWNLOAD_REPORT: "VIEW",
  SEND_WHATSAPP: "SEND",
  UPLOAD_REPORT: "UPLOAD",
  RETRY_DELIVERY: "RETRY",
};

/** Maps backend `available_actions` tokens to per-test workflow CTAs. */
export function workflowActionsFromApiActions(apiActions?: string[]): TestWorkflowAction[] {
  if (!apiActions?.length) return [];
  const seen = new Set<TestWorkflowAction>();
  const out: TestWorkflowAction[] = [];
  for (const raw of apiActions) {
    const action = API_ACTION_TO_WORKFLOW[raw.trim().toUpperCase()];
    if (action && !seen.has(action)) {
      seen.add(action);
      out.push(action);
    }
  }
  return out;
}

function mergeWorkflowActions(...groups: TestWorkflowAction[][]): TestWorkflowAction[] {
  const seen = new Set<TestWorkflowAction>();
  const out: TestWorkflowAction[] = [];
  for (const group of groups) {
    for (const action of group) {
      if (!seen.has(action)) {
        seen.add(action);
        out.push(action);
      }
    }
  }
  return out;
}

export function buildPendingWorkSummary(reports: ReportChipViewModel[]): string {
  const failed = reports.filter((r) => isFailedReport(r) || isRejectedReport(r)).length;
  if (failed > 0) return `${failed} report${failed === 1 ? "" : "s"} need attention`;

  const pending = reports.filter((r) => isPendingUpload(r)).length;
  if (pending > 0) return pending === 1 ? "1 report still pending" : `${pending} reports pending`;

  const corrected = reports.filter(isCorrectedPendingResend).length;
  if (corrected > 0) {
    return corrected === 1 ? "1 updated report needs sending" : `${corrected} updated reports need sending`;
  }

  const ready = reports.filter((r) => r.status === "ready").length;
  if (ready > 0) return ready === reports.length ? "All reports uploaded" : `${ready} reports ready to send`;

  return "All reports delivered";
}

export function buildTestWorkflow(report: ReportChipViewModel): TestWorkflowViewModel {
  const corrected = report.status === "corrected" || report.versions.some((version) => version.isCorrected);
  const isReuploaded = Boolean(report.isReuploaded);
  const failed = isFailedReport(report);
  const pending = isPendingUpload(report);
  const sent = isReportSent(report);
  const ready = isReadyToSend(report);

  const uploadState =
    failed ? "FAILED" : corrected ? "CORRECTED" : pending ? "PENDING" : "UPLOADED";
  const deliveryState =
    report.deliveryState === "failed" || report.status === "failed_delivery"
      ? "FAILED"
      : sent
        ? "SENT"
        : ready
          ? "READY"
          : "NOT_SENT";

  const statusBased: TestWorkflowAction[] = [];
  if (deliveryState === "FAILED") {
    statusBased.push("VIEW", "RETRY");
  } else if ((corrected || isReuploaded) && deliveryState !== "SENT") {
    statusBased.push("VIEW", "SEND");
  } else if (pending) {
    statusBased.push("UPLOAD");
  } else if (deliveryState === "READY") {
    statusBased.push("VIEW", "SEND");
  } else if (deliveryState === "SENT") {
    statusBased.push("VIEW", "REUPLOAD");
  }

  let availableActions = mergeWorkflowActions(
    statusBased,
    workflowActionsFromApiActions(report.availableActions),
  );

  if (deliveryState === "SENT" || sent) {
    availableActions = mergeWorkflowActions(availableActions, ["VIEW", "REUPLOAD"]);
  }

  return {
    reportId: report.reportId,
    testName: report.testLabel,
    uploadState,
    deliveryState,
    corrected,
    isReuploaded,
    lastUpdatedLabel: report.lastUpdatedLabel ?? report.lastUpdatedAtLabel,
    availableActions,
    artifacts: report.artifacts,
  };
}

export function buildTestWorkflows(reports: ReportChipViewModel[]): TestWorkflowViewModel[] {
  return reports.map(buildTestWorkflow);
}

export type TestWorkflowSummary = {
  pending: number;
  ready: number;
  delivered: number;
  corrected: number;
  failed: number;
};

export function summarizeTestWorkflows(workflows: TestWorkflowViewModel[]): TestWorkflowSummary {
  return workflows.reduce<TestWorkflowSummary>(
    (summary, workflow) => {
      const hasException = workflow.deliveryState === "FAILED";

      if (workflow.deliveryState === "FAILED") summary.failed += 1;
      if (workflow.corrected) summary.corrected += 1;
      if (!hasException) {
        if (workflow.deliveryState === "SENT") summary.delivered += 1;
        else if (workflow.deliveryState === "READY") summary.ready += 1;
        else if (workflow.uploadState === "PENDING") summary.pending += 1;
      }
      return summary;
    },
    {
      pending: 0,
      ready: 0,
      delivered: 0,
      corrected: 0,
      failed: 0,
    },
  );
}
