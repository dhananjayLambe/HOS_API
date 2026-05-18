"use client";

import { OrderDetailSheet } from "@/components/labs/orders/OrderDetailSheet";
import { ReportsFiltersRow } from "@/components/labs/reports/ReportsFiltersRow";
import { ReportsDemoChip } from "@/components/labs/reports/ReportsDemoBanner";
import { ReportsKpiStrip } from "@/components/labs/reports/ReportsKpiStrip";
import { ReportsWorkflowQueue } from "@/components/labs/reports/ReportsWorkflowQueue";
import { Button } from "@/components/ui/button";
import { useLabReportsList } from "@/hooks/labs/useLabReportsList";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import type { ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import {
  markTaskReady,
  mockReportPreviewUrl,
  retryTaskDelivery,
  sendTaskWhatsApp,
} from "@/lib/labs/reports/reports-mock-service";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import type { LabOrderRow } from "@/lib/labs/types";
import { RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { parseReportTabFromSearchParams } from "@/lib/labs/reports/report-operational-status";

export function ReportsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";
  const toast = useToastNotification();

  const {
    isDemoFallback,
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
    error,
    refetch,
    patchTaskStatus,
    getOrderForTask,
  } = useLabReportsList(branchLabel);

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    setTab(parseReportTabFromSearchParams(tabParam));
  }, [tabParam, setTab]);

  const handleTabSelect = useCallback(
    (next: ReportTabKey) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `/lab-dashboard/reports?${qs}` : "/lab-dashboard/reports", { scroll: false });
    },
    [router, searchParams, setTab],
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<LabOrderRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const headerActions = useMemo(
    () => (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => refetch()}
        disabled={loading}
      >
        <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        Refresh
      </Button>
    ),
    [loading, refetch],
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
      nextStatus?: ReportOperationalStatus,
    ) => {
      setActionLoading(`${task.taskId}:${key}`);
      try {
        await fn();
        if (nextStatus) patchTaskStatus(task.taskId, nextStatus);
        toast.success(successMsg);
      } catch {
        toast.error("Action failed. Try again.");
      } finally {
        setActionLoading(null);
      }
    },
    [patchTaskStatus, toast],
  );

  const handlePrimaryAction = useCallback(
    (task: ReportTask, actionKey: string) => {
      switch (actionKey) {
        case "ready":
          void runAction(task, "ready", () => markTaskReady(task.taskId), "Marked ready for delivery", "READY_DELIVERY");
          break;
        case "wa":
          void runAction(task, "wa", () => sendTaskWhatsApp(task.taskId), "WhatsApp delivery queued", "DELIVERED");
          break;
        case "resend":
          void runAction(task, "resend", () => sendTaskWhatsApp(task.taskId), "Report resent", "DELIVERED");
          break;
        case "retry":
          void runAction(task, "retry", () => retryTaskDelivery(task.taskId), "Delivery retry queued", "READY_DELIVERY");
          break;
        default:
          break;
      }
    },
    [runAction],
  );

  const handlePreview = (task: ReportTask) => {
    window.open(mockReportPreviewUrl(task.taskId), "_blank", "noopener,noreferrer");
  };

  const handleViewOrder = (task: ReportTask) => {
    const order = getOrderForTask(task.taskId);
    if (order) {
      setSelectedOrder(order);
      setSheetOpen(true);
    }
  };

  const filteredEmpty = !loading && !error && filteredTasks.length === 0;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <ReportsKpiStrip kpis={kpis} activeTab={tab} onTabSelect={handleTabSelect} loading={loading} />

      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#111827]">Pending report workflow</h2>
          {isDemoFallback ? <ReportsDemoChip /> : null}
        </div>
        <ReportsFiltersRow
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          filters={filters}
          onFiltersChange={setFilters}
          disabled={loading}
        />
      </div>

      <ReportsWorkflowQueue
        groups={groups}
        loading={loading && tasks.length === 0}
        error={error}
        filteredEmpty={filteredEmpty}
        actionLoading={actionLoading}
        onRetry={refetch}
        onPrimaryAction={handlePrimaryAction}
        onPreview={handlePreview}
        onViewOrder={handleViewOrder}
      />

      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOrderPatched={() => refetch()}
      />
    </div>
  );
}
