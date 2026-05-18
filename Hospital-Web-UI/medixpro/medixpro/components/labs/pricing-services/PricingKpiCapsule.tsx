"use client";

import { labTw } from "@/styles/lab-design-system";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type PricingKpiCapsuleProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

/** Clickable KPI pill — filters catalog when selected. */
export function PricingKpiCapsule({
  label,
  value,
  icon: Icon,
  hint,
  selected,
  onClick,
  className,
}: PricingKpiCapsuleProps) {
  return (
    <button
      type="button"
      title={hint}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]/40 focus-visible:ring-offset-2",
        selected
          ? "border-[#7C5CFC] bg-[#F3F0FF] shadow-md ring-2 ring-[#7C5CFC]/25"
          : "border-[#E5E1F8] bg-white shadow-sm hover:border-[#C4B8F5] hover:bg-[#FAF9FF]",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-[#7C5CFC] text-white" : cn("text-[#7C5CFC]", labTw.bgIconTile),
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      <span
        className={cn(
          "truncate text-xs font-semibold",
          selected ? "text-[#5B21B6]" : "text-[#6B7280]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 text-lg font-bold leading-none tabular-nums",
          selected ? "text-[#5B21B6]" : "text-[#111827]",
        )}
      >
        {value}
      </span>
    </button>
  );
}
