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
    if (status === "ASSIGNED" || status === "COLLECTION_STARTED") return "progress";
    if (status === "RESCHEDULED") return "progress";
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
    if (status === "UNDER_REVIEW") return "progress";
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
  pending: "bg-[#F3F0FF] text-[#6D4FF5]",
  success: "bg-[#ECFDF3] text-[#027A48]",
  failed: "bg-[#FEF3F2] text-[#B42318]",
  progress: "bg-[#FFF7E8] text-[#B7791F]",
  neutral: "bg-[#F4F1FF] text-[#6B7280]",
};

const basePill = "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium leading-none";

export function LabStatusBadge({
  domain,
  status,
  className,
}: {
  domain: LabStatusDomain;
  status: string;
  className?: string;
}) {
  const label = labelForStatus(domain, status);
  const tone = toneFor(domain, status);
  return <span className={cn(basePill, domain === "order" ? ORDER_STATUS_TONE_CLASS[tone] : toneClass[tone], className)}>{label}</span>;
}
