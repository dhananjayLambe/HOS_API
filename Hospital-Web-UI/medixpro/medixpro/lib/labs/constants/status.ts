/**
 * Canonical lab workflow statuses for Phase 1 UI.
 * Order / Collection / Appointment align with Hospital-Management-API labs/choices/workflow.py.
 * Sample aligns with labs/choices/tracking.py SampleStatus.
 * Report statuses are UI-phase names until API enums are wired.
 */

export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const COLLECTION_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "COLLECTED",
  "FAILED",
  "CANCELLED",
] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
  "RESCHEDULED",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const SAMPLE_STATUSES = [
  "COLLECTED",
  "IN_TRANSIT",
  "RECEIVED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const REPORT_STATUSES = [
  "PENDING_UPLOAD",
  "UNDER_REVIEW",
  "APPROVED",
  "DELIVERED",
  "FAILED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const DELIVERY_STATUSES = ["PENDING", "SENT", "DELIVERED", "VIEWED", "FAILED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type LabStatusDomain = "order" | "collection" | "appointment" | "sample" | "report" | "delivery";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const COLLECTION_STATUS_LABELS: Record<CollectionStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COLLECTED: "Collected",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  COLLECTED: "Collected",
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING_UPLOAD: "Pending upload",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  VIEWED: "Viewed",
  FAILED: "Failed",
};

export function labelForStatus(domain: LabStatusDomain, status: string): string {
  switch (domain) {
    case "order":
      return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
    case "collection":
      return COLLECTION_STATUS_LABELS[status as CollectionStatus] ?? status;
    case "appointment":
      return APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? status;
    case "sample":
      return SAMPLE_STATUS_LABELS[status as SampleStatus] ?? status;
    case "report":
      return REPORT_STATUS_LABELS[status as ReportStatus] ?? status;
    case "delivery":
      return DELIVERY_STATUS_LABELS[status as DeliveryStatus] ?? status;
    default:
      return status;
  }
}
