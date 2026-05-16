"use client";

import { useToastNotification } from "@/hooks/use-toast-notification";
import { acceptLabOrder, rejectLabOrder } from "@/lib/labs/api/orders";
import {
  ACTION_LABELS,
  applyWorkflowResponseToRow,
  isActionEnabled,
  type LabOrderActionKey,
} from "@/lib/labs/orders/order-workflow-config";
import type { LabOrderRow } from "@/lib/labs/types";
import { isAxiosError } from "axios";
import { useCallback, useState } from "react";

type UseLabOrderDetailOptions = {
  onOrderPatched?: (row: LabOrderRow) => void;
  onQueueRefresh?: () => void;
};

export function useLabOrderDetail(order: LabOrderRow | null, options?: UseLabOrderDetailOptions) {
  const toast = useToastNotification();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<LabOrderActionKey | null>(null);

  const handleWorkflowSuccess = useCallback(
    (patched: LabOrderRow, message: string) => {
      toast.success(message);
      options?.onOrderPatched?.(patched);
      options?.onQueueRefresh?.();
    },
    [options, toast],
  );

  const handleWorkflowError = useCallback(
    (err: unknown, fallback: string) => {
      if (isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string") {
          toast.error(detail);
          return;
        }
        const reason = err.response?.data?.reason;
        if (Array.isArray(reason) && reason[0]) {
          toast.error(String(reason[0]));
          return;
        }
      }
      toast.error(fallback);
    },
    [toast],
  );

  const runAction = useCallback(
    async (key: LabOrderActionKey) => {
      if (!order) return;
      if (!isActionEnabled(key, order.status)) return;

      if (key === "reject") {
        setRejectReason("");
        setRejectDialogOpen(true);
        return;
      }

      if (key !== "accept") return;

      setActionLoading(key);
      try {
        const response = await acceptLabOrder(order.assignmentId);
        const patched = applyWorkflowResponseToRow(order, response);
        handleWorkflowSuccess(patched, response.message || "Order accepted successfully");
      } catch (err) {
        handleWorkflowError(err, "Could not accept order.");
      } finally {
        setActionLoading(null);
      }
    },
    [order, handleWorkflowSuccess, handleWorkflowError],
  );

  const openRejectDialog = useCallback(() => {
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!order) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    if (!isActionEnabled("reject", order.status)) return;

    setActionLoading("reject");
    try {
      const response = await rejectLabOrder(order.assignmentId, reason);
      const patched = applyWorkflowResponseToRow(order, response);
      handleWorkflowSuccess(patched, response.message || "Order rejected successfully");
      setRejectDialogOpen(false);
      setRejectReason("");
    } catch (err) {
      handleWorkflowError(err, "Could not reject order.");
    } finally {
      setActionLoading(null);
    }
  }, [order, rejectReason, handleWorkflowSuccess, handleWorkflowError, toast]);

  const checkActionEnabled = useCallback(
    (key: LabOrderActionKey) => (order ? isActionEnabled(key, order.status) : false),
    [order],
  );

  return {
    order,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectReason,
    setRejectReason,
    actionLoading,
    runAction,
    openRejectDialog,
    confirmReject,
    actionLabels: ACTION_LABELS,
    isActionEnabled: checkActionEnabled,
  };
}
