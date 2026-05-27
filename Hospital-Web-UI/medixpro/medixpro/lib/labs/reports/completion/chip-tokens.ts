import type { ReportChipStatus } from "@/lib/labs/reports/completion/order-lifecycle.types";

export const CHIP_STATUS_SORT: ReportChipStatus[] = [
  "failed_delivery",
  "failed_upload",
  "failed",
  "corrected",
  "pending",
  "rejected",
  "uploaded",
  "ready",
  "sent",
];

export const CHIP_STATUS_ICON: Record<ReportChipStatus, string> = {
  pending: "🟡",
  uploaded: "🟠",
  ready: "🔵",
  sent: "✅",
  failed: "🔴",
  failed_upload: "🔴",
  failed_delivery: "🔴",
  rejected: "🟡",
  corrected: "🟣",
};

export const CHIP_STATUS_CLASS: Record<ReportChipStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  uploaded: "border-orange-200 bg-orange-50 text-orange-900",
  ready: "border-blue-200 bg-blue-50 text-blue-900",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-900",
  failed: "border-red-200 bg-red-50 text-red-900",
  failed_upload: "border-red-200 bg-red-50 text-red-900",
  failed_delivery: "border-red-200 bg-red-50 text-red-900",
  rejected: "border-amber-200 bg-amber-50 text-amber-900",
  corrected: "border-violet-200 bg-violet-50 text-violet-900",
};
