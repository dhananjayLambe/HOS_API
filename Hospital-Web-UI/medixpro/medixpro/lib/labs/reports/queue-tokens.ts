import type { CollectionType } from "@/lib/labs/constants/collection-type";
import type { ReportOperationalStatus, ReportTabKey } from "@/lib/labs/reports/report-operational-status";
import type { UrgencyLevel } from "@/lib/labs/constants/urgency";
import { cn } from "@/lib/utils";

export const queueStatusTokens: Record<
  ReportOperationalStatus,
  { border: string; bg: string; badge: string }
> = {
  PENDING_UPLOAD: {
    border: "border-l-[3px] border-l-amber-500",
    bg: "bg-amber-50/50",
    badge: "bg-amber-100 text-amber-950 ring-1 ring-amber-400/90 font-semibold",
  },
  UPLOADED: {
    border: "border-l-[3px] border-l-blue-500",
    bg: "bg-blue-50/35",
    badge: "bg-blue-100 text-blue-950 ring-1 ring-blue-400/90 font-semibold",
  },
  READY_DELIVERY: {
    border: "border-l-[3px] border-l-emerald-500",
    bg: "bg-emerald-50/45",
    badge: "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-500/90 font-semibold",
  },
  DELIVERED: {
    border: "border-l-[3px] border-l-[#C4B5FD]",
    bg: "bg-white",
    badge: "bg-indigo-100 text-indigo-950 ring-1 ring-indigo-400/90 font-semibold",
  },
  FAILED_DELIVERY: {
    border: "border-l-[3px] border-l-red-500",
    bg: "bg-white",
    badge: "bg-red-100 text-red-950 ring-1 ring-red-400/90 font-semibold",
  },
};

export const urgencyTokens: Record<UrgencyLevel, { label: string; className: string }> = {
  STAT: { label: "STAT", className: "text-red-700 bg-red-50 border border-red-200" },
  URGENT: { label: "Urgent", className: "text-orange-700 bg-orange-50 border border-orange-200" },
  ROUTINE: { label: "", className: "" },
};

export const collectionTypeTokens: Record<CollectionType, string> = {
  HOME: "text-violet-800 bg-violet-50 border border-violet-200",
  VISIT: "text-slate-700 bg-slate-50 border border-slate-200",
};

export const groupChipTokens = {
  pending: "rounded-md bg-amber-200/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-950",
  completed: "rounded-md bg-emerald-200/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950",
};

export const progressLabelTextClassName = "text-[10px] font-medium text-[#6B7280]";

type KpiTabKey = Exclude<ReportTabKey, "all">;

export const kpiTabChipTokens: Record<
  KpiTabKey,
  { icon: string; activeRing: string; idleBorder: string }
> = {
  pending: {
    icon: "text-amber-600",
    activeRing: "border-[#7C5CFC] bg-[#F4F1FF] ring-1 ring-[#7C5CFC]/25",
    idleBorder: "border-[#ECEBFF] bg-white",
  },
  uploaded: {
    icon: "text-blue-600",
    activeRing: "border-[#7C5CFC] bg-[#F4F1FF] ring-1 ring-[#7C5CFC]/25",
    idleBorder: "border-[#ECEBFF] bg-white",
  },
  ready: {
    icon: "text-emerald-600",
    activeRing: "border-[#7C5CFC] bg-[#F4F1FF] ring-1 ring-[#7C5CFC]/25",
    idleBorder: "border-[#ECEBFF] bg-white",
  },
  delivered: {
    icon: "text-indigo-600",
    activeRing: "border-[#7C5CFC] bg-[#F4F1FF] ring-1 ring-[#7C5CFC]/25",
    idleBorder: "border-[#ECEBFF] bg-white",
  },
  failed: {
    icon: "text-red-600",
    activeRing: "border-[#7C5CFC] bg-[#F4F1FF] ring-1 ring-[#7C5CFC]/25",
    idleBorder: "border-[#ECEBFF] bg-white",
  },
};

export const kpiMetaFilterTokens = {
  urgent: {
    value: "text-orange-600",
    active: "bg-orange-600 text-white hover:bg-orange-700",
    idle: "border-orange-200 text-orange-800 hover:bg-orange-50",
  },
  tat: {
    value: "text-red-600",
    active: "bg-red-600 text-white hover:bg-red-700",
    idle: "border-red-200 text-red-800 hover:bg-red-50",
  },
};

export function urgencyBadgeClassName(urgency: UrgencyLevel): string | null {
  if (urgency === "ROUTINE") return null;
  return urgencyTokens[urgency]?.className ?? null;
}

export function collectionTypeBadgeClassName(type: CollectionType): string {
  return collectionTypeTokens[type] ?? collectionTypeTokens.HOME;
}

export function taskRowContainerClassName(status: ReportOperationalStatus): string {
  const t = queueStatusTokens[status] ?? queueStatusTokens.PENDING_UPLOAD;
  return cn("border", t.border, t.bg);
}

export function reportStatusBadgeClassName(status: ReportOperationalStatus): string {
  return queueStatusTokens[status]?.badge ?? queueStatusTokens.PENDING_UPLOAD.badge;
}

/** @deprecated Use taskRowContainerClassName */
export function taskRowToneClassName(status: ReportOperationalStatus): string {
  return taskRowContainerClassName(status);
}
