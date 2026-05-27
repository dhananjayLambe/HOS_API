import type {
  NextActionViewModel,
  OrderLifecycleViewModel,
  ReportChipViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  isCorrectedPendingResend,
  isFailedReport,
  isPendingUpload,
  isReadyToSend,
  isReportSent,
} from "@/lib/labs/reports/completion/operational-contract";

function firstPending(reports: ReportChipViewModel[]): ReportChipViewModel | undefined {
  return reports.find(isPendingUpload);
}

function readyReports(reports: ReportChipViewModel[]): ReportChipViewModel[] {
  return reports.filter(isReadyToSend);
}

function firstFailed(reports: ReportChipViewModel[]): ReportChipViewModel | undefined {
  return reports.find(isFailedReport);
}

export function buildNextAction(order: Pick<OrderLifecycleViewModel, "reports" | "deliveryFailure">): NextActionViewModel {
  const failed = firstFailed(order.reports);
  if (failed || order.deliveryFailure) {
    const label = order.deliveryFailure?.testLabel ?? failed?.testLabel ?? "report";
    return {
      line: `Retry ${label} delivery`,
      showSendAvailable: false,
      showUpload: false,
      retryReportId: order.deliveryFailure?.reportId ?? failed?.reportId,
      readyReportIds: [],
    };
  }

  const updated = order.reports.find(isCorrectedPendingResend);
  if (updated) {
    return {
      line: `Resend updated ${updated.testLabel} Report`,
      showUpload: false,
      showSendAvailable: true,
      sendLabel: updated.testLabel,
      updatedReportId: updated.reportId,
      readyReportIds: [updated.reportId],
    };
  }

  const pending = firstPending(order.reports);
  if (pending) {
    const ready = readyReports(order.reports);
    return {
      line: `Upload ${pending.testLabel} Report`,
      uploadReportId: pending.reportId,
      uploadLabel: pending.testLabel,
      showUpload: true,
      showSendAvailable: ready.length > 0,
      sendLabel: ready.length === 1 ? ready[0]!.testLabel : undefined,
      readyReportIds: ready.map((r) => r.reportId),
    };
  }

  const ready = readyReports(order.reports);
  if (ready.length > 0) {
    const first = ready[0]!;
    return {
      line: `Send ${first.testLabel} Report`,
      showUpload: false,
      showSendAvailable: true,
      sendLabel: ready.length === 1 ? first.testLabel : undefined,
      readyReportIds: ready.map((r) => r.reportId),
    };
  }

  return {
    line: "All reports sent",
    showUpload: false,
    showSendAvailable: false,
    readyReportIds: [],
  };
}

export function recomputeOrderDerived(order: OrderLifecycleViewModel): OrderLifecycleViewModel {
  const readyToSendCount = order.reports.filter(isReadyToSend).length;
  const hasPendingUpload = order.reports.some(isPendingUpload);
  const allSent = order.reports.length > 0 && order.reports.every(isReportSent);
  const isFullyComplete = allSent;
  const nextAction = buildNextAction(order);

  return {
    ...order,
    readyToSendCount,
    hasPendingUpload,
    isFullyComplete,
    nextAction,
  };
}
