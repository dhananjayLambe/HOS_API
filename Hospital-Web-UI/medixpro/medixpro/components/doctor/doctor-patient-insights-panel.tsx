"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PatientInsightMetrics = {
  patientsSeenToday: number;
  followUpDue: number;
  treatmentOngoing: number;
};

type MetricRow = {
  label: string;
  value: number | null;
  placeholder?: string;
  className?: string;
};

type DoctorPatientInsightsPanelProps = {
  insights: PatientInsightMetrics;
};

export function DoctorPatientInsightsPanel({ insights }: DoctorPatientInsightsPanelProps) {
  const metricRows: MetricRow[] = [
    {
      label: "Patients Seen Today",
      value: insights.patientsSeenToday,
      className: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Follow-up Due",
      value: insights.followUpDue,
      className: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Treatment Ongoing",
      value: insights.treatmentOngoing,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending Reports",
      value: null,
      placeholder: "Coming Soon",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Insights</CardTitle>
        <CardDescription>Summary of your patient relationships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {metricRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            {row.placeholder ? (
              <span className="text-xs font-medium text-muted-foreground">{row.placeholder}</span>
            ) : (
              <span className={cn("text-lg font-semibold tabular-nums", row.className)}>{row.value}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
