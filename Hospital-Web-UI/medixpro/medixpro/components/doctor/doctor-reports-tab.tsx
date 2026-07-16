"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { DoctorRecentReportActivity, type ReportActivityItem } from "@/components/doctor/doctor-recent-report-activity";
import { DoctorReportInsights, type ReportInsightMetrics } from "@/components/doctor/doctor-report-insights";
import { DoctorReportsTable, type DoctorReportRow } from "@/components/doctor/doctor-reports-table";
import { Button } from "@/components/ui/button";
import type { DoctorReportsPageSize } from "@/lib/api/doctor-reports-dashboard";

export type DoctorReportsTabProps = {
  reports: DoctorReportRow[];
  insights: ReportInsightMetrics;
  activity: ReportActivityItem[];
  loading?: boolean;
  isRefreshing?: boolean;
  downloadingReportId?: string | null;
  error?: string | null;
  page?: number;
  pageSize?: DoctorReportsPageSize;
  totalCount?: number;
  pageSizeOptions?: readonly DoctorReportsPageSize[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: DoctorReportsPageSize) => void;
  onRetry?: () => void;
  onOpenPatient?: (report: DoctorReportRow) => void;
  onOpenReport?: (report: DoctorReportRow) => void;
  onDownloadReport?: (report: DoctorReportRow) => void;
};

export function DoctorReportsTab({
  reports,
  insights,
  activity,
  loading,
  isRefreshing,
  downloadingReportId,
  error,
  page,
  pageSize,
  totalCount,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onOpenPatient,
  onOpenReport,
  onDownloadReport,
}: DoctorReportsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Diagnostic Reports Workspace</p>
          <p className="text-xs text-muted-foreground">
            Find, preview, and download diagnostic reports.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/lab-tests-reports?queue=needs_review">
            Open workspace
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <DoctorReportsTable
            reports={reports}
            loading={loading}
            isRefreshing={isRefreshing}
            downloadingReportId={downloadingReportId}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            pageSizeOptions={pageSizeOptions}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onOpenPatient={onOpenPatient}
            onOpenReport={onOpenReport}
            onDownloadReport={onDownloadReport}
          />
        </div>
        <div className="space-y-4 lg:col-span-3">
          <DoctorReportInsights insights={insights} loading={loading} />
          <DoctorRecentReportActivity activity={activity} loading={loading} />
        </div>
      </div>
    </div>
  );
}
