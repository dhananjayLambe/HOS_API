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

/** Backend operational_status buckets from report-tasks API (choke point — UI never uses raw strings). */
const OPERATIONAL_BUCKET_TO_STATUS: Record<string, ReportOperationalStatus> = {
  PENDING_UPLOAD: "PENDING_UPLOAD",
  UPLOADED: "UPLOADED",
  READY_DELIVERY: "READY_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED_DELIVERY: "FAILED_DELIVERY",
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

/** Maps v1 `operational_status` or lifecycle strings to domain status. */
export function mapApiOperationalStatus(apiStatus: string | null | undefined): ReportOperationalStatus {
  const raw = (apiStatus ?? "").trim();
  if (!raw) return "PENDING_UPLOAD";
  const upper = raw.toUpperCase();
  if (OPERATIONAL_BUCKET_TO_STATUS[upper]) {
    return OPERATIONAL_BUCKET_TO_STATUS[upper]!;
  }
  return mapReportOperationalStatus(raw);
}

/** Alias for spec / external docs. */
export const mapReportStatus = mapApiOperationalStatus;

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
  urgentCount: number;
  tatBreachedCount: number;
};

export type ReportTaskKpiInput = {
  operationalStatus: ReportOperationalStatus;
  deliveredToday?: boolean;
  urgency?: string;
  tatBreached?: boolean;
};

/** Pure KPI aggregation — no React, no input mutation. */
export function calculateQueueKPIs(tasks: readonly ReportTaskKpiInput[]): ReportKpiCounts {
  const counts: ReportKpiCounts = {
    pendingUpload: 0,
    uploaded: 0,
    readyDelivery: 0,
    deliveredToday: 0,
    failedDelivery: 0,
    urgentCount: 0,
    tatBreachedCount: 0,
  };

  for (const task of tasks) {
    switch (task.operationalStatus) {
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
        if (task.deliveredToday) counts.deliveredToday += 1;
        break;
      case "FAILED_DELIVERY":
        counts.failedDelivery += 1;
        break;
      default:
        break;
    }
    const urgency = (task.urgency ?? "ROUTINE").toUpperCase();
    if (urgency === "URGENT" || urgency === "STAT") counts.urgentCount += 1;
    if (task.tatBreached) counts.tatBreachedCount += 1;
  }

  return counts;
}

/** @deprecated Prefer calculateQueueKPIs with task inputs. */
export function countReportKpis(
  statuses: ReportOperationalStatus[],
  isDeliveredToday: (index: number) => boolean,
): ReportKpiCounts {
  return calculateQueueKPIs(
    statuses.map((operationalStatus, index) => ({
      operationalStatus,
      deliveredToday: isDeliveredToday(index),
    })),
  );
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
