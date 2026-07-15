"use client";

import { DashboardFailuresFooter } from "@/components/labs/dashboard/DashboardFailuresFooter";
import { DashboardTopBand } from "@/components/labs/dashboard/DashboardTopBand";
import { DashboardViewportGrid } from "@/components/labs/dashboard/DashboardViewportGrid";
import { LabOrdersErrorState } from "@/components/labs/orders/LabOrdersErrorState";
import { OrderDetailSheet } from "@/components/labs/orders/OrderDetailSheet";
import { useLabDashboardData } from "@/hooks/labs/useLabDashboardData";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { acceptLabOrder } from "@/lib/labs/api/orders";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import type { LabOrderRow } from "@/lib/labs/types";
import { isAxiosError } from "axios";
import { useCallback, useMemo, useState } from "react";

const EMPTY_METRICS = {
  pendingOrders: 0,
  collectionsToday: 0,
  reportsPendingUpload: 0,
  readyForDelivery: 0,
  ordersThisMonth: 0,
  avgDailyOrders: 0,
  collectionSuccessPercent: null as number | null,
};

export function LabDashboardHome() {
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";
  const toast = useToastNotification();

  const {
    metrics,
    pendingRows,
    pendingTotal,
    collectionRows,
    collectionsTotal,
    reportsPendingRows,
    reportsPendingTotal,
    readyDeliveryRows,
    readyDeliveryTotal,
    loading,
    error,
    refetch,
    removePendingRow,
  } = useLabDashboardData(branchLabel);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedOrderPatch, setSelectedOrderPatch] = useState<LabOrderRow | null>(null);

  useLabShellHeader({
    title: "Dashboard",
  });

  const handleAccept = useCallback(
    async (order: LabOrderRow) => {
      setAcceptingId(order.assignmentId);
      try {
        const response = await acceptLabOrder(order.assignmentId);
        removePendingRow(order.assignmentId);
        toast.success(response.message || "Order accepted");
        refetch();
      } catch (err) {
        if (isAxiosError(err)) {
          const detail = err.response?.data?.detail;
          if (typeof detail === "string") {
            toast.error(detail);
            return;
          }
        }
        toast.error("Could not accept order.");
      } finally {
        setAcceptingId(null);
      }
    },
    [removePendingRow, refetch, toast],
  );

  const openDetail = useCallback((order: LabOrderRow) => {
    setSelectedAssignmentId(order.assignmentId);
    setSelectedOrderPatch(null);
    setSheetOpen(true);
  }, []);

  const selectedOrder = useMemo(() => {
    if (!selectedAssignmentId) return null;
    if (selectedOrderPatch?.assignmentId === selectedAssignmentId) {
      return selectedOrderPatch;
    }
    return pendingRows.find((r) => r.assignmentId === selectedAssignmentId) ?? selectedOrderPatch;
  }, [pendingRows, selectedAssignmentId, selectedOrderPatch]);

  const handleOrderPatched = useCallback(
    (patched: LabOrderRow) => {
      setSelectedOrderPatch(patched);
      if (patched.status !== "PENDING") {
        removePendingRow(patched.assignmentId);
      }
    },
    [removePendingRow],
  );

  const displayMetrics = loading && pendingRows.length === 0 ? EMPTY_METRICS : metrics;

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <DashboardTopBand metrics={displayMetrics} loading={loading && !error} />

      {error ? (
        <div className="rounded-xl border border-[#ECEBFF] bg-white p-4">
          <LabOrdersErrorState message={error} onRetry={refetch} retrying={loading} />
        </div>
      ) : (
        <DashboardViewportGrid
          pendingRows={pendingRows}
          pendingTotal={pendingTotal}
          acceptingId={acceptingId}
          onAccept={handleAccept}
          onView={openDetail}
          collectionRows={collectionRows}
          collectionsTotal={collectionsTotal}
          reportsPendingRows={reportsPendingRows}
          reportsPendingTotal={reportsPendingTotal}
          readyDeliveryRows={readyDeliveryRows}
          readyDeliveryTotal={readyDeliveryTotal}
          footer={<DashboardFailuresFooter />}
        />
      )}

      <OrderDetailSheet
        order={selectedOrder}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOrderPatched={handleOrderPatched}
        onQueueRefresh={refetch}
      />
    </div>
  );
}
