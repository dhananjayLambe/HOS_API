"use client";

import { CompletionKpiStrip } from "@/components/labs/reports/completion/CompletionKpiStrip";
import { NeedsAttentionSection } from "@/components/labs/reports/completion/NeedsAttentionSection";
import { OrderUploadDrawer } from "@/components/labs/reports/completion/OrderUploadDrawer";
import { PatientOrderGroup } from "@/components/labs/reports/completion/PatientOrderGroup";
import { QuickPreviewPanel, type QuickPreviewTarget } from "@/components/labs/reports/completion/QuickPreviewPanel";
import { ReportsActiveFilterChips } from "@/components/labs/reports/completion/ReportsActiveFilterChips";
import { ReportsOperationalFilterBar } from "@/components/labs/reports/completion/ReportsOperationalFilterBar";
import { SendAvailableReportsDialog } from "@/components/labs/reports/completion/SendAvailableReportsDialog";
import { ReportsAssignmentLiveCard } from "@/components/labs/reports/ReportsAssignmentLiveCard";
import { ReportsDataSourceToggle } from "@/components/labs/reports/ReportsDataSourceToggle";
import { ReportsDemoChip } from "@/components/labs/reports/ReportsDemoBanner";
import { isReportsDataSourceToggleVisible } from "@/lib/labs/reports/report-tasks-config";
import { ReportsStaleQueueBanner } from "@/components/labs/reports/ReportsStaleQueueBanner";
import { Button } from "@/components/ui/button";
import {
  useReportsCompletionActions,
  type ReportsCompletionDrawerHandlers,
} from "@/hooks/labs/useReportsCompletionActions";
import { buildOrderLifecycleFromTaskContext } from "@/lib/labs/reports/completion/report-lifecycle-adapter";
import { mapReportApiErrorToMessage } from "@/lib/labs/reports/api/report-api-errors";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useReportsOperationalQueue } from "@/hooks/labs/useReportsOperationalQueue";
import { useReportDetail } from "@/hooks/labs/useReportDetail";
import { useReportTaskContext } from "@/hooks/labs/useReportTaskContext";
import {
  buildQuickPreviewTarget,
  buildQuickPreviewTargetFromOrder,
} from "@/lib/labs/reports/build-quick-preview-target";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import type { CompletionFilterKey } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { uploadPathForReupload } from "@/lib/labs/reports/upload/upload-route";
import { isReportsReuploadDrawerEnabled } from "@/lib/labs/reports/report-tasks-config";
import { RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReportTask } from "@/lib/labs/reports/report-task";

export function ReportsCompletionPage() {
  const router = useRouter();
  const { data: session } = useLabSession();
  const branchId = session?.branch?.id ?? null;
  const branchLabel = session?.branch?.branch_name ?? "";
  const searchParams = useSearchParams();

  const queueReturnUrl = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `/lab-dashboard/reports?${qs}` : "/lab-dashboard/reports";
  }, [searchParams]);

  const queue = useReportsOperationalQueue(branchLabel);
  const { buildLiveCardActions, mutations } = useReportsCompletionActions(branchId);
  const toast = useToastNotification();

  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [uploadReportId, setUploadReportId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"upload" | "reupload">("upload");
  const [sendTaskId, setSendTaskId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<{ taskId: string; reportId: string } | null>(null);

  const setActionLoading = queue.setActionLoadingTaskId;
  const isLive = queue.isLive;

  const openUploadDrawer = useCallback(
    (task: ReportTask, options?: { reportId?: string; mode?: "upload" | "reupload" }) => {
      setUploadMode(options?.mode ?? "upload");
      setUploadTaskId(task.taskId);
      setUploadReportId(
        options?.reportId ??
          (options?.mode === "reupload"
            ? task.actionTargets.correctReportId
            : undefined) ??
          task.actionTargets.uploadReportId ??
          task.actionTargets.markReadyReportId ??
          task.actionTargets.correctReportId ??
          null,
      );
    },
    [],
  );

  const navigateToReupload = useCallback(
    (task: ReportTask, reportId: string) => {
      router.push(
        uploadPathForReupload(task.taskId, reportId, {
          returnUrl: queueReturnUrl,
          demo: searchParams.get("demo"),
        }),
      );
    },
    [router, queueReturnUrl, searchParams],
  );

  const drawerHandlers = useMemo<ReportsCompletionDrawerHandlers>(
    () => ({ openUploadDrawer, navigateToReupload }),
    [openUploadDrawer, navigateToReupload],
  );

  const liveCardActions = useMemo(
    () => buildLiveCardActions(setActionLoading, drawerHandlers),
    [buildLiveCardActions, setActionLoading, drawerHandlers],
  );

  const previewContextQuery = useReportTaskContext(
    branchId,
    previewTarget?.taskId ?? null,
    queue.isLive && previewTarget != null,
  );
  const previewDetailReportId = useMemo(() => {
    if (!previewTarget) return null;
    if (!queue.isLive || !previewContextQuery.data) return previewTarget.reportId;
    const exact = previewContextQuery.data.activeReports.find(
      (report) => report.reportId === previewTarget.reportId,
    );
    if (exact) return exact.reportId;
    return previewContextQuery.data.activeReports[0]?.reportId ?? null;
  }, [previewTarget, queue.isLive, previewContextQuery.data]);
  const previewDetailQuery = useReportDetail(
    branchId,
    previewDetailReportId,
    queue.isLive && previewTarget != null,
  );

  const refetchQueueRef = useRef(queue.refetch);
  refetchQueueRef.current = queue.refetch;

  const headerActions = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => refetchQueueRef.current()}
        disabled={queue.loading || queue.refreshing}
        aria-label="Refresh report queue"
      >
        <RotateCcw className={`h-4 w-4 ${queue.refreshing ? "animate-spin" : ""}`} aria-hidden />
        Refresh
      </Button>
    ),
    [queue.loading, queue.refreshing],
  );

  useLabShellHeader({
    title: "Reports",
    description: "Upload and send diagnostic reports.",
    actions: headerActions,
  });

  const openOrderHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const openOrder = searchParams.get("openOrder");
    if (!openOrder || openOrderHandledRef.current === openOrder) return;
    openOrderHandledRef.current = openOrder;
    const task = queue.getTask(openOrder);
    if (task) {
      openUploadDrawer(task, { reportId: task.actionTargets.uploadReportId, mode: "upload" });
    } else {
      setUploadMode("upload");
      setUploadTaskId(openOrder);
    }
  }, [searchParams, queue.getTask, openUploadDrawer]);

  const uploadContextQuery = useReportTaskContext(
    branchId,
    uploadTaskId,
    Boolean(uploadTaskId && isLive),
  );

  const uploadReportDetailQuery = useReportDetail(
    branchId,
    uploadMode === "reupload" ? uploadReportId : null,
    Boolean(uploadTaskId && isLive && uploadMode === "reupload" && uploadReportId),
  );

  const uploadOrder = useMemo(() => {
    if (!uploadTaskId) return null;
    const task = queue.getTask(uploadTaskId);
    if (isLive && uploadContextQuery.data) {
      const detailsByReportId: Record<string, NonNullable<typeof uploadReportDetailQuery.data>> =
        {};
      if (uploadReportId && uploadReportDetailQuery.data) {
        detailsByReportId[uploadReportId] = uploadReportDetailQuery.data;
      }
      return buildOrderLifecycleFromTaskContext(uploadContextQuery.data, {
        urgency: task?.urgency,
        tatState: task?.tatBreached ? "breached" : "safe",
        tatLabel: task?.tatBreached ? "TAT breached" : "TAT on track",
        detailsByReportId,
      });
    }
    return queue.getOrder(uploadTaskId);
  }, [
    uploadTaskId,
    uploadReportId,
    uploadMode,
    isLive,
    uploadContextQuery.data,
    uploadReportDetailQuery.data,
    queue,
  ]);
  const sendOrder = sendTaskId ? queue.getOrder(sendTaskId) : null;

  const getOrder = queue.getOrder;
  const quickPreviewTarget = useMemo<QuickPreviewTarget | null>(() => {
    if (!previewTarget) return null;
    if (queue.isLive && previewContextQuery.data) {
      const target = buildQuickPreviewTarget(
        previewContextQuery.data,
        previewTarget.reportId,
        previewDetailQuery.data,
      );
      if (target) return target;
      // Keep mock/live preview UI behavior aligned: if context has reports, still open with first report.
      if (previewContextQuery.data.activeReports.length > 0) {
        return buildQuickPreviewTarget(
          previewContextQuery.data,
          previewContextQuery.data.activeReports[0]!.reportId,
          previewDetailQuery.data,
        );
      }
      return null;
    }
    const order = getOrder(previewTarget.taskId);
    if (!order) return null;
    return buildQuickPreviewTargetFromOrder(order, previewTarget.reportId);
  }, [
    previewTarget,
    queue.isLive,
    getOrder,
    previewContextQuery.data,
    previewDetailQuery.data,
  ]);

  const handleUpload = useCallback(
    (taskId: string, reportId?: string) => {
      const task = queue.getTask(taskId);
      if (task) {
        openUploadDrawer(task, { reportId, mode: "upload" });
        return;
      }
      setUploadMode("upload");
      setUploadTaskId(taskId);
      setUploadReportId(reportId ?? null);
    },
    [queue, openUploadDrawer],
  );

  const handleReupload = useCallback(
    (taskId: string, reportId: string) => {
      const task = queue.getTask(taskId);
      const targetReportId = task?.actionTargets.correctReportId ?? reportId;
      if (isReportsReuploadDrawerEnabled()) {
        if (task) {
          openUploadDrawer(task, { reportId: targetReportId, mode: "reupload" });
          return;
        }
        setUploadMode("reupload");
        setUploadTaskId(taskId);
        setUploadReportId(targetReportId);
        return;
      }
      // Same side drawer as upload (default). Full-page route is optional via env flag above.
      if (task) {
        openUploadDrawer(task, { reportId: targetReportId, mode: "reupload" });
        return;
      }
      setUploadMode("reupload");
      setUploadTaskId(taskId);
      setUploadReportId(targetReportId);
    },
    [queue, openUploadDrawer],
  );

  const handlePersistUpload = useCallback(
    async (input: {
      taskId: string;
      reportId: string;
      files: File[];
      mode: "upload" | "reupload";
      reuploadReason?: string;
      hasExistingArtifact?: boolean;
    }) => {
      const task = queue.getTask(input.taskId);
      const reportId = input.reportId;
      if (!reportId) {
        toast.error("No target report selected. Please re-open drawer and try again.");
        throw new Error("Missing selected report target.");
      }
      const pdfIndex = input.files.findIndex(
        (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
      );
      const primaryFileIndex = pdfIndex >= 0 ? pdfIndex : 0;
      const resolvedIntent =
        input.mode === "reupload" || input.hasExistingArtifact
          ? "REUPLOAD_REPLACE"
          : "UPLOAD_NEW";
      try {
        const uploadResult = await mutations.uploadReport({
          reportId,
          files: input.files,
          primaryFileIndex,
          uploadIntent: resolvedIntent,
          uploadRequestId: globalThis.crypto?.randomUUID?.() ?? undefined,
          notes:
            input.reuploadReason ??
            (resolvedIntent === "REUPLOAD_REPLACE" ? "Operator replacement upload" : undefined),
          taskId: input.taskId,
          assignmentId: task?.assignmentId,
        });

        const skipMarkReady =
          resolvedIntent === "REUPLOAD_REPLACE" &&
          (uploadResult.status === "READY_DELIVERY" ||
            uploadResult.status === "DELIVERED");

        // After new upload, transition to ready so Send/Re-upload CTAs appear.
        if (!skipMarkReady) {
          try {
            await mutations.markReady(reportId, {
              taskId: input.taskId,
              reportId,
              assignmentId: task?.assignmentId,
            });
          } catch (readyErr) {
            const conflict = await mutations.handleOperationalConflict(readyErr, {
              taskId: input.taskId,
              reportId,
              assignmentId: task?.assignmentId,
            });
            if (!conflict) {
              throw readyErr;
            }
          }
        }

        await queue.refetch();
        toast.success(input.mode === "reupload" ? "Updated report saved" : "Report files uploaded");
      } catch (err) {
        toast.error(mapReportApiErrorToMessage(err));
        throw err;
      }
    },
    [mutations, queue, toast],
  );

  const handlePreview = useCallback((taskId: string, reportId: string) => {
    setPreviewTarget({ taskId, reportId });
  }, []);

  const getTask = queue.getTask;
  const setFilter = queue.setFilter;

  const handleSendAvailable = useCallback(
    (taskId: string, reportIds?: string[]) => {
      const task = getTask(taskId);
      if (isLive && task) {
        if (reportIds?.length) {
          liveCardActions.onSend(task, reportIds);
          return;
        }
        setSendTaskId(taskId);
        return;
      }
      setSendTaskId(taskId);
    },
    [getTask, isLive, liveCardActions],
  );

  const handleSendSelected = useCallback(
    (reportIds: string[]) => {
      if (!sendTaskId) return;
      const task = getTask(sendTaskId);
      if (isLive && task) {
        liveCardActions.onSend(task, reportIds);
        setSendTaskId(null);
        return;
      }
      setSendTaskId(null);
    },
    [getTask, isLive, liveCardActions, sendTaskId],
  );

  const handleRetry = useCallback(
    (taskId: string) => {
      const task = getTask(taskId);
      if (isLive && task) {
        liveCardActions.onRetry(task);
      }
    },
    [getTask, isLive, liveCardActions],
  );

  const handleKpiSelect = useCallback(
    (key: CompletionFilterKey) => {
      queue.setWorkflowFilter(key);
    },
    [queue],
  );

  const showFilterEmpty =
    !queue.loading &&
    !queue.error &&
    queue.totalBeforeWorkflowTat > 0 &&
    queue.filteredCount === 0;

  const handleLivePreview = useCallback(
    (taskId: string, reportId: string) => {
      handlePreview(taskId, reportId);
    },
    [handlePreview],
  );

  const liveActionsWithPreview = useMemo(
    () => ({
      ...liveCardActions,
      onPreview: (task: ReportTask, reportId: string) => {
        handleLivePreview(task.taskId, reportId);
      },
    }),
    [liveCardActions, handleLivePreview],
  );

  useEffect(() => {
    setUploadTaskId(null);
    setUploadReportId(null);
    setSendTaskId(null);
    setPreviewTarget(null);
  }, [queue.isDemo]);

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-x-hidden pb-20">
      {queue.isDemo || isReportsDataSourceToggleVisible() ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ReportsDataSourceToggle />
          {queue.isDemo ? <ReportsDemoChip /> : null}
        </div>
      ) : null}
      {queue.isStaleQueue && !queue.isDemo ? <ReportsStaleQueueBanner visible /> : null}

      <ReportsOperationalFilterBar
        searchInput={queue.searchInput}
        onSearchChange={queue.setSearchInput}
        filterState={queue.filterState}
        onPatchFilters={queue.patchFilters}
        disabled={queue.loading}
      />

      <ReportsActiveFilterChips chips={queue.activeFilterChips} onClear={queue.clearActiveChip} />

      <CompletionKpiStrip
        kpis={queue.kpis}
        activeWorkflow={queue.filterState.workflow}
        onSelect={handleKpiSelect}
      />

      <NeedsAttentionSection items={queue.attentionItems} onJumpTo={queue.jumpToCard} />

      {queue.loading && queue.groups.length === 0 ? (
        <p className="rounded-lg border border-[#ECEBFF] bg-white px-3 py-8 text-center text-sm text-[#6B7280]">
          Loading reports…
        </p>
      ) : null}

      {queue.error && !queue.loading ? (
        <LabOrdersErrorState message={queue.error} onRetry={queue.refetch} retrying={queue.refreshing} />
      ) : null}

      <section
        aria-label={queue.filterState.workflow === "delivered" ? "Delivered orders" : "Orders"}
        className="space-y-1.5"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
          {queue.filterState.workflow === "delivered" ? "Delivered" : "Orders"}
        </h2>
        {showFilterEmpty ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-6 text-center text-sm text-amber-950">
            <p className="font-medium">No reports match current filters.</p>
            <p className="mt-1 text-amber-800">Try clearing workflow or TAT filters.</p>
          </div>
        ) : !queue.loading && queue.groups.length === 0 && !queue.error ? (
          <p className="rounded-lg border border-dashed border-[#E5E7EB] px-3 py-6 text-center text-sm text-[#6B7280]">
            No reports in queue for the selected date range.
          </p>
        ) : (
          queue.groups.map((group) => (
            <PatientOrderGroup
              key={group.patientKey}
              group={group}
              branchId={branchId}
              highlightedTaskId={queue.highlightedTaskId}
              actionLoadingTaskId={queue.actionLoadingTaskId}
              expanded={queue.expandedPatientKeys.has(group.patientKey)}
              onToggleExpanded={() => queue.togglePatientGroup(group.patientKey)}
              cardRefs={queue.cardRefs}
              getTask={queue.isLive ? queue.getTask : undefined}
              liveCardActions={queue.isLive ? liveActionsWithPreview : undefined}
              onUpload={handleUpload}
              onSendAvailable={handleSendAvailable}
              onRetry={handleRetry}
              onReupload={handleReupload}
              onPreview={handlePreview}
              onDismissToast={() => undefined}
            />
          ))
        )}
        {queue.groups.length > 0 && queue.hasMore ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={queue.loadMore}
              disabled={queue.loadingMore}
            >
              {queue.loadingMore ? "Loading more..." : "Load more"}
            </Button>
          </div>
        ) : null}
      </section>

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
        onPersistUpload={isLive ? handlePersistUpload : undefined}
        onUploadComplete={() => {
          void queue.refetch();
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
        loading={
          queue.isLive &&
          previewTarget != null &&
          (previewContextQuery.isPending || previewDetailQuery.isPending)
        }
        error={
          queue.isLive && previewTarget != null && previewDetailQuery.isError
            ? (previewDetailQuery.error instanceof Error
              ? previewDetailQuery.error.message
              : "Unable to load report preview.")
            : null
        }
        onRetry={() => {
          void previewContextQuery.refetch();
          void previewDetailQuery.refetch();
        }}
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
