"use client";

import { formatDistanceToNow } from "date-fns";
import { ClinicalStatusBadge } from "@/components/clinical";
import type { WorkspaceReport } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { groupReportsByClinicalTimeline } from "@/lib/doctor/diagnostic-reports-workspace/group-reports-by-clinical-timeline";
import { resolveClinicalModality } from "@/lib/doctor/diagnostic-reports-workspace/clinical-modality";
import {
  rowHover,
  surfaceSection,
  typeMeta,
} from "@/lib/design-system/clinical";
import { cn } from "@/lib/utils";

type ClinicalReportsTimelineProps = {
  reports: WorkspaceReport[];
  loading?: boolean;
  selectedReportId?: string | null;
  onSelect: (report: WorkspaceReport) => void;
};

function relativeDate(report: WorkspaceReport): string {
  const iso = report.reportDate || report.uploadedAt || report.collectionDate;
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function readyLabel(status: WorkspaceReport["clinicalStatus"]): string {
  if (status === "AWAITING_REPORT") return "Pending";
  if (status === "UPDATED") return "Updated";
  return "Ready";
}

export function ClinicalReportsTimeline({
  reports,
  loading,
  selectedReportId,
  onSelect,
}: ClinicalReportsTimelineProps) {
  if (loading) {
    return (
      <div
        className={cn(
          surfaceSection,
          "p-6 text-center text-sm text-[hsl(var(--clinical-text-secondary))]"
        )}
      >
        Loading timeline…
      </div>
    );
  }

  const buckets = groupReportsByClinicalTimeline(reports);

  return (
    <div className="space-y-4">
      {buckets.map((bucket) => (
        <section key={bucket.id} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--clinical-text-meta))]">
            {bucket.label}
          </h3>
          <ul className="space-y-1.5">
            {bucket.reports.map((report) => {
              const modality = resolveClinicalModality(
                report.category,
                report.testName
              );
              const selected = selectedReportId === report.id;
              const awaiting = report.clinicalStatus === "AWAITING_REPORT";
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(report)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-lg border border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] px-3 py-2.5 text-left transition-colors",
                      rowHover,
                      selected &&
                        "border-primary/40 ring-1 ring-primary/30"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[hsl(var(--clinical-text-primary))]">
                          {report.testName}
                        </span>
                        <ClinicalStatusBadge
                          status={report.clinicalStatus}
                          label={readyLabel(report.clinicalStatus)}
                        />
                      </div>
                      <p className={cn(typeMeta, "mt-1 truncate")}>
                        {[
                          report.category ??
                            (modality
                              ? modality.charAt(0).toUpperCase() +
                                modality.slice(1)
                              : null),
                          report.labName,
                          relativeDate(report),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {awaiting ? (
                        <p className={cn(typeMeta, "mt-0.5 text-amber-800 dark:text-amber-200")}>
                          Awaiting lab results
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {awaiting ? "Details" : "Preview"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
