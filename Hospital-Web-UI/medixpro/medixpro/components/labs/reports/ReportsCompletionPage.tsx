"use client";

import { CompletionKpiStrip } from "@/components/labs/reports/completion/CompletionKpiStrip";
import { NeedsAttentionSection } from "@/components/labs/reports/completion/NeedsAttentionSection";
import { OrderCompletionCard } from "@/components/labs/reports/completion/OrderCompletionCard";
import { OrderUploadDrawer } from "@/components/labs/reports/completion/OrderUploadDrawer";
import { PatientOrderGroup } from "@/components/labs/reports/completion/PatientOrderGroup";
import { QuickPreviewPanel, type QuickPreviewTarget } from "@/components/labs/reports/completion/QuickPreviewPanel";
import { ReportsStickySearch } from "@/components/labs/reports/completion/ReportsStickySearch";
import { SendAvailableReportsDialog } from "@/components/labs/reports/completion/SendAvailableReportsDialog";
import { TinyFilterChips } from "@/components/labs/reports/completion/TinyFilterChips";
import { useOrderCompletionQueue } from "@/hooks/labs/useOrderCompletionQueue";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import type { CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { buildTestWorkflow } from "@/lib/labs/reports/completion/operational-contract";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function ReportsCompletionPage() {
  const queue = useOrderCompletionQueue();
  const searchParams = useSearchParams();

  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [uploadReportId, setUploadReportId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"upload" | "reupload">("upload");
  const [sendTaskId, setSendTaskId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ taskId: string; reportId: string } | null>(null);

  useLabShellHeader({
    title: "Reports",
    description: "Upload and send diagnostic reports.",
  });

  useEffect(() => {
    const openOrder = searchParams.get("openOrder");
    if (openOrder) setUploadTaskId(openOrder);
  }, [searchParams]);

  const uploadOrder = uploadTaskId ? queue.getOrder(uploadTaskId) : null;
  const sendOrder = sendTaskId ? queue.getOrder(sendTaskId) : null;
  const quickPreviewTarget = useMemo<QuickPreviewTarget | null>(() => {
    if (!previewTarget) return null;
    const order = queue.getOrder(previewTarget.taskId);
    const report = order?.reports.find((item) => item.reportId === previewTarget.reportId);
    if (!order || !report) return null;
    const workflow = buildTestWorkflow(report);
    return {
      taskId: order.taskId,
      reportId: report.reportId,
      patientName: order.patientName,
      orderNumber: order.orderNumber,
      testName: workflow.testName,
      deliveryState: workflow.deliveryState,
      corrected: workflow.corrected,
      isReuploaded: workflow.isReuploaded,
      artifacts: workflow.artifacts,
      canSend: workflow.availableActions.includes("SEND"),
      canReupload: workflow.availableActions.includes("REUPLOAD"),
    };
  }, [previewTarget, queue]);
  const handleUpload = useCallback((taskId: string, reportId?: string) => {
    setUploadMode("upload");
    setUploadTaskId(taskId);
    setUploadReportId(reportId ?? null);
  }, []);

  const handleReupload = useCallback((taskId: string, reportId: string) => {
    setUploadMode("reupload");
    setUploadTaskId(taskId);
    setUploadReportId(reportId);
  }, []);

  const handlePreview = useCallback((taskId: string, reportId: string) => {
    setPreviewTarget({ taskId, reportId });
  }, []);

  const handleSendAvailable = useCallback(
    (taskId: string, reportIds?: string[]) => {
      if (reportIds?.length === 1) {
        const report = queue.getOrder(taskId)?.reports.find((r) => r.reportId === reportIds[0]);
        const label = report?.testLabel ?? "Report";
        queue.setActionLoadingTaskId(taskId);
        queue.markReportsSent(taskId, reportIds);
        queue.showInCardToast(taskId, `${label} report sent`);
        window.setTimeout(() => queue.setActionLoadingTaskId(null), 300);
        return;
      }
      setSendTaskId(taskId);
    },
    [queue],
  );

  const handleSendSelected = useCallback(
    (reportIds: string[]) => {
      if (!sendTaskId) return;
      queue.setActionLoadingTaskId(sendTaskId);
      queue.markReportsSent(sendTaskId, reportIds);
      queue.showInCardToast(sendTaskId, `${reportIds.length} report(s) sent`);
      window.setTimeout(() => queue.setActionLoadingTaskId(null), 300);
    },
    [queue, sendTaskId],
  );

  const handleRetry = useCallback(
    (taskId: string) => {
      queue.setActionLoadingTaskId(taskId);
      queue.clearDeliveryFailure(taskId);
      queue.showInCardToast(taskId, "Retry queued");
      window.setTimeout(() => queue.setActionLoadingTaskId(null), 300);
    },
    [queue],
  );

  const handleKpiSelect = useCallback(
    (key: CompletionFilterKey) => {
      queue.setFilter(key === "all" ? "all" : key);
    },
    [queue],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-x-hidden pb-20">
      <div className="flex items-center justify-end gap-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
          Preview · mock data
        </span>
      </div>

      <ReportsStickySearch value={queue.searchInput} onChange={queue.setSearchInput} />

      <CompletionKpiStrip kpis={queue.kpis} onSelect={handleKpiSelect} />

      <NeedsAttentionSection items={queue.attentionItems} onJumpTo={queue.jumpToCard} />

      <TinyFilterChips active={queue.filter} onChange={queue.setFilter} />

      <section aria-label={queue.filter === "delivered" ? "Delivered orders" : "Active orders"} className="space-y-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
          {queue.filter === "delivered" ? "Delivered" : "Active orders"}
        </h2>
        {queue.groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#E5E7EB] px-3 py-6 text-center text-sm text-[#6B7280]">
            No orders match your search or filter.
          </p>
        ) : (
          queue.groups.map((group) => (
            <PatientOrderGroup
              key={group.patientKey}
              group={group}
              highlightedTaskId={queue.highlightedTaskId}
              actionLoadingTaskId={queue.actionLoadingTaskId}
              expanded={queue.expandedPatientKeys.has(group.patientKey)}
              onToggleExpanded={() => queue.togglePatientGroup(group.patientKey)}
              cardRefs={queue.cardRefs}
              onUpload={handleUpload}
              onSendAvailable={handleSendAvailable}
              onRetry={handleRetry}
              onReupload={handleReupload}
              onPreview={handlePreview}
              onDismissToast={queue.dismissToast}
            />
          ))
        )}
      </section>

      {queue.filter !== "delivered" && queue.completedToday.length > 0 ? (
        <section aria-label="Completed today" className="space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Completed today</h2>
          {queue.completedToday.map((order) => (
            <OrderCompletionCard
              key={order.taskId}
              order={order}
              onUpload={() => undefined}
              onSendAvailable={() => undefined}
              onReupload={(reportId) => handleReupload(order.taskId, reportId)}
              onPreview={(reportId) => handlePreview(order.taskId, reportId)}
              onDismissToast={() => undefined}
            />
          ))}
        </section>
      ) : null}

      <OrderUploadDrawer
        open={uploadTaskId != null}
        order={uploadOrder}
        mode={uploadMode}
        onOpenChange={(open) => {
          if (!open) setUploadTaskId(null);
          if (!open) setUploadReportId(null);
          if (!open) setUploadMode("upload");
        }}
        initialReportId={uploadReportId}
        onUploadComplete={(taskId, reportId, _testLabel, artifacts, options) => {
          if (options?.mode === "reupload") {
            queue.reuploadReport(taskId, reportId, artifacts, {
              reason: options.reuploadReason ?? "Report re-uploaded",
            });
            return;
          }
          queue.markReportUploaded(taskId, reportId, artifacts);
        }}
        onPreviewCurrent={handlePreview}
      />

      <SendAvailableReportsDialog
        open={sendTaskId != null}
        order={sendOrder}
        onOpenChange={(open) => {
          if (!open) setSendTaskId(null);
        }}
        onSend={handleSendSelected}
      />

      <QuickPreviewPanel
        open={previewTarget != null}
        target={quickPreviewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
        onSend={handleSendAvailable}
        onReupload={(taskId, reportId) => {
          setPreviewTarget(null);
          handleReupload(taskId, reportId);
        }}
      />

    </div>
  );
}
