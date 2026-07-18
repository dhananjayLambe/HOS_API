"use client";

import { FlaskConical, RefreshCw, TestTube2, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClinicalReportsEmptyStateProps = {
  patientId: string;
  filtered?: boolean;
  onOrderTests?: () => void;
  onRefresh?: () => void;
  className?: string;
};

/**
 * Clinical empty state for the CDS drawer — actionable, not operational.
 * Upload routes to patient summary labs (helpdesk/reception upload path), not doctor upload.
 */
export function ClinicalReportsEmptyState({
  patientId,
  filtered,
  onOrderTests,
  onRefresh,
  className,
}: ClinicalReportsEmptyStateProps) {
  const uploadHref = `/patients/${encodeURIComponent(patientId)}?tab=labs`;

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-accent-archived-soft))] px-6 py-10 text-center",
        className
      )}
    >
      <FlaskConical className="mx-auto mb-3 h-8 w-8 text-[hsl(var(--clinical-text-meta))]" />
      <p className="text-base font-semibold text-[hsl(var(--clinical-text-primary))]">
        No diagnostic reports available
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[hsl(var(--clinical-text-secondary))]">
        {filtered
          ? "No reports match your search or filters. Try clearing filters, or order new tests."
          : "This patient has no prior diagnostic reports on file yet."}
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--clinical-text-meta))]">
        Recommended actions
      </p>
      <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {onOrderTests ? (
          <Button type="button" size="sm" onClick={onOrderTests}>
            <TestTube2 className="mr-1.5 h-4 w-4" />
            Order diagnostic tests
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={uploadHref}>
            <Upload className="mr-1.5 h-4 w-4" />
            Upload external report
          </Link>
        </Button>
        {onRefresh ? (
          <Button type="button" size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        ) : null}
      </div>
    </div>
  );
}
