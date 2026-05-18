"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  Available: "bg-[#D1FAE5] text-[#065F46] ring-1 ring-[#6EE7B7]/50 font-semibold",
  Hidden: "bg-[#F3F4F6] text-[#6B7280] ring-1 ring-[#E5E7EB]",
  Inactive: "bg-[#E5E7EB] text-[#4B5563] ring-1 ring-[#D1D5DB]",
  Expired: "bg-[#FEF3C7] text-[#92400E] ring-1 ring-[#FCD34D]/60 font-semibold",
};

const basePill = "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none";

export function PricingCatalogBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const tone = STATUS_TONE[label] ?? "bg-[#F3F0FF] text-[#6D4FF5]";
  return <span className={cn(basePill, tone, className)}>{label}</span>;
}

export function PricingMutedChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-[#F4F1FF] px-2 py-0.5 text-xs font-medium text-[#6B7280]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PricingHomeCollectionBadge({ supported }: { supported: boolean }) {
  return (
    <PricingCatalogBadge
      label={supported ? "Enabled" : "Not supported"}
      className={supported ? undefined : "bg-[#F4F1FF] text-[#6B7280]"}
    />
  );
}

export function PricingExpiredChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#FFF7E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B7791F]">
      Expired
    </span>
  );
}
