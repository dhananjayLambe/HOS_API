"use client";

import { Calendar, CheckCircle2, Circle, Users, XCircle, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ScheduleMetrics = {
  scheduled: number;
  completed: number;
  waiting: number;
  cancelled: number;
  noShow: number;
};

type MetricChip = {
  key: keyof ScheduleMetrics;
  label: string;
  icon: LucideIcon;
  className: string;
  iconClassName: string;
};

const METRIC_CHIPS: MetricChip[] = [
  {
    key: "scheduled",
    label: "Scheduled",
    icon: Calendar,
    className: "border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40",
    iconClassName: "text-blue-500 dark:text-blue-400",
  },
  {
    key: "waiting",
    label: "Waiting",
    icon: Users,
    className: "border-amber-100 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40",
    iconClassName: "text-amber-500 dark:text-amber-400",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    className: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40",
    iconClassName: "text-emerald-500 dark:text-emerald-400",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    className: "border-slate-200 bg-muted/40 dark:border-slate-800",
    iconClassName: "text-muted-foreground",
  },
  {
    key: "noShow",
    label: "No Show",
    icon: Circle,
    className: "border-slate-200 bg-muted/40 dark:border-slate-800",
    iconClassName: "text-muted-foreground",
  },
];

type DoctorScheduleMetricsStripProps = {
  metrics: ScheduleMetrics;
  loading?: boolean;
};

export function DoctorScheduleMetricsStrip({ metrics, loading }: DoctorScheduleMetricsStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {METRIC_CHIPS.map(({ key }) => (
          <Skeleton key={key} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {METRIC_CHIPS.map(({ key, label, icon: Icon, className, iconClassName }) => (
        <div
          key={key}
          className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2", className)}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} aria-hidden />
            <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <span className="text-xl font-bold tabular-nums tracking-tight">{metrics[key]}</span>
        </div>
      ))}
    </div>
  );
}
