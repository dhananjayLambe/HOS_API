"use client";

import { Button } from "@/components/ui/button";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import { classifyFileKind } from "@/lib/labs/reports/upload/upload-primary-selection";
import { cn } from "@/lib/utils";
import { Circle, Trash2 } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_LABEL: Record<string, string> = {
  pdf: "PDF",
  image: "Image",
  spreadsheet: "Sheet",
  other: "File",
};

type UploadAttachmentRowProps = {
  file: UploadFileItem;
  isPrimary: boolean;
  onSetPrimary: () => void;
  onRemove: () => void;
};

export function UploadAttachmentRow({
  file,
  isPrimary,
  onSetPrimary,
  onRemove,
}: UploadAttachmentRowProps) {
  const kind = classifyFileKind(file.name, file.type);
  const hasFile = !!file.file;

  return (
    <li className="flex min-w-0 items-center gap-2 rounded-md border border-[#F0EFFF] bg-white px-2 py-1.5">
      <button
        type="button"
        className="flex shrink-0 items-center gap-1"
        onClick={onSetPrimary}
        aria-pressed={isPrimary}
        aria-label={isPrimary ? `${file.name} is primary report` : `Set ${file.name} as primary report`}
      >
        <Circle
          className={cn(
            "h-3.5 w-3.5",
            isPrimary ? "fill-[#4A2DB8] text-[#4A2DB8]" : "text-[#D4CCFF]",
          )}
          aria-hidden
        />
      </button>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#111827]">{file.name}</span>
      <span className="shrink-0 text-[10px] text-[#9CA3AF]">{formatSize(file.size)}</span>
      <span className="shrink-0 rounded bg-[#F0EFFF] px-1 py-0.5 text-[9px] font-medium uppercase text-[#6B7280]">
        {KIND_LABEL[kind] ?? "File"}
      </span>
      <span className="shrink-0 text-[9px] text-[#9CA3AF]">{hasFile ? "Ready" : "Reselect"}</span>
      {isPrimary ? (
        <span className="shrink-0 rounded bg-[#4A2DB8] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
          Primary report
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0 text-red-600"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
