"use client";

import { DeliveryFailureDialog } from "@/components/labs/reports/completion/DeliveryFailureDialog";
import { InCardSuccessToast } from "@/components/labs/reports/completion/InCardSuccessToast";
import { TatUrgencyIndicator } from "@/components/labs/reports/completion/TatUrgencyIndicator";
import { TestWorkflowRow } from "@/components/labs/reports/completion/TestWorkflowRow";
import type {
  OrderLifecycleViewModel,
  ReportArtifactViewModel,
  TestWorkflowAction,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  buildTestWorkflows,
  isFailedReport,
  isPendingUpload,
  isReadyToSend,
  isReportSent,
  isUpdatedReportPendingSend,
  summarizeTestWorkflows,
} from "@/lib/labs/reports/completion/operational-contract";
import { cn } from "@/lib/utils";
import { forwardRef, useMemo, useState } from "react";

export type OrderCompletionCardProps = {
  order: OrderLifecycleViewModel;
  branchId?: string | null;
  highlighted?: boolean;
  actionLoading?: boolean;
  hidePatientName?: boolean;
  onUpload: (reportId?: string) => void;
  onSendAvailable: (reportIds?: string[]) => void;
  onRetry?: () => void;
  onReupload?: (reportId: string) => void;
  onPreview?: (reportId: string) => void;
  onDismissToast: () => void;
};

function preferredArtifact(artifacts: ReportArtifactViewModel[]): ReportArtifactViewModel | null {
  return artifacts.find((artifact) => artifact.patientVisible) ?? artifacts[0] ?? null;
}

function downloadArtifact(artifact: ReportArtifactViewModel | null): boolean {
  if (!artifact) return false;
  const href = artifact.downloadUrl ?? artifact.previewUrl;
  if (href) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = artifact.fileName;
    anchor.rel = "noopener noreferrer";
    anchor.click();
    return true;
  }
  if (artifact.previewFile) {
    const url = URL.createObjectURL(artifact.previewFile);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = artifact.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  }
  return false;
}

export const OrderCompletionCard = forwardRef<HTMLElement, OrderCompletionCardProps>(
  function OrderCompletionCard(
    {
      order,
      branchId = null,
      highlighted,
      actionLoading,
      hidePatientName,
      onUpload,
      onSendAvailable,
      onRetry,
      onReupload,
      onPreview,
      onDismissToast,
    },
    ref,
  ) {
    const [failureDialogOpen, setFailureDialogOpen] = useState(false);
    const [localNotice, setLocalNotice] = useState<string | null>(null);
    const workflows = useMemo(
      () => order.testWorkflows ?? buildTestWorkflows(order.reports),
      [order.reports, order.testWorkflows],
    );
    const workflowSummary = useMemo(() => summarizeTestWorkflows(workflows), [workflows]);
    const hasFailure = Boolean(order.deliveryFailure) || order.reports.some(isFailedReport);
    const hasPending = order.reports.some(isPendingUpload);
    const hasReady = order.reports.some(isReadyToSend);
    const hasUpdated = order.reports.some(isUpdatedReportPendingSend);
    const hasSent = order.reports.some(isReportSent);
    const backendState = order.orderWorkflowState;
    const orderState = backendState === "attention_required"
      ? { label: "Attention Required", className: "border-red-200 bg-red-50 text-red-800", strip: "bg-red-500" }
      : backendState === "delivered"
        ? { label: "Delivered", className: "border-emerald-200 bg-emerald-50 text-emerald-800", strip: "bg-emerald-500" }
        : backendState === "ready_to_send"
          ? { label: "Ready To Send", className: "border-blue-200 bg-blue-50 text-blue-800", strip: "bg-blue-500" }
          : backendState === "partial_upload"
            ? { label: "Partial Upload", className: "border-violet-200 bg-violet-50 text-violet-800", strip: "bg-violet-500" }
            : backendState === "pending_upload"
              ? { label: "Pending Upload", className: "border-amber-200 bg-amber-50 text-amber-800", strip: "bg-amber-500" }
              : hasFailure
      ? { label: "Attention", className: "border-red-200 bg-red-50 text-red-800", strip: "bg-red-500" }
      : order.isFullyComplete
        ? { label: "Completed", className: "border-emerald-200 bg-emerald-50 text-emerald-800", strip: "bg-emerald-500" }
        : hasUpdated
          ? { label: "Updated", className: "border-violet-200 bg-violet-50 text-violet-800", strip: "bg-violet-500" }
          : hasPending && hasSent
            ? { label: "Partially Sent", className: "border-emerald-200 bg-emerald-50 text-emerald-800", strip: "bg-emerald-500" }
            : hasReady
              ? { label: "Ready To Send", className: "border-blue-200 bg-blue-50 text-blue-800", strip: "bg-blue-500" }
              : { label: "Awaiting Reports", className: "border-amber-200 bg-amber-50 text-amber-800", strip: "bg-amber-500" };
    const progressText =
      typeof order.uploadedRequiredReports === "number" &&
      typeof order.requiredReports === "number" &&
      order.requiredReports > 0
        ? `${order.uploadedRequiredReports}/${order.requiredReports} required uploaded`
        : null;
    const summaryChips = [
      ["Pending", workflowSummary.pending],
      ["Ready", workflowSummary.ready],
      ["Delivered", workflowSummary.delivered],
      ["Updated", workflowSummary.corrected],
      ["Failed", workflowSummary.failed],
    ].filter(([, count]) => Number(count) > 0);

    const handleWorkflowAction = (reportId: string, action: TestWorkflowAction) => {
      switch (action) {
        case "UPLOAD":
          onUpload(reportId);
          break;
        case "SEND":
          onSendAvailable([reportId]);
          break;
        case "REUPLOAD":
          onReupload?.(reportId);
          break;
        case "RETRY":
          onRetry?.();
          break;
        case "VIEW":
          onPreview?.(reportId);
          break;
        case "DOWNLOAD": {
          const workflow = workflows.find((item) => item.reportId === reportId);
          const downloaded = downloadArtifact(preferredArtifact(workflow?.artifacts ?? []));
          if (!downloaded) setLocalNotice("Download will be available when the report file URL is available.");
          break;
        }
      }
    };

    return (
      <article
        ref={ref}
        id={`order-card-${order.taskId}`}
        className={cn(
          "relative overflow-hidden rounded-xl border border-[#DDE3F0] bg-white px-3 py-2.5 shadow-sm",
          hasFailure && "border-red-200 bg-red-50/30",
          highlighted && "ring-2 ring-[#7C5CFC] ring-offset-1",
        )}
      >
        <div className={cn("absolute inset-y-0 left-0 w-1.5", orderState.strip)} aria-hidden />
        <div className="flex min-w-0 items-start justify-between gap-3 pl-1.5">
          <div className="min-w-0">
            <p className="min-w-0 truncate text-[15px] font-extrabold text-[#111827]">
              {hidePatientName ? `#${order.orderNumber}` : `#${order.orderNumber}`}
            </p>
            {!hidePatientName ? (
              <p className="truncate text-xs font-semibold text-[#374151]">{order.patientName}</p>
            ) : null}
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <TatUrgencyIndicator tatState={order.tatState} tatLabel={order.tatLabel} className="text-[11px]" />
            </div>
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", orderState.className)}>
            {orderState.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pl-1.5 text-[11px] font-medium text-[#4B5563]">
          <span>{workflows.length} test{workflows.length === 1 ? "" : "s"}</span>
          {progressText ? <span>· {progressText}</span> : null}
        </div>
        {order.orderWorkflowReason?.message ? (
          <p className="mt-1 pl-1.5 text-[11px] text-[#6B7280]">{order.orderWorkflowReason.message}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-1 pl-1.5">
          {summaryChips.length > 0 ? (
            summaryChips.map(([label, count]) => (
              <span
                key={label}
                className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#374151]"
              >
                {count} {label}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              All Delivered
            </span>
          )}
        </div>

        {order.inCardToast || localNotice ? (
          <div className="mt-1 pl-1.5">
            <InCardSuccessToast
              message={order.inCardToast ?? localNotice ?? ""}
              onDismiss={() => {
                setLocalNotice(null);
                onDismissToast();
              }}
            />
          </div>
        ) : null}

        <div className="mt-2 space-y-2 pl-1.5">
          {workflows.map((workflow) => (
            <TestWorkflowRow
              key={workflow.reportId}
              branchId={branchId}
              workflow={workflow}
              loading={actionLoading}
              onAction={handleWorkflowAction}
            />
          ))}
        </div>

        {order.isFullyComplete ? (
          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Completed reports remain available for preview and re-upload.
          </div>
        ) : null}
        {order.deliveryFailure ? (
          <DeliveryFailureDialog
            open={failureDialogOpen}
            failure={order.deliveryFailure}
            retrying={actionLoading}
            onOpenChange={setFailureDialogOpen}
            onRetry={onRetry}
          />
        ) : null}
      </article>
    );
  },
);
