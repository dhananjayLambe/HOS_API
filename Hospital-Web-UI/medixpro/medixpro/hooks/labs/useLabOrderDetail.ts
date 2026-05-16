"use client";

import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  ACTION_LABELS,
  isActionEnabled,
  type LabOrderActionKey,
  WORKFLOW_ACTION_DISABLED_HINT,
} from "@/lib/labs/orders/order-workflow-config";
import type { LabOrderRow } from "@/lib/labs/types";
import { useCallback, useState } from "react";

export function useLabOrderDetail(order: LabOrderRow | null) {
  const toast = useToastNotification();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<LabOrderActionKey | null>(null);

  const runAction = useCallback(
    async (key: LabOrderActionKey) => {
      if (!order) return;
      if (!isActionEnabled(key)) {
        toast.info(WORKFLOW_ACTION_DISABLED_HINT);
        return;
      }
      setActionLoading(key);
      try {
        // Phase 2: wire accept/reject/processing APIs here
      } finally {
        setActionLoading(null);
      }
    },
    [order, toast],
  );

  const openRejectDialog = useCallback(() => {
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!order) return;
    if (!isActionEnabled("reject")) {
      toast.info(WORKFLOW_ACTION_DISABLED_HINT);
      setRejectDialogOpen(false);
      return;
    }
    await runAction("reject");
    setRejectDialogOpen(false);
  }, [order, runAction, toast]);

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
    isActionEnabled,
  };
}
