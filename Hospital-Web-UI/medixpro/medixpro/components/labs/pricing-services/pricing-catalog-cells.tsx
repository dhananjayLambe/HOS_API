"use client";

import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export function PricingCategoryChip({ name }: { name: string }) {
  if (!name) return <span className="text-sm text-[#9CA3AF]">—</span>;
  return (
    <span className="inline-flex max-w-[140px] truncate rounded-md border border-[#ECEBFF] bg-[#FAF9FF] px-2 py-0.5 text-[11px] font-medium text-[#5B4B8A]">
      {name}
    </span>
  );
}

export function PricingTatChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#E0DCF7] bg-[#F4F1FF] px-2 py-0.5 text-xs font-semibold text-[#4B5563]">
      <Clock className="h-3 w-3 text-[#6D4FF5]" aria-hidden strokeWidth={2.25} />
      {label}
    </span>
  );
}

type CatalogPrimaryCellProps = {
  primary: string;
  secondary: string;
  tertiary?: string;
};

export function CatalogPrimaryCell({ primary, secondary, tertiary }: CatalogPrimaryCellProps) {
  return (
    <div className="min-w-[160px] py-0.5">
      <p className="text-sm font-semibold leading-snug text-[#111827]">{primary}</p>
      <p className="mt-0.5 font-mono text-[11px] font-medium tracking-wide text-[#6B7280]">{secondary}</p>
      {tertiary ? (
        <p className={cn("mt-0.5 text-[11px] leading-tight text-[#9CA3AF]")}>{tertiary}</p>
      ) : null}
    </div>
  );
}
