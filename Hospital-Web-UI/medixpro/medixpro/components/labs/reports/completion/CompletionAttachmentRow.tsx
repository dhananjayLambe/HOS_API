"use client";

import { Button } from "@/components/ui/button";
import type { UploadFileItem } from "@/hooks/labs/useArtifactStaging";
import { cn } from "@/lib/utils";
import { Archive, ArrowDown, ArrowUp, FileImage, FileSpreadsheet, FileText, RefreshCw, Star, Trash2 } from "lucide-react";
import { useRef } from "react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileVisualKind = "pdf" | "image" | "spreadsheet" | "zip" | "text" | "other";

function fileVisualKind(name: string, mimeType: string): FileVisualKind {
  const lower = name.toLowerCase();
  const type = mimeType.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(lower)) return "image";
  if (
    type.includes("spreadsheet") ||
    type.includes("csv") ||
    type.includes("excel") ||
    /\.(csv|xlsx?|xls)$/i.test(lower)
  ) {
    return "spreadsheet";
  }
  if (type.includes("zip") || lower.endsWith(".zip")) return "zip";
  if (type.includes("text") || lower.endsWith(".txt")) return "text";
  return "other";
}

const KIND_LABEL: Record<FileVisualKind, string> = {
  pdf: "PDF",
  image: "Image",
  spreadsheet: "Sheet",
  zip: "ZIP",
  text: "TXT",
  other: "File",
};

const KIND_ICON = {
  pdf: FileText,
  image: FileImage,
  spreadsheet: FileSpreadsheet,
  zip: Archive,
  text: FileText,
  other: FileText,
} as const;

type CompletionAttachmentRowProps = {
  file: UploadFileItem;
  selected?: boolean;
  accept?: string;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSelect: () => void;
  onReplace: (file: File) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMakePrimary?: () => void;
};

export function CompletionAttachmentRow({
  file,
  selected,
  accept,
  canMoveUp,
  canMoveDown,
  onSelect,
  onReplace,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMakePrimary,
}: CompletionAttachmentRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const kind = fileVisualKind(file.name, file.type);
  const Icon = KIND_ICON[kind] ?? FileText;
  const artifactLabel =
    file.artifactType === "PRIMARY_REPORT"
      ? "Primary Report"
      : file.artifactType === "RAW_MACHINE_DATA"
        ? "Raw Machine Data"
        : "Supporting File";

  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5",
        selected ? "border-[#7C5CFC] bg-[#F4F1FF]" : "border-[#F0EFFF] bg-white",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          kind === "pdf" && "text-red-500",
          kind === "image" && "text-sky-600",
          kind === "spreadsheet" && "text-emerald-600",
          kind === "zip" && "text-amber-600",
          kind === "text" && "text-[#6B7280]",
          kind === "other" && "text-[#6B7280]",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-[#111827]">{file.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-[#6B7280]">
          <span>{formatSize(file.size)}</span>
          <span aria-hidden>·</span>
          <span>{artifactLabel}</span>
          {file.isPrimary ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-[#F4F1FF] px-1 py-0.5 font-semibold text-[#5B3FD9]">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              Primary
            </span>
          ) : null}
        </span>
      </span>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(event) => {
          const replacement = event.target.files?.[0];
          if (replacement) onReplace(replacement);
          event.target.value = "";
        }}
      />
      <span className="shrink-0 rounded bg-[#F0EFFF] px-1 py-0.5 text-[9px] font-medium uppercase text-[#6B7280]">
        {KIND_LABEL[kind] ?? "File"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-[10px] text-[#5B3FD9]"
        onClick={onSelect}
      >
        Preview
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-[10px] text-[#5B3FD9]"
        onClick={() => inputRef.current?.click()}
      >
        <RefreshCw className="mr-1 h-3.5 w-3.5" />
        Replace
      </Button>
      {!file.isPrimary && onMakePrimary ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px] text-[#5B3FD9]"
          onClick={onMakePrimary}
        >
          Make Primary
        </Button>
      ) : null}
      {onMoveUp ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-1.5 text-[10px] text-[#6B7280]"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label={`Move ${file.name} up`}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onMoveDown ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-1.5 text-[10px] text-[#6B7280]"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label={`Move ${file.name} down`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-[10px] text-red-600"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Remove
      </Button>
    </li>
  );
}
