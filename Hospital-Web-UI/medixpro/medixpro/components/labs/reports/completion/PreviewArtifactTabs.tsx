"use client";

import type { ReportArtifactViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";

export function PreviewArtifactTabs({
  artifacts,
  selectedArtifactId,
  onSelect,
}: {
  artifacts: ReportArtifactViewModel[];
  selectedArtifactId?: string;
  onSelect: (artifactId: string) => void;
}) {
  if (artifacts.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Files</p>
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Report files">
        {artifacts.map((artifact) => {
          const selected = artifact.id === selectedArtifactId;
          return (
            <button
              key={artifact.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "max-w-[180px] shrink-0 truncate rounded-full border px-2.5 py-1 text-xs font-semibold",
                selected
                  ? "border-[#7C5CFC] bg-[#F4F1FF] text-[#5B3FD8]"
                  : "border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]",
              )}
              onClick={() => onSelect(artifact.id)}
            >
              {artifact.fileName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
