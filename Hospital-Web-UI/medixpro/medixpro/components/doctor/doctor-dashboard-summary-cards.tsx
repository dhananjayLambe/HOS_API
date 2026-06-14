"use client";

import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DoctorDashboardMetricAccent = "blue" | "orange" | "green" | "purple";

export type DoctorDashboardMetric = {
  title: string;
  value: number;
  supportingText: string;
  icon: LucideIcon;
  accent: DoctorDashboardMetricAccent;
  loading?: boolean;
};

const accentStyles: Record<
  DoctorDashboardMetricAccent,
  { border: string; cardBg: string; iconText: string; shadow?: string }
> = {
  blue: {
    border: "border-blue-100 dark:border-blue-900/50",
    cardBg: "bg-blue-50/80 dark:bg-blue-950/25",
    iconText: "text-blue-400 dark:text-blue-500",
  },
  orange: {
    border: "border-orange-200 dark:border-orange-900/50",
    cardBg: "bg-orange-50 dark:bg-orange-950/30",
    iconText: "text-orange-400 dark:text-orange-500",
    shadow: "shadow-sm shadow-orange-100/50 dark:shadow-none",
  },
  green: {
    border: "border-emerald-100 dark:border-emerald-900/50",
    cardBg: "bg-emerald-50/80 dark:bg-emerald-950/25",
    iconText: "text-emerald-400 dark:text-emerald-500",
  },
  purple: {
    border: "border-violet-100 dark:border-violet-900/50",
    cardBg: "bg-violet-50/80 dark:bg-violet-950/25",
    iconText: "text-violet-400 dark:text-violet-500",
  },
};

type DoctorDashboardSummaryCardsProps = {
  metrics: DoctorDashboardMetric[];
};

export function DoctorDashboardSummaryCards({ metrics }: DoctorDashboardSummaryCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const styles = accentStyles[metric.accent];
        const Icon = metric.icon;
        const isPrimary = metric.accent === "orange";

        return (
          <div
            key={metric.title}
            className={cn(
              "relative min-h-[132px] rounded-xl border p-6 shadow-sm transition-all hover:shadow-md",
              styles.border,
              styles.cardBg,
              styles.shadow,
              isPrimary && "ring-1 ring-orange-100 dark:ring-orange-900/30"
            )}
          >
            <Icon className={cn("absolute right-5 top-5 h-5 w-5 opacity-50", styles.iconText)} aria-hidden />
            <p className="pr-8 text-sm font-medium text-foreground/90">{metric.title}</p>
            {metric.loading ? (
              <Skeleton className="mt-3 h-10 w-16" />
            ) : (
              <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {metric.value}
              </p>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">{metric.supportingText}</p>
          </div>
        );
      })}
    </div>
  );
}
