"use client";

import { FileText, Clock3, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  tintAvailable,
  tintAwaiting,
  tintCritical,
  typeMeta,
} from "@/lib/design-system/clinical";

export type ClinicalReportsSummaryModel = {
  reportsReady: number;
  pending: number;
  critical: number;
  latestTestName: string | null;
  latestReportAt: string | null;
  lastConsultationLabel: string | null;
  lastVisitAt: string | null;
};

type ClinicalReportsSummaryProps = {
  summary: ClinicalReportsSummaryModel;
  loading?: boolean;
  className?: string;
};

function relativeOrDash(iso: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function ClinicalReportsSummary({
  summary,
  loading,
  className,
}: ClinicalReportsSummaryProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] px-4 py-3 text-sm text-[hsl(var(--clinical-text-secondary))]",
          className
        )}
      >
        Loading patient report summary…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] px-4 py-3",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div
          className={cn(
            "rounded-lg border px-3 py-2",
            tintAvailable
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[hsl(var(--clinical-text-meta))]">
            <FileText className="h-3.5 w-3.5" />
            Reports Ready
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--clinical-text-primary))]">
            {summary.reportsReady}
          </p>
        </div>
        <div className={cn("rounded-lg border px-3 py-2", tintAwaiting)}>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[hsl(var(--clinical-text-meta))]">
            <Clock3 className="h-3.5 w-3.5" />
            Pending
          </div>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--clinical-text-primary))]">
            {summary.pending}
          </p>
        </div>
        {summary.critical > 0 ? (
          <div className={cn("rounded-lg border px-3 py-2", tintCritical)}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[hsl(var(--clinical-text-meta))]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Critical
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums text-[hsl(var(--clinical-text-primary))]">
              {summary.critical}
            </p>
          </div>
        ) : null}
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className={typeMeta}>Latest report</dt>
          <dd className="mt-0.5 text-sm font-medium text-[hsl(var(--clinical-text-primary))]">
            {summary.latestTestName ?? "—"}
          </dd>
          <dd className={cn(typeMeta, "mt-0.5")}>
            {relativeOrDash(summary.latestReportAt)}
          </dd>
        </div>
        <div>
          <dt className={typeMeta}>Last consultation</dt>
          <dd className="mt-0.5 text-sm font-medium text-[hsl(var(--clinical-text-primary))]">
            {summary.lastConsultationLabel ?? "—"}
          </dd>
          <dd className={cn(typeMeta, "mt-0.5")}>
            {relativeOrDash(summary.lastVisitAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
