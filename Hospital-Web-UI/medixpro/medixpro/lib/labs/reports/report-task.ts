import type { UrgencyLevel } from "@/lib/labs/constants/urgency";
import { mapReportOperationalStatus, type ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import { isTatBreached } from "@/lib/labs/reports/tat-sla";
import type { LabOrderRow } from "@/lib/labs/types";

/** Slim operational queue card — no upload/artifact/detail payload. */
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
  /** Phase 1 proxy for operational date filter (delivered_at ?? ready_at ?? uploaded_at). */
  updatedAtIso: string | null;
  assignedAtIso: string | null;
  createdAtIso: string | null;
  operationalStatus: ReportOperationalStatus;
  pendingSiblingCount: number;
  urgency: UrgencyLevel;
  tatBreached: boolean;
  labName: string;
  reportCount: number;
  /** Mutation targets from queue DTO — no per-CTA context fetch. */
  actionTargets: ReportActionTargets;
  /** Legacy: present only when loaded via labs/orders fallback. */
  orderRow?: LabOrderRow;
};

export type ReportActionTargets = {
  uploadReportId?: string;
  markReadyReportId?: string;
  sendWhatsappReportId?: string;
  retryDeliveryLogId?: string;
};

const EMPTY_ACTION_TARGETS: ReportActionTargets = {};

export function emptyActionTargets(): ReportActionTargets {
  return EMPTY_ACTION_TARGETS;
}

export function patientKeyFromParts(patientName: string, patientPhone: string): string {
  const phone = patientPhone.replace(/\D/g, "");
  if (phone.length >= 6) return `phone:${phone}`;
  return `name:${patientName.trim().toLowerCase()}`;
}

export function patientKeyFromOrder(order: LabOrderRow): string {
  return patientKeyFromParts(order.patient, order.patientPhone);
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

  const urgency = order.urgency ?? "ROUTINE";

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
    updatedAtIso: assignedIso,
    assignedAtIso: assignedIso,
    createdAtIso: assignedIso,
    operationalStatus: mapReportOperationalStatus(order.reportStatus),
    pendingSiblingCount: 0,
    urgency,
    tatBreached: isTatBreached(assignedIso, urgency),
    labName: order.branch || "",
    reportCount: testNames.length,
    actionTargets: emptyActionTargets(),
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
  const iso = task.updatedAtIso ?? task.assignedAtIso;
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
