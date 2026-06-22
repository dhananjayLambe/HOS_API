"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type PracticeSummary = {
  newPatients: number;
  returningPatients: number;
  activeTreatments: number;
  patientsUnderTreatment: number;
};

type SummaryRow = {
  key: keyof PracticeSummary;
  label: string;
  className?: string;
};

const SUMMARY_ROWS: SummaryRow[] = [
  { key: "newPatients", label: "New Patients", className: "text-blue-600 dark:text-blue-400" },
  { key: "returningPatients", label: "Returning Patients", className: "text-sky-600 dark:text-sky-400" },
  { key: "activeTreatments", label: "Active Treatments", className: "text-emerald-600 dark:text-emerald-400" },
  { key: "patientsUnderTreatment", label: "Patients Under Treatment", className: "text-violet-600 dark:text-violet-400" },
];

type DoctorPracticeSummaryProps = {
  summary: PracticeSummary;
  loading?: boolean;
};

export function DoctorPracticeSummary({ summary, loading }: DoctorPracticeSummaryProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Practice Summary</CardTitle>
        <CardDescription>Patient and treatment overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {SUMMARY_ROWS.map(({ key, label, className }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            {loading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <span className={cn("text-lg font-semibold tabular-nums", className)}>{summary[key]}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
