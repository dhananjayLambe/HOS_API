"use client";

import { UploadAttachmentRow } from "@/components/labs/reports/upload/UploadAttachmentRow";
import { UploadDropzone } from "@/components/labs/reports/upload/UploadDropzone";
import { UploadExistingReports } from "@/components/labs/reports/upload/UploadExistingReports";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import type { UploadHistoricalReport } from "@/lib/labs/reports/upload/upload-task-context-adapter";
import { AlertCircle } from "lucide-react";

type FileUploadStepProps = {
  taskLabel?: string;
  files: UploadFileItem[];
  primaryFileId: string | null;
  accept: string;
  historicalReports: UploadHistoricalReport[];
  showDraftReselectBanner?: boolean;
  onDismissDraftBanner?: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
};

export function FileUploadStep({
  taskLabel,
  files,
  primaryFileId,
  accept,
  historicalReports,
  showDraftReselectBanner,
  onDismissDraftBanner,
  onAddFiles,
  onRemove,
  onSetPrimary,
}: FileUploadStepProps) {
  return (
    <div className="space-y-3">
      {taskLabel ? (
        <p className="text-xs text-[#6B7280]">
          Attach report files for{" "}
          <span className="font-medium text-[#111827]">{taskLabel}</span>
        </p>
      ) : null}

      {showDraftReselectBanner ? (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-2.5 py-2 text-xs text-amber-900"
          role="status"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Please reselect report files to continue.</p>
            <p className="mt-0.5 text-[10px] text-amber-800">
              Draft saved file names only — attachments must be chosen again on this device.
            </p>
          </div>
          {onDismissDraftBanner ? (
            <button
              type="button"
              className="shrink-0 text-[10px] font-medium underline"
              onClick={onDismissDraftBanner}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ) : null}

      <UploadDropzone accept={accept} onAddFiles={onAddFiles} />

      {files.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-[#ECEBFF] bg-[#FAFAFF]/50 p-1.5">
          {files.map((f) => (
            <UploadAttachmentRow
              key={f.id}
              file={f}
              isPrimary={f.id === primaryFileId}
              onSetPrimary={() => onSetPrimary(f.id)}
              onRemove={() => onRemove(f.id)}
            />
          ))}
        </ul>
      ) : null}

      <UploadExistingReports items={historicalReports} />
    </div>
  );
}
