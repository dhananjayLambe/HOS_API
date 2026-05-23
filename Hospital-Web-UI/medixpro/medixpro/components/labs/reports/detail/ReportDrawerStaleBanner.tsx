"use client";

import { Button } from "@/components/ui/button";

export function ReportDrawerStaleBanner({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
      <p className="font-medium">This report was updated elsewhere.</p>
      <p className="mt-0.5 text-xs text-amber-800">
        Refresh to load the latest active revision.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 h-8 border-amber-300 bg-white"
        onClick={onRefresh}
        disabled={refreshing}
      >
        Refresh report data
      </Button>
    </div>
  );
}
