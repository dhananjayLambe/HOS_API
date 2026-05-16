"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTION_LABELS,
  type LabOrderActionKey,
  WORKFLOW_ACTION_DISABLED_HINT,
} from "@/lib/labs/orders/order-workflow-config";
import { isAutoRejectedReason } from "@/lib/labs/orders/sla-countdown";
import type { LabOrderRow } from "@/lib/labs/types";
import { Loader2 } from "lucide-react";

type OrderDetailWorkflowFooterProps = {
  order: LabOrderRow;
  actionLoading: LabOrderActionKey | null;
  isActionEnabled: (key: LabOrderActionKey) => boolean;
  onAction: (key: LabOrderActionKey) => void;
  rejectDialogOpen: boolean;
  onRejectDialogOpenChange: (open: boolean) => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onConfirmReject: () => void;
};

function WorkflowButton({
  actionKey,
  variant,
  className,
  actionLoading,
  isActionEnabled,
  onAction,
}: {
  actionKey: LabOrderActionKey;
  variant?: "default" | "secondary" | "outline" | "destructive";
  className?: string;
  actionLoading: LabOrderActionKey | null;
  isActionEnabled: (key: LabOrderActionKey) => boolean;
  onAction: (key: LabOrderActionKey) => void;
}) {
  const loading = actionLoading === actionKey;
  const enabled = isActionEnabled(actionKey);

  return (
    <Button
      type="button"
      variant={variant ?? "outline"}
      size="sm"
      className={className}
      disabled={!enabled || actionLoading !== null}
      title={!enabled ? WORKFLOW_ACTION_DISABLED_HINT : undefined}
      onClick={() => onAction(actionKey)}
    >
      {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
      {ACTION_LABELS[actionKey]}
    </Button>
  );
}

export function OrderDetailWorkflowFooter({
  order,
  actionLoading,
  isActionEnabled,
  onAction,
  rejectDialogOpen,
  onRejectDialogOpenChange,
  rejectReason,
  onRejectReasonChange,
  onConfirmReject,
}: OrderDetailWorkflowFooterProps) {
  const { status, allowedActions } = order;

  if (status === "COMPLETED") {
    return (
      <div className="border-t border-[#ECEBFF] bg-white/95 p-3 backdrop-blur-sm sm:p-4">
        <p className="text-sm font-medium text-[#027A48]">Order completed</p>
        {order.createdAt ? (
          <p className="mt-1 text-xs text-[#6B7280]">Last updated {order.createdAt}</p>
        ) : null}
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="border-t border-[#ECEBFF] bg-white/95 p-3 backdrop-blur-sm sm:p-4">
        <p className="text-sm font-medium text-[#B42318]">Order rejected</p>
        {isAutoRejectedReason(order.rejectionReason) ? (
          <p className="mt-1 text-xs text-[#6B7280]">
            Automatically rejected after SLA timeout
          </p>
        ) : null}
        {order.rejectionReason ? (
          <p className="mt-1 text-sm text-[#374151]">{order.rejectionReason}</p>
        ) : null}
        {order.rejectedAt ? (
          <p className="mt-1 text-xs text-[#6B7280]">{order.rejectedAt}</p>
        ) : null}
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="border-t border-[#ECEBFF] bg-white/95 p-3 backdrop-blur-sm sm:p-4">
        <p className="text-sm font-medium text-[#6B7280]">Order cancelled</p>
      </div>
    );
  }

  const showReject = allowedActions.includes("reject");
  const showAccept = allowedActions.includes("accept");

  return (
    <>
      <div className="border-t border-[#ECEBFF] bg-white/95 p-3 backdrop-blur-sm sm:p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
          Workflow actions
        </p>
        <div className="flex flex-wrap gap-2">
          {showReject ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRejectDialogOpenChange(true)}
            >
              {ACTION_LABELS.reject}
            </Button>
          ) : null}
          {showAccept ? (
            <WorkflowButton
              actionKey="accept"
              variant="default"
              className="border border-[#3D2499] bg-[#4A2DB8] font-semibold text-white shadow-sm hover:bg-[#3D2499] disabled:border-[#3D2499] disabled:bg-[#4A2DB8] disabled:text-white disabled:opacity-90"
              actionLoading={actionLoading}
              isActionEnabled={isActionEnabled}
              onAction={onAction}
            />
          ) : null}
          {allowedActions.includes("start_processing") ? (
            <WorkflowButton
              actionKey="start_processing"
              variant="default"
              className="bg-[#7C5CFC] hover:bg-[#6D4FF5]"
              actionLoading={actionLoading}
              isActionEnabled={isActionEnabled}
              onAction={onAction}
            />
          ) : null}
          {allowedActions.includes("upload_report") ? (
            <WorkflowButton
              actionKey="upload_report"
              actionLoading={actionLoading}
              isActionEnabled={isActionEnabled}
              onAction={onAction}
            />
          ) : null}
          {allowedActions.includes("mark_completed") ? (
            <WorkflowButton
              actionKey="mark_completed"
              variant="default"
              className="bg-[#7C5CFC] hover:bg-[#6D4FF5]"
              actionLoading={actionLoading}
              isActionEnabled={isActionEnabled}
              onAction={onAction}
            />
          ) : null}
        </div>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={onRejectDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject order</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this assignment. This will be recorded on the order.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Reason for rejection"
            rows={3}
            className="resize-none"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onRejectDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!isActionEnabled("reject") || !rejectReason.trim() || actionLoading !== null}
              onClick={onConfirmReject}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
