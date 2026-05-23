"use client";

import { OrderDetailSheet } from "@/components/labs/orders/OrderDetailSheet";
import { ReportsFiltersRow } from "@/components/labs/reports/ReportsFiltersRow";
import { ReportsDemoChip } from "@/components/labs/reports/ReportsDemoBanner";
import { ReportsKpiStrip } from "@/components/labs/reports/ReportsKpiStrip";
import { ReportsKpiStripSkeleton } from "@/components/labs/reports/ReportsKpiStripSkeleton";
import { ReportsWorkflowQueue } from "@/components/labs/reports/ReportsWorkflowQueue";
import { Button } from "@/components/ui/button";
import { useLabReportsList } from "@/hooks/labs/useLabReportsList";
import { useReportMutations } from "@/hooks/labs/useReportMutations";
import { useReportOrderDrawer } from "@/hooks/labs/useReportOrderDrawer";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { mapReportApiErrorToMessage } from "@/lib/labs/reports/api/report-api-errors";
import { isReportTasksV1ApiEnabled } from "@/lib/labs/reports/report-tasks-config";
import type { ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { ReportsStaleQueueBanner } from "@/components/labs/reports/ReportsStaleQueueBanner";
import type { ReportTasksQueryFilters } from "@/lib/labs/reports/build-report-tasks-query";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export function ReportsListPage() {
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";
  const toast = useToastNotification();

  const {
    isDemoFallback,
    isDemoForced,
    tasks,
    filteredTasks,
    groups,
    kpis,
    tab,
    setTab,
    searchInput,
    setSearchInput,
    filters,
    setFilters,
    loading,
    refreshing,
    error,
    refetch,
    syncQueueToUrl,
    getOrderForTask,
    totalTaskCount,
    isQueryError,
    isStaleQueue,
  } = useLabReportsList(branchLabel);

  const mutations = useReportMutations(session?.branch?.id);
  const v1Enabled = isReportTasksV1ApiEnabled();

  const handleTabSelect = useCallback(
    (next: ReportTabKey) => {
      setTab(next);
      syncQueueToUrl({ tab: next });
    },
    [setTab, syncQueueToUrl],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
    },
    [setSearchInput],
  );

  const handleFiltersChange = useCallback(
    (next: ReportTasksQueryFilters) => {
      setFilters(next);
      syncQueueToUrl({ filters: next });
    },
    [setFilters, syncQueueToUrl],
  );

  const handleToggleUrgent = useCallback(() => {
    const next = { ...filters, urgentOnly: !filters.urgentOnly };
    setFilters(next);
    syncQueueToUrl({ filters: next });
  }, [filters, setFilters, syncQueueToUrl]);

  const handleToggleTat = useCallback(() => {
    const next = { ...filters, tatOnly: !filters.tatOnly };
    setFilters(next);
    syncQueueToUrl({ filters: next });
  }, [filters, setFilters, syncQueueToUrl]);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ReportTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshingLineage, setRefreshingLineage] = useState(false);

  const drawerPanel = useReportOrderDrawer({
    branchId: session?.branch?.id,
    branchLabel,
    task: selectedTask,
    open: sheetOpen && !!selectedTask,
  });

  const drawerOrder = drawerPanel?.order ?? null;

  const headerActions = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => refetch()}
        disabled={loading || refreshing}
        aria-label="Refresh report queue"
      >
        <RotateCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
        Refresh
      </Button>
    ),
    [loading, refreshing, refetch],
  );

  useLabShellHeader({
    title: "Reports",
    description: "Track and deliver diagnostic reports.",
    actions: headerActions,
  });

  const runAction = useCallback(
    async (
      task: ReportTask,
      key: string,
      fn: () => Promise<void>,
      successMsg: string,
    ) => {
      setActionLoading(`${task.taskId}:${key}`);
      try {
        await fn();
        toast.success(successMsg);
      } catch (err) {
        const conflict = await mutations.handleOperationalConflict(err, {
          taskId: task.taskId,
          assignmentId: task.assignmentId,
          reportId:
            task.actionTargets.markReadyReportId ??
            task.actionTargets.uploadReportId ??
            task.actionTargets.sendWhatsappReportId,
          onConflict: () => drawerPanel?.setLineageStale(true),
        });
        if (conflict) drawerPanel?.setLineageStale(true);
        toast.error(mapReportApiErrorToMessage(err));
      } finally {
        setActionLoading(null);
      }
    },
    [mutations, toast, drawerPanel],
  );

  const handlePrimaryAction = useCallback(
    (task: ReportTask, actionKey: string) => {
      const targets = task.actionTargets;
      switch (actionKey) {
        case "ready": {
          const reportId = targets.markReadyReportId;
          if (!reportId) {
            toast.error("Action no longer available — refresh the queue.");
            return;
          }
          void runAction(
            task,
            "ready",
            () =>
              mutations.markReady(reportId, {
                taskId: task.taskId,
                reportId,
                assignmentId: task.assignmentId,
              }),
            "Marked ready for delivery",
          );
          break;
        }
        case "wa":
        case "resend": {
          const reportId = targets.sendWhatsappReportId;
          if (!reportId) {
            toast.error("Action no longer available — refresh the queue.");
            return;
          }
          void runAction(
            task,
            actionKey,
            () => mutations.sendWhatsAppMock(task.taskId, reportId),
            actionKey === "wa" ? "WhatsApp delivery queued" : "Report resent",
          );
          break;
        }
        case "retry": {
          const logId = targets.retryDeliveryLogId;
          if (!logId) {
            toast.error("Action no longer available — refresh the queue.");
            return;
          }
          void runAction(
            task,
            "retry",
            () =>
              mutations.retryDelivery(logId, {
                taskId: task.taskId,
                assignmentId: task.assignmentId,
                reportId: targets.sendWhatsappReportId ?? targets.markReadyReportId,
              }),
            "Delivery retry queued",
          );
          break;
        }
        default:
          break;
      }
    },
    [runAction, mutations, toast],
  );

  const handlePreview = (task: ReportTask) => {
    const reportId =
      task.actionTargets.markReadyReportId ??
      task.actionTargets.uploadReportId ??
      task.actionTargets.sendWhatsappReportId;
    if (reportId && v1Enabled) {
      window.open(`/lab-dashboard/reports/upload?taskId=${encodeURIComponent(task.taskId)}`, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(`/lab-dashboard/reports?preview=${encodeURIComponent(task.taskId)}`, "_blank", "noopener,noreferrer");
  };

  const handleViewOrder = (task: ReportTask) => {
    const orderRow = getOrderForTask(task.taskId);
    setSelectedTask(orderRow ? { ...task, orderRow } : task);
    setSheetOpen(true);
  };

  const handleRefreshLineage = useCallback(async () => {
    if (!drawerPanel) return;
    setRefreshingLineage(true);
    drawerPanel.setLineageStale(false);
    try {
      await mutations.refreshDrawerReports({
        taskId: drawerPanel.task.taskId,
        reportId: drawerPanel.primaryReportId ?? undefined,
        assignmentId: drawerPanel.task.assignmentId,
      });
    } finally {
      setRefreshingLineage(false);
    }
  }, [drawerPanel, mutations]);

  const handleDrawerMarkReady = useCallback(
    (reportId: string) => {
      if (!selectedTask) return;
      void runAction(
        selectedTask,
        "ready",
        () =>
          mutations.markReady(reportId, {
            taskId: selectedTask.taskId,
            reportId,
            assignmentId: selectedTask.assignmentId,
          }),
        "Marked ready for delivery",
      );
    },
    [mutations, runAction, selectedTask],
  );

  const handleDrawerRetry = useCallback(
    (logId: string, reportId?: string) => {
      if (!selectedTask) return;
      void runAction(
        selectedTask,
        "retry",
        () =>
          mutations.retryDelivery(logId, {
            taskId: selectedTask.taskId,
            reportId,
            assignmentId: selectedTask.assignmentId,
          }),
        "Delivery retry queued",
      );
    },
    [mutations, runAction, selectedTask],
  );

  const handleDrawerUpload = useCallback(
    (taskId: string) => {
      window.open(
        `/lab-dashboard/reports/upload?taskId=${encodeURIComponent(taskId)}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [],
  );

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setSelectedTask(null);
    }
  }, []);

  const showKpiSkeleton = loading && tasks.length === 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden">
      {showKpiSkeleton ? (
        <ReportsKpiStripSkeleton />
      ) : (
        <ReportsKpiStrip
          kpis={kpis}
          activeTab={tab}
          onTabSelect={handleTabSelect}
          loading={loading}
          urgentOnly={filters.urgentOnly}
          tatOnly={filters.tatOnly}
          onToggleUrgent={handleToggleUrgent}
          onToggleTat={handleToggleTat}
        />
      )}

      <ReportsStaleQueueBanner visible={isStaleQueue} />

      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#111827]">Pending report workflow</h2>
          {isDemoFallback || isDemoForced ? <ReportsDemoChip /> : null}
        </div>
        <ReportsFiltersRow
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          disabled={loading}
        />
      </div>

      <ReportsWorkflowQueue
        groups={groups}
        loading={loading}
        refreshing={refreshing}
        error={error}
        isQueryError={isQueryError}
        totalTaskCount={totalTaskCount}
        filteredTaskCount={filteredTasks.length}
        tab={tab}
        searchQuery={searchInput}
        onClearSearch={() => handleSearchChange("")}
        actionLoading={actionLoading}
        onRetry={refetch}
        onPrimaryAction={handlePrimaryAction}
        onPreview={handlePreview}
        onViewOrder={handleViewOrder}
      />

      <OrderDetailSheet
        order={drawerOrder}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onOrderPatched={(patched) => {
          void mutations.invalidateLabOrderAssignment(patched.assignmentId);
          refetch();
        }}
        onQueueRefresh={() => refetch()}
        reportPanel={drawerPanel}
        onRefreshLineage={handleRefreshLineage}
        refreshingLineage={refreshingLineage}
        reportActions={{
          onMarkReady: handleDrawerMarkReady,
          onRetryDelivery: handleDrawerRetry,
          onUpload: handleDrawerUpload,
          actionLoading,
        }}
      />
    </div>
  );
}
