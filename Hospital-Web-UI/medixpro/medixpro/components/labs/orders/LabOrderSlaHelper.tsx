"use client";

import { minutesUntilSlaDeadline } from "@/lib/labs/orders/sla-countdown";
import type { LabOrderRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

type LabOrderSlaHelperProps = {
  order: LabOrderRow;
  className?: string;
};

/**
 * Subtle SLA reminder for PENDING assignments — static until parent re-renders (e.g. queue poll).
 * No flash, pulse, or live second-by-second countdown.
 */
export function LabOrderSlaHelper({ order, className }: LabOrderSlaHelperProps) {
  if (order.status !== "PENDING") return null;

  const minutes = minutesUntilSlaDeadline(order.assignedAtIso);
  if (minutes === null || minutes <= 0) return null;

  return (
    <p
      className={cn(
        "text-[11px] font-normal leading-snug tracking-normal text-[#9CA3AF]",
        className,
      )}
      aria-live="polite"
    >
      Accept within {minutes} minute{minutes === 1 ? "" : "s"}
    </p>
  );
}
