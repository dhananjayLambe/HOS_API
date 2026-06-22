"use client";

import { AlertCircle } from "lucide-react";
import { DoctorConsultationMix, type ConsultationMix } from "@/components/doctor/doctor-consultation-mix";
import { DoctorPracticeOverviewMetrics, type PracticeMetrics } from "@/components/doctor/doctor-practice-overview-metrics";
import { DoctorPracticeSummary, type PracticeSummary } from "@/components/doctor/doctor-practice-summary";
import { DoctorRecentTrends, type RecentTrendRow } from "@/components/doctor/doctor-recent-trends";
import { Button } from "@/components/ui/button";

export type DoctorPracticeOverviewTabProps = {
  metrics: PracticeMetrics;
  consultationMix: ConsultationMix;
  summary: PracticeSummary;
  recentTrends: RecentTrendRow[];
  generatedAt?: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

function formatGeneratedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DoctorPracticeOverviewTab({
  metrics,
  consultationMix,
  summary,
  recentTrends,
  generatedAt,
  loading,
  error,
  onRetry,
}: DoctorPracticeOverviewTabProps) {
  const updatedLabel = formatGeneratedAt(generatedAt);

  return (
    <div className="space-y-4">
      {updatedLabel ? (
        <p className="text-xs text-muted-foreground">Updated {updatedLabel}</p>
      ) : null}
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={() => void onRetry()}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      <DoctorPracticeOverviewMetrics metrics={metrics} loading={loading} />
      <div className="grid gap-4 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <DoctorConsultationMix mix={consultationMix} loading={loading} />
        </div>
        <div className="lg:col-span-3">
          <DoctorPracticeSummary summary={summary} loading={loading} />
        </div>
      </div>
      <DoctorRecentTrends trends={recentTrends} loading={loading} />
    </div>
  );
}
