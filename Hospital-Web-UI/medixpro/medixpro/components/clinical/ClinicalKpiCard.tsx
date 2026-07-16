"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { kpiTintForQueue } from "@/lib/design-system/clinical";

type KpiQueue = "reports_ready" | "critical" | "awaiting";

type ClinicalKpiCardProps = {
  queue: KpiQueue;
  label: string;
  description?: string;
  count: number | string;
  icon: LucideIcon;
  active?: boolean;
  loading?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
};

export function ClinicalKpiCard({
  queue,
  label,
  description,
  count,
  icon: Icon,
  active,
  loading,
  compact,
  onClick,
  className,
}: ClinicalKpiCardProps) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        "w-full min-w-0 rounded-xl border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        kpiTintForQueue(queue),
        compact ? "p-2" : "p-3",
        active && "ring-1 ring-primary/25 shadow-sm",
        "hover:brightness-[0.985]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold text-[hsl(var(--clinical-text-primary))]",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {label}
          </p>
          {!compact && description ? (
            <p className="mt-0.5 text-xs text-[hsl(var(--clinical-text-secondary))]">
              {description}
            </p>
          ) : null}
        </div>
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--clinical-text-secondary))]",
            queue === "critical" && "text-[hsl(var(--clinical-accent-critical))]"
          )}
        />
      </div>
      <p
        className={cn(
          "font-semibold tracking-tight text-[hsl(var(--clinical-text-primary))]",
          compact ? "mt-1 text-lg" : "mt-2 text-2xl"
        )}
      >
        {loading ? "—" : count}
      </p>
    </button>
  );
}
