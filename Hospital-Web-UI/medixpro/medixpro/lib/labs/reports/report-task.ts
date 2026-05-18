import { mapReportOperationalStatus, type ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { LabOrderRow } from "@/lib/labs/types";

export type ReportTask = {
  taskId: string;
  assignmentId: string;
  orderUuid: string;
  orderNumber: string;
  patientKey: string;
  patientName: string;
  patientPhone: string;
  testLabel: string;
  testNames: string[];
  collectionType: "HOME" | "VISIT";
  visitOrSlotLabel: string;
  collectedAtLabel: string;
  updatedAtLabel: string;
  assignedAtIso: string | null;
  operationalStatus: ReportOperationalStatus;
  pendingSiblingCount: number;
  /** Underlying order row for detail sheet / actions */
  orderRow: LabOrderRow;
};

export function patientKeyFromOrder(order: LabOrderRow): string {
  const phone = order.patientPhone.replace(/\D/g, "");
  if (phone.length >= 6) return `phone:${phone}`;
  return `name:${order.patient.trim().toLowerCase()}`;
}

export function formatTestLabel(testNames: string[]): string {
  if (testNames.length === 0) return "Diagnostic order";
  if (testNames.length <= 2) return testNames.join(" + ");
  return `${testNames[0]} + ${testNames.length - 1} more`;
}

function formatRelativeCollected(iso: string | null | undefined): string {
  if (!iso) return "Collected —";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Collected —";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Collected just now";
  if (diffMins < 60) return `Collected ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Collected ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Collected yesterday";
  return `Collected ${diffDays}d ago`;
}

function formatUpdatedAt(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function mapOrderToReportTask(order: LabOrderRow): ReportTask {
  const testNames = order.tests.map((t) => t.name);
  const assignedIso = order.assignedAtIso ?? null;
  const collectedLabel = formatRelativeCollected(assignedIso);
  const updatedLabel = formatUpdatedAt(assignedIso, collectedLabel);

  return {
    taskId: order.assignmentId,
    assignmentId: order.assignmentId,
    orderUuid: order.orderUuid,
    orderNumber: order.id,
    patientKey: patientKeyFromOrder(order),
    patientName: order.patient,
    patientPhone: order.patientPhone,
    testLabel: formatTestLabel(testNames),
    testNames,
    collectionType: order.collectionType,
    visitOrSlotLabel: order.preferredSlot || "—",
    collectedAtLabel: collectedLabel,
    updatedAtLabel: updatedLabel,
    assignedAtIso: assignedIso,
    operationalStatus: mapReportOperationalStatus(order.reportStatus),
    pendingSiblingCount: 0,
    orderRow: order,
  };
}

export function buildReportTasksFromOrders(orders: LabOrderRow[]): ReportTask[] {
  const tasks = orders.map(mapOrderToReportTask);
  const pendingByPatient = new Map<string, number>();
  for (const task of tasks) {
    if (task.operationalStatus === "PENDING_UPLOAD") {
      pendingByPatient.set(task.patientKey, (pendingByPatient.get(task.patientKey) ?? 0) + 1);
    }
  }
  return tasks.map((task) => ({
    ...task,
    pendingSiblingCount: pendingByPatient.get(task.patientKey) ?? 0,
  }));
}

export function isDeliveredToday(task: ReportTask): boolean {
  if (task.operationalStatus !== "DELIVERED") return false;
  const iso = task.assignedAtIso;
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
