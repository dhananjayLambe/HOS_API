"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ReportInsightMetrics = {
  readyForReview: number;
  reviewedToday: number;
  pendingUpload: number;
  reportsReceivedToday: number;
};

type MetricChip = {
  key: keyof ReportInsightMetrics;
  label: string;
  className: string;
};

const METRIC_CHIPS: MetricChip[] = [
  {
    key: "readyForReview",
    label: "Ready For Review",
    className: "border-amber-100 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40",
  },
  {
    key: "reviewedToday",
    label: "Reviewed Today",
    className: "border-emerald-100 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40",
  },
  {
    key: "pendingUpload",
    label: "Pending Upload",
    className: "border-slate-200 bg-muted/50 dark:border-slate-800",
  },
  {
    key: "reportsReceivedToday",
    label: "Reports Received Today",
    className: "border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40",
  },
];

type DoctorReportInsightsProps = {
  insights: ReportInsightMetrics;
};

export function DoctorReportInsights({ insights }: DoctorReportInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Insights</CardTitle>
        <CardDescription>Current report workload</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {METRIC_CHIPS.map(({ key, label, className }) => (
            <div key={key} className={cn("rounded-lg border px-3 py-3", className)}>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{insights[key]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
