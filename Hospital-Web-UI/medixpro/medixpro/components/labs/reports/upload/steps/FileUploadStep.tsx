"use client";

import { OrderReportsChecklist } from "@/components/labs/reports/upload/shared/OrderReportsChecklist";
import { UploadAttachmentRow } from "@/components/labs/reports/upload/shared/UploadAttachmentRow";
import { UploadDropzone } from "@/components/labs/reports/upload/shared/UploadDropzone";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import type { UploadFileRejection } from "@/lib/labs/reports/upload/upload-file-validation";
import {
  rejectionReasonLabel,
  rejectionReasonMessage,
} from "@/lib/labs/reports/upload/upload-file-validation";
import type { UploadTaskContext } from "@/lib/labs/reports/upload/upload-task-context-adapter";
import { AlertCircle, X } from "lucide-react";

type FileUploadStepProps = {
  task: UploadTaskContext;
  files: UploadFileItem[];
  primaryFileId: string | null;
  accept: string;
  showDraftReselectBanner?: boolean;
  onDismissDraftBanner?: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
  showFileRequiredError?: boolean;
  fileRejections?: UploadFileRejection[];
  onDismissRejections?: () => void;
  submitting?: boolean;
};

export function FileUploadStep({
  task,
  files,
  primaryFileId,
  accept,
  showDraftReselectBanner,
  onDismissDraftBanner,
  onAddFiles,
  onRemove,
  onSetPrimary,
  showFileRequiredError = false,
  fileRejections = [],
  onDismissRejections,
  submitting = false,
}: FileUploadStepProps) {
  return (
    <div className="space-y-2">
      {task.reportLines.length > 1 ? (
        <OrderReportsChecklist lines={task.reportLines} progress={task.uploadProgress} />
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

      {showFileRequiredError ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          Select at least one report file.
        </p>
      ) : null}

      {fileRejections.length > 0 ? (
        <div
          className="rounded-md border border-amber-200/80 bg-amber-50/60 px-2.5 py-2 text-xs text-amber-900"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">Some files could not be added:</p>
            {onDismissRejections ? (
              <button
                type="button"
                className="shrink-0 text-[#6B7280] hover:text-[#111827]"
                aria-label="Dismiss file errors"
                onClick={onDismissRejections}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <ul className="mt-1 space-y-0.5">
            {fileRejections.map((r) => (
              <li key={`${r.name}-${r.reason}`}>
                <span className="font-medium">{r.name}</span>
                {" — "}
                {rejectionReasonMessage(r.reason)} ({rejectionReasonLabel(r.reason)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitting ? (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#ECEBFF]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[#7C5CFC]" />
        </div>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/50 p-1.5">
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
    </div>
  );
}
