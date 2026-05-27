"use client";

import type { TatState } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";

export type TatUrgencyIndicatorProps = {
  tatState: TatState;
  tatLabel: string;
  className?: string;
};

export function TatUrgencyIndicator({ tatState, tatLabel, className }: TatUrgencyIndicatorProps) {
  return (
    <span
      className={cn(
        "shrink-0 text-xs font-medium",
        tatState === "safe" && "text-[#6B7280]",
        tatState === "near_breach" && "text-amber-700",
        tatState === "breached" && "text-red-700",
        className,
      )}
    >
      {tatState === "near_breach" ? "⚠ " : null}
      {tatState === "breached" ? (
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" aria-hidden />
          {tatLabel}
        </span>
      ) : (
        tatLabel
      )}
    </span>
  );
}
