"use client";

import { ReportDrawerStaleBanner } from "@/components/labs/reports/detail/ReportDrawerStaleBanner";
import { reportSectionBox, reportSectionTitle } from "@/components/labs/reports/detail/report-detail-styles";
import { formatReportTimestamp } from "@/lib/labs/reports/format-report-timestamp";
import { mapLifecycleStatusToOperational } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import { reportStatusBadgeClassName } from "@/lib/labs/reports/report-status-badge-tone";
import type { ReportDrawerActions } from "@/components/labs/orders/OrderDetailSheet";
import type { ReportOrderDrawerPanel } from "@/hooks/labs/useReportOrderDrawer";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function ReportSkeletonBlock() {
  return (
    <div className={reportSectionBox}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-3/4" />
    </div>
  );
}

export function ReportDrawerSections({
  panel,
  onRefreshLineage,
  refreshingLineage,
  reportActions,
}: {
  panel: ReportOrderDrawerPanel;
  onRefreshLineage?: () => void;
  refreshingLineage?: boolean;
  reportActions?: ReportDrawerActions;
}) {
  const { context, detail, history, loading, lineageStale, task, primaryReportId } = panel;

  if (loading.report && !context && !detail) {
    return (
      <div className="space-y-3">
        <p className={reportSectionTitle}>Report workflow</p>
        <ReportSkeletonBlock />
        <ReportSkeletonBlock />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className={reportSectionTitle}>Report workflow</p>

      {lineageStale && onRefreshLineage ? (
        <ReportDrawerStaleBanner onRefresh={onRefreshLineage} refreshing={refreshingLineage} />
      ) : null}

      {panel.reportError && !context ? (
        <p className="text-sm text-red-600">{panel.reportError}</p>
      ) : null}

      {context && context.activeReports.length > 0 ? (
        <div className={reportSectionBox}>
          <h4 className="text-xs font-medium text-[#6B7280]">Test lines</h4>
          <ul className="mt-2 space-y-2">
            {context.activeReports.map((line) => (
              <li
                key={line.reportId}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-[#374151]">{line.testLabel}</span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    reportStatusBadgeClassName(mapLifecycleStatusToOperational(line.status)),
                  )}
                >
                  {line.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail && detail.artifacts.length > 0 ? (
        <div className={reportSectionBox}>
          <h4 className="text-xs font-medium text-[#6B7280]">Artifacts</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-[#374151]">
            {detail.artifacts.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span>
                  {a.originalFilename}
                  {a.isPrimary ? (
                    <span className="ml-1 text-[10px] font-semibold text-[#7C5CFC]">PRIMARY</span>
                  ) : null}
                  {a.version > 1 ? (
                    <span className="ml-1 text-[10px] font-semibold text-violet-700">
                      v{a.version}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-[#6B7280]">
                  {formatReportTimestamp(a.uploadedAt, "")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : detail ? (
        <p className="text-xs text-[#6B7280]">No files uploaded yet.</p>
      ) : null}

      {detail?.delivery ? (
        <div className={reportSectionBox}>
          <h4 className="text-xs font-medium text-[#6B7280]">Latest delivery</h4>
          <p className="mt-1 text-sm text-[#374151]">
            Status: <span className="font-medium">{detail.delivery.status}</span>
            <span className="block text-xs text-[#6B7280]">
              Method: WhatsApp
            </span>
            {detail.delivery.failureReason ? (
              <span className="block text-xs text-red-600">{detail.delivery.failureReason}</span>
            ) : null}
          </p>
        </div>
      ) : null}

      {(detail?.history.supersedesId ||
        detail?.history.supersededById ||
        history?.supersedesId ||
        history?.supersededById) && (
        <div className={reportSectionBox}>
          <h4 className="text-xs font-medium text-[#6B7280]">Version history</h4>
          <div className="mt-1 space-y-1 text-xs text-[#6B7280]">
            {history?.artifacts.length ? (
              <ul className="space-y-1">
                {history.artifacts.map((artifact) => (
                  <li key={artifact.id}>
                    Version {artifact.version}
                    {artifact.version === detail?.revisionNumber ? " - Latest" : ""}
                    {" - "}
                    {artifact.originalFilename}
                  </li>
                ))}
              </ul>
            ) : null}
            {detail?.revisionNumber && detail.revisionNumber > 1 ? (
              <p>
                <span className="font-semibold text-violet-700">Updated Version</span>
                {" · "}
                v{detail.revisionNumber} latest
              </p>
            ) : null}
            {(detail?.history.supersededById ?? history?.supersededById) ? (
              <p>A newer updated version is available.</p>
            ) : null}
          </div>
        </div>
      )}

      {detail && reportActions ? (
        <div className="flex flex-wrap gap-2">
          {detail.availableActions.includes("MARK_READY") && reportActions.onMarkReady && primaryReportId ? (
            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!!reportActions.actionLoading}
              onClick={() => reportActions.onMarkReady?.(primaryReportId)}
            >
              Mark ready
            </Button>
          ) : null}
          {detail.availableActions.includes("UPLOAD_REPORT") && reportActions.onUpload ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!!reportActions.actionLoading}
              onClick={() => reportActions.onUpload?.(task.taskId)}
            >
              Upload report
            </Button>
          ) : null}
          {detail.delivery?.status === "FAILED" &&
          reportActions.onRetryDelivery &&
          task.actionTargets.retryDeliveryLogId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!!reportActions.actionLoading}
              onClick={() =>
                reportActions.onRetryDelivery?.(
                  task.actionTargets.retryDeliveryLogId!,
                  primaryReportId ?? undefined,
                )
              }
            >
              Retry delivery
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
