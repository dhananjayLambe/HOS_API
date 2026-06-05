"use client";

import { OrderCompletionCard } from "@/components/labs/reports/completion/OrderCompletionCard";
import {
  ReportsAssignmentLiveCard,
  type ReportsAssignmentLiveCardActions,
} from "@/components/labs/reports/ReportsAssignmentLiveCard";
import type {
  OrderLifecycleViewModel,
  PatientOrderGroupViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

export type PatientOrderGroupProps = {
  group: PatientOrderGroupViewModel;
  branchId?: string | null;
  highlightedTaskId?: string | null;
  actionLoadingTaskId?: string | null;
  onUpload: (taskId: string, reportId?: string) => void;
  onSendAvailable: (taskId: string, reportIds?: string[]) => void;
  onRetry: (taskId: string) => void;
  onReupload: (taskId: string, reportId: string) => void;
  onPreview: (taskId: string, reportId: string) => void;
  onDismissToast: (taskId: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  cardRefs?: React.MutableRefObject<Record<string, HTMLElement | null>>;
  /** Live API: resolve queue task for assignment cards. */
  getTask?: (taskId: string) => ReportTask | null;
  liveCardActions?: ReportsAssignmentLiveCardActions;
};

function isUrgentOrder(order: OrderLifecycleViewModel): boolean {
  return (
    order.urgency === "STAT" ||
    order.urgency === "URGENT" ||
    order.tatState === "near_breach" ||
    order.tatState === "breached"
  );
}

function isDelayedOrder(order: OrderLifecycleViewModel): boolean {
  return (
    Boolean(order.deliveryFailure) ||
    order.tatState === "breached" ||
    order.attentionReasons.includes("stuck_partial")
  );
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function PatientOrderGroup({
  group,
  branchId = null,
  highlightedTaskId,
  actionLoadingTaskId,
  onUpload,
  onSendAvailable,
  onRetry,
  onReupload,
  onPreview,
  onDismissToast,
  expanded,
  onToggleExpanded,
  cardRefs,
  getTask,
  liveCardActions,
}: PatientOrderGroupProps) {
  const firstOrder = group.orders[0];
  const phone = firstOrder?.patientPhone ?? "";
  const activeCount = group.orders.filter((order) => !order.isFullyComplete).length;
  const urgentCount = group.orders.filter(isUrgentOrder).length;
  const delayedCount = group.orders.filter(isDelayedOrder).length;
  const orderSummary =
    activeCount > 0
      ? pluralize(activeCount, "active order")
      : pluralize(group.orders.length, "delivered order");

  return (
    <section className="rounded-md border border-[#E4E7F0] bg-[#F7F8FF]">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#F1F3FF]"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#111827]">{group.patientName}</span>
          <span className="block truncate text-[11px] font-medium text-[#6B7280]">{phone}</span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-[#374151]">
            {orderSummary}
            {urgentCount > 0 ? ` · ${urgentCount} urgent` : ""}
            {delayedCount > 0 ? ` · ${delayedCount} delayed` : ""}
          </span>
        </span>
      </button>
      {expanded ? (
        <div className={cn("border-t border-[#E4E7F0] px-2 py-1.5")}>
          <div className="space-y-1 border-l-2 border-[#DDE3F5] pl-2">
            {group.orders.map((order) => {
              const task = getTask?.(order.taskId);
              if (task && liveCardActions) {
                return (
                  <ReportsAssignmentLiveCard
                    key={order.taskId}
                    task={task}
                    contextEnabled
                    actionLoading={actionLoadingTaskId}
                    actions={liveCardActions}
                  />
                );
              }
              return (
                <OrderCompletionCard
                  key={order.taskId}
                  branchId={branchId}
                  ref={(el) => {
                    if (cardRefs) cardRefs.current[order.taskId] = el;
                  }}
                  order={order}
                  hidePatientName
                  highlighted={highlightedTaskId === order.taskId}
                  actionLoading={actionLoadingTaskId === order.taskId}
                  onUpload={(reportId) => onUpload(order.taskId, reportId)}
                  onSendAvailable={(reportIds) => onSendAvailable(order.taskId, reportIds)}
                  onRetry={() => onRetry(order.taskId)}
                  onReupload={(reportId) => onReupload(order.taskId, reportId)}
                  onPreview={(reportId) => onPreview(order.taskId, reportId)}
                  onDismissToast={() => onDismissToast(order.taskId)}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
