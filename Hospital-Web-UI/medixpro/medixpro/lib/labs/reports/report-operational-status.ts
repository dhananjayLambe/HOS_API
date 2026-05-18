import type { ReportStatus } from "@/lib/labs/constants/status";
import { labelForStatus } from "@/lib/labs/constants/status";

export type ReportOperationalStatus = ReportStatus;

export type ReportTabKey = "all" | "pending" | "uploaded" | "ready" | "delivered" | "failed";

export const REPORT_TAB_KEYS: ReportTabKey[] = [
  "all",
  "pending",
  "uploaded",
  "ready",
  "delivered",
  "failed",
];

const API_TO_OPERATIONAL: Record<string, ReportOperationalStatus> = {
  "": "PENDING_UPLOAD",
  pending: "PENDING_UPLOAD",
  in_progress: "UPLOADED",
  ready: "READY_DELIVERY",
  delivered: "DELIVERED",
  rejected: "FAILED_DELIVERY",
};

const TAB_TO_STATUS: Record<Exclude<ReportTabKey, "all">, ReportOperationalStatus> = {
  pending: "PENDING_UPLOAD",
  uploaded: "UPLOADED",
  ready: "READY_DELIVERY",
  delivered: "DELIVERED",
  failed: "FAILED_DELIVERY",
};

export function normalizeApiReportStatus(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

export function mapReportOperationalStatus(
  apiStatus: string | null | undefined,
): ReportOperationalStatus {
  const key = normalizeApiReportStatus(apiStatus);
  return API_TO_OPERATIONAL[key] ?? "PENDING_UPLOAD";
}

export function operationalStatusLabel(status: ReportOperationalStatus): string {
  return labelForStatus("report", status);
}

export function tabKeyForOperationalStatus(status: ReportOperationalStatus): Exclude<ReportTabKey, "all"> {
  const entry = Object.entries(TAB_TO_STATUS).find(([, s]) => s === status);
  return (entry?.[0] as Exclude<ReportTabKey, "all">) ?? "pending";
}

export function taskMatchesTab(
  operationalStatus: ReportOperationalStatus,
  tab: ReportTabKey,
): boolean {
  if (tab === "all") return true;
  return TAB_TO_STATUS[tab] === operationalStatus;
}

export function isPendingUploadStatus(status: ReportOperationalStatus): boolean {
  return status === "PENDING_UPLOAD";
}

export function isUploadedOrBeyond(status: ReportOperationalStatus): boolean {
  return status !== "PENDING_UPLOAD";
}

export type ReportKpiCounts = {
  pendingUpload: number;
  uploaded: number;
  readyDelivery: number;
  deliveredToday: number;
  failedDelivery: number;
};

export function countReportKpis(
  statuses: ReportOperationalStatus[],
  isDeliveredToday: (index: number) => boolean,
): ReportKpiCounts {
  const counts: ReportKpiCounts = {
    pendingUpload: 0,
    uploaded: 0,
    readyDelivery: 0,
    deliveredToday: 0,
    failedDelivery: 0,
  };

  statuses.forEach((status, index) => {
    switch (status) {
      case "PENDING_UPLOAD":
        counts.pendingUpload += 1;
        break;
      case "UPLOADED":
        counts.uploaded += 1;
        break;
      case "READY_DELIVERY":
        counts.readyDelivery += 1;
        break;
      case "DELIVERED":
        if (isDeliveredToday(index)) counts.deliveredToday += 1;
        break;
      case "FAILED_DELIVERY":
        counts.failedDelivery += 1;
        break;
      default:
        break;
    }
  });

  return counts;
}

export function parseReportTabFromSearchParams(
  tab: string | null | undefined,
): ReportTabKey {
  const normalized = (tab ?? "").toLowerCase();
  if (REPORT_TAB_KEYS.includes(normalized as ReportTabKey)) {
    return normalized as ReportTabKey;
  }
  return "all";
}
