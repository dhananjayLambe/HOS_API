import type {
  AttentionItem,
  CompletionFilterKey,
  CompletionKpis,
  OrderLifecycleViewModel,
  PatientOrderGroupViewModel,
} from "@/lib/labs/reports/completion/order-lifecycle.types";
import {
  isFailedReport,
  isPendingUpload,
  isReadyToSend,
  isUpdatedReportPendingSend,
} from "@/lib/labs/reports/completion/operational-contract";

type DerivedOrderWorkflowState =
  | "pending_upload"
  | "partial_upload"
  | "ready_to_send"
  | "delivered"
  | "attention_required";

function resolveOrderWorkflowState(order: OrderLifecycleViewModel): DerivedOrderWorkflowState {
  if (order.orderWorkflowState) return order.orderWorkflowState;
  if (order.deliveryFailure || order.reports.some(isFailedReport)) return "attention_required";
  if (order.isFullyComplete) return "delivered";
  const required = order.requiredReports ?? order.totalReports ?? order.reports.length;
  const uploadedRequired = order.uploadedRequiredReports ?? order.uploadedReports;
  if (typeof required === "number" && required > 0 && typeof uploadedRequired === "number") {
    if (uploadedRequired >= required) return "ready_to_send";
    if (uploadedRequired > 0) return "partial_upload";
    return "pending_upload";
  }
  if (order.hasPendingUpload && order.readyToSendCount > 0) return "partial_upload";
  if (order.hasPendingUpload) return "pending_upload";
  if (order.readyToSendCount > 0) return "ready_to_send";
  return "pending_upload";
}

export function buildAttentionItems(orders: OrderLifecycleViewModel[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const order of orders) {
    if (order.isFullyComplete) continue;
    if (order.deliveryFailure) {
      items.push({
        id: `${order.taskId}-fail`,
        taskId: order.taskId,
        reason: "delivery_failed",
        line: `${order.patientName} — ${order.deliveryFailure.testLabel} send failed`,
      });
    } else if (order.tatState === "breached" || order.tatState === "near_breach") {
      items.push({
        id: `${order.taskId}-tat`,
        taskId: order.taskId,
        reason: "tat_breached",
        line: `${order.patientName} — ${order.tatLabel}`,
      });
    } else if (order.urgency === "STAT" && order.hasPendingUpload) {
      items.push({
        id: `${order.taskId}-stat`,
        taskId: order.taskId,
        reason: "stat_pending",
        line: `${order.patientName} — STAT report pending`,
      });
    } else if (order.attentionReasons.includes("stuck_partial")) {
      items.push({
        id: `${order.taskId}-stuck`,
        taskId: order.taskId,
        reason: "stuck_partial",
        line: `${order.patientName} — awaiting remaining reports`,
      });
    } else if (order.reports.some(isUpdatedReportPendingSend)) {
      items.push({
        id: `${order.taskId}-updated`,
        taskId: order.taskId,
        reason: "stuck_partial",
        line: `${order.patientName} — updated report needs sending`,
      });
    }
  }
  return items.slice(0, 8);
}

export function computeCompletionKpis(orders: OrderLifecycleViewModel[]): CompletionKpis {
  let notStarted = 0;
  let inProgress = 0;
  let readyToSend = 0;
  let delivered = 0;
  let attentionRequired = 0;

  for (const order of orders) {
    const state = resolveOrderWorkflowState(order);
    if (state === "delivered" || order.isFullyComplete) {
      delivered += 1;
      continue;
    }
    if (state === "pending_upload") {
      notStarted += 1;
    }
    if (state === "partial_upload") {
      inProgress += 1;
    }
    if (state === "ready_to_send") {
      readyToSend += 1;
    }
    if (
      state === "attention_required" ||
      order.deliveryFailure ||
      order.reports.some(isFailedReport)
    ) {
      attentionRequired += 1;
    }
  }

  return { notStarted, inProgress, readyToSend, delivered, attentionRequired };
}

export function filterOrdersByWorkflow(
  orders: OrderLifecycleViewModel[],
  filter: CompletionFilterKey,
): OrderLifecycleViewModel[] {
  // Queue definitions:
  // - pending => pending_upload + partial_upload
  // - ready => ready_to_send only
  // - delivered => delivered only
  // - failed => attention_required only
  if (filter === "all") return orders;
  if (filter === "pending") {
    return orders.filter(
      (o) => {
        const state = resolveOrderWorkflowState(o);
        return state === "pending_upload" || state === "partial_upload";
      },
    );
  }
  if (filter === "ready") {
    return orders.filter(
      (o) => resolveOrderWorkflowState(o) === "ready_to_send",
    );
  }
  if (filter === "delivered") {
    return orders.filter((o) => resolveOrderWorkflowState(o) === "delivered" || o.isFullyComplete);
  }
  if (filter === "failed") {
    return orders.filter(
      (o) => resolveOrderWorkflowState(o) === "attention_required",
    );
  }
  if (filter === "urgent") {
    return orders.filter(
      (o) =>
        !o.isFullyComplete &&
        (o.urgency === "STAT" ||
          o.urgency === "URGENT" ||
          o.tatState === "breached" ||
          o.tatState === "near_breach"),
    );
  }
  return orders;
}

/** @deprecated Use filterOrdersByWorkflow */
export const filterOrdersByChip = filterOrdersByWorkflow;

export function searchOrders(orders: OrderLifecycleViewModel[], query: string): OrderLifecycleViewModel[] {
  const q = query.trim().toLowerCase();
  if (!q) return orders;
  const phoneQ = q.replace(/\D/g, "");
  return orders.filter((o) => {
    if (o.patientName.toLowerCase().includes(q)) return true;
    if (o.orderNumber.toLowerCase().includes(q)) return true;
    if (phoneQ.length >= 3 && o.patientPhone.replace(/\D/g, "").includes(phoneQ)) return true;
    return o.reports.some((r) => r.testLabel.toLowerCase().includes(q));
  });
}

export function groupOrdersByPatient(orders: OrderLifecycleViewModel[]): PatientOrderGroupViewModel[] {
  const map = new Map<string, OrderLifecycleViewModel[]>();
  for (const order of orders) {
    const list = map.get(order.patientKey) ?? [];
    list.push(order);
    map.set(order.patientKey, list);
  }
  return Array.from(map.entries()).map(([patientKey, patientOrders]) => ({
    patientKey,
    patientName: patientOrders[0]!.patientName,
    orders: sortOrdersByOperationalPriority(patientOrders),
  }));
}

export function countReadyToSendReports(orders: OrderLifecycleViewModel[]): number {
  return orders.reduce((sum, o) => sum + o.readyToSendCount, 0);
}

export function getCompletedToday(orders: OrderLifecycleViewModel[]): OrderLifecycleViewModel[] {
  return orders.filter((o) => o.isFullyComplete);
}

export function orderPriorityScore(o: OrderLifecycleViewModel): number {
  if (o.isFullyComplete) return 6;
  if (o.deliveryFailure || o.reports.some(isFailedReport)) return 0;
  if (o.tatState === "breached" || o.tatBreached) return 1;
  if (o.urgency === "STAT" || o.urgency === "URGENT") return 2;
  if (o.hasPendingUpload) return 3;
  if (o.reports.some(isReadyToSend) || o.readyToSendCount > 0) return 4;
  if (o.reports.some(isUpdatedReportPendingSend)) return 5;
  return 7;
}

export function sortOrdersByOperationalPriority(
  orders: OrderLifecycleViewModel[],
): OrderLifecycleViewModel[] {
  return [...orders].sort((a, b) => {
    const ds = orderPriorityScore(a) - orderPriorityScore(b);
    if (ds !== 0) return ds;
    return a.orderNumber.localeCompare(b.orderNumber, undefined, { sensitivity: "base" });
  });
}

export function sortActiveOrders(orders: OrderLifecycleViewModel[]): OrderLifecycleViewModel[] {
  return sortOrdersByOperationalPriority(orders).sort((a, b) => {
    const ds = orderPriorityScore(a) - orderPriorityScore(b);
    if (ds !== 0) return ds;
    const patientSort = a.patientName.localeCompare(b.patientName, undefined, { sensitivity: "base" });
    if (patientSort !== 0) return patientSort;
    return a.orderNumber.localeCompare(b.orderNumber, undefined, { sensitivity: "base" });
  });
}
