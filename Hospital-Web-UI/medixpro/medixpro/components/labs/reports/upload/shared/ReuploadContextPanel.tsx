"use client";

import { Button } from "@/components/ui/button";
import type { ReportArtifact } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import { Check, Loader2 } from "lucide-react";

type ReuploadContextPanelProps = {
  artifacts: ReportArtifact[];
  loading?: boolean;
  onPreviewCurrent?: () => void;
};

function preferredArtifact(artifacts: ReportArtifact[]): ReportArtifact | null {
  return artifacts.find((a) => a.isPrimary) ?? artifacts[0] ?? null;
}

export function ReuploadContextPanel({
  artifacts,
  loading,
  onPreviewCurrent,
}: ReuploadContextPanelProps) {
  const current = preferredArtifact(artifacts);

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        Current Report
      </p>
      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#E5E7EB] px-3 py-2 text-xs text-[#6B7280]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading current report…
        </div>
      ) : artifacts.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/50 p-1.5">
          {artifacts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs text-[#374151]"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{a.originalFilename}</span>
              {a.id === current?.id && onPreviewCurrent && a.downloadUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-[10px] text-[#5B3FD9]"
                  onClick={onPreviewCurrent}
                >
                  Preview Current
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-[#E5E7EB] px-3 py-2 text-xs text-[#6B7280]">
          No active report file on record yet.
        </p>
      )}
    </div>
  );
}
