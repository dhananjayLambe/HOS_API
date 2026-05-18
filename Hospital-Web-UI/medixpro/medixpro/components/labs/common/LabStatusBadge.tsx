"use client";

import { cn } from "@/lib/utils";
import type { LabStatusDomain } from "@/lib/labs/constants/status";
import { labelForStatus } from "@/lib/labs/constants/status";
import { orderStatusTone, ORDER_STATUS_TONE_CLASS } from "@/lib/labs/orders/order-status-tone";

type Tone = "pending" | "success" | "failed" | "progress" | "neutral";

function toneFor(domain: LabStatusDomain, status: string): Tone {
  if (domain === "order") {
    return orderStatusTone(status);
  }
  if (domain === "collection") {
    if (status === "COLLECTED") return "success";
    if (status === "FAILED" || status === "CANCELLED") return "failed";
    if (status === "ASSIGNED" || status === "IN_PROGRESS") return "progress";
    return "pending";
  }
  if (domain === "appointment") {
    if (status === "COMPLETED") return "success";
    if (status === "NO_SHOW" || status === "CANCELLED") return "failed";
    if (status === "CHECKED_IN" || status === "CONFIRMED") return "progress";
    return "pending";
  }
  if (domain === "sample") {
    if (status === "COMPLETED") return "success";
    if (status === "REJECTED") return "failed";
    if (status === "PROCESSING" || status === "RECEIVED") return "progress";
    return "pending";
  }
  if (domain === "report") {
    if (status === "APPROVED" || status === "DELIVERED") return "success";
    if (status === "FAILED") return "failed";
    if (status === "UNDER_REVIEW" || status === "PENDING_UPLOAD") return "pending";
    return "pending";
  }
  if (domain === "delivery") {
    if (status === "DELIVERED" || status === "VIEWED") return "success";
    if (status === "FAILED") return "failed";
    if (status === "SENT") return "progress";
    return "pending";
  }
  return "neutral";
}

const toneClass: Record<Tone, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  failed: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  progress: "bg-blue-50 text-blue-800 ring-1 ring-blue-200/80",
  neutral: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80",
};

const basePill = "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium leading-none";

export function LabStatusBadge({
  domain,
  status,
  label: labelOverride,
  className,
}: {
  domain: LabStatusDomain;
  status: string;
  /** Operational display label (e.g. PENDING → Scheduled for appointments). */
  label?: string;
  className?: string;
}) {
  const label = labelOverride ?? labelForStatus(domain, status);
  const tone = toneFor(domain, status);
  return <span className={cn(basePill, domain === "order" ? ORDER_STATUS_TONE_CLASS[tone] : toneClass[tone], className)}>{label}</span>;
}
