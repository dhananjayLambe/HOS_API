"use client";

import { Button } from "@/components/ui/button";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import type { ExistingReportItem } from "@/lib/labs/reports/existing-reports";
import { cn } from "@/lib/utils";
import { FileUp, Star, Trash2 } from "lucide-react";
import { useRef } from "react";
import { ExistingReportsSection } from "./ExistingReportsSection";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileUploadStepProps = {
  taskLabel?: string;
  files: UploadFileItem[];
  primaryFileId: string | null;
  accept: string;
  existingReports: ExistingReportItem[];
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
};

export function FileUploadStep({
  taskLabel,
  files,
  primaryFileId,
  accept,
  existingReports,
  onAddFiles,
  onRemove,
  onSetPrimary,
}: FileUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {taskLabel ? (
        <p className="text-xs text-[#6B7280]">
          Attach report files for{" "}
          <span className="font-medium text-[#111827]">{taskLabel}</span>
        </p>
      ) : null}

      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D4CCFF] bg-[#FAFAFF] px-4 py-6 text-center",
          "hover:border-[#7C5CFC]/50 hover:bg-[#F8F7FF]",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files);
        }}
      >
        <FileUp className="mb-1.5 h-7 w-7 text-[#7C5CFC]" aria-hidden />
        <p className="text-sm font-medium text-[#111827]">Drag & drop report files</p>
        <p className="mt-0.5 text-xs text-[#6B7280]">or</p>
        <Button type="button" variant="outline" size="sm" className="mt-1.5 h-8" onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="mt-1.5 text-[10px] text-[#9CA3AF]">PDF, JPG, PNG, CSV, XLSX, TXT, ZIP</p>
      </div>

      {files.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-[#ECEBFF] bg-white p-1.5">
          {files.map((f) => {
            const isPrimary = f.id === primaryFileId;
            return (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1 hover:bg-[#FAFAFF]"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#111827]">✓ {f.name}</span>
                <span className="text-[10px] text-[#9CA3AF]">{formatSize(f.size)}</span>
                {isPrimary ? (
                  <span className="rounded bg-[#4A2DB8] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    Primary
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => onSetPrimary(f.id)}
                  >
                    <Star className="mr-0.5 h-3 w-3" aria-hidden />
                    Primary
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600"
                  onClick={() => onRemove(f.id)}
                  aria-label={`Remove ${f.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ExistingReportsSection items={existingReports} />
    </div>
  );
}
