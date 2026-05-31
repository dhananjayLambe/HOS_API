"use client";

import { CompletionArtifactPreview } from "@/components/labs/reports/completion/CompletionArtifactPreview";
import { CompletionAttachmentRow } from "@/components/labs/reports/completion/CompletionAttachmentRow";
import { NextActionLine } from "@/components/labs/reports/completion/NextActionLine";
import { ReportStatusChips } from "@/components/labs/reports/completion/ReportStatusChips";
import { TatUrgencyIndicator } from "@/components/labs/reports/completion/TatUrgencyIndicator";
import { UploadDropzone } from "@/components/labs/reports/upload/shared/UploadDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useArtifactStaging } from "@/hooks/labs/useArtifactStaging";
import type { StagedArtifactInput } from "@/lib/labs/reports/completion/completion-artifact-staging";
import type { OrderLifecycleViewModel, ReportArtifactViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { isPendingUpload, isReportSent } from "@/lib/labs/reports/completion/operational-contract";
import {
  rejectionReasonLabel,
  rejectionReasonMessage,
  UPLOAD_ACCEPT_ATTR,
} from "@/lib/labs/reports/upload/upload-file-validation";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type OrderUploadDrawerProps = {
  open: boolean;
  order: OrderLifecycleViewModel | null;
  mode?: "upload" | "reupload";
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (
    taskId: string,
    reportId: string,
    testLabel: string,
    artifacts: StagedArtifactInput[],
    options?: { mode?: "upload" | "reupload"; reuploadReason?: string },
  ) => void;
  initialReportId?: string | null;
  onPersistUpload?: (input: {
    taskId: string;
    reportId: string;
    files: File[];
    mode: "upload" | "reupload";
    reuploadReason?: string;
    hasExistingArtifact?: boolean;
  }) => Promise<void>;
  onPreviewCurrent?: (taskId: string, reportId: string) => void;
};

function uploadableReports(order: OrderLifecycleViewModel) {
  return order.reports.filter((report) => {
    if (report.availableActions?.some((action) => action.trim().toUpperCase() === "UPLOAD_REPORT")) {
      return true;
    }
    return isPendingUpload(report);
  });
}

function reuploadableReports(order: OrderLifecycleViewModel) {
  return order.reports.filter((report) => isReportSent(report) || report.artifacts.length > 0);
}

function preferredArtifact(artifacts: ReportArtifactViewModel[]): ReportArtifactViewModel | null {
  return artifacts.find((artifact) => artifact.patientVisible) ?? artifacts[0] ?? null;
}

const REUPLOAD_REASON_OPTIONS = [
  "Wrong file uploaded",
  "Signed PDF replacing unsigned report",
  "Report regenerated",
  "Typo / value update",
  "Doctor requested update",
  "Other",
] as const;

export function OrderUploadDrawer({
  open,
  order,
  mode = "upload",
  onOpenChange,
  onUploadComplete,
  initialReportId,
  onPersistUpload,
  onPreviewCurrent,
}: OrderUploadDrawerProps) {
  const staging = useArtifactStaging();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reuploadReasonChoice, setReuploadReasonChoice] = useState<string>("");
  const [reuploadReasonOther, setReuploadReasonOther] = useState("");
  const [uploading, setUploading] = useState(false);

  const reportsForDrawer = useMemo(
    () => (order ? (mode === "reupload" ? reuploadableReports(order) : uploadableReports(order)) : []),
    [mode, order],
  );

  const selectedReport = useMemo(() => {
    if (!order || !selectedReportId) return null;
    return order.reports.find((r) => r.reportId === selectedReportId) ?? null;
  }, [order, selectedReportId]);

  useEffect(() => {
    if (!open || !order) return;
    const initial =
      initialReportId && reportsForDrawer.some((r) => r.reportId === initialReportId)
        ? initialReportId
        : order.nextAction.uploadReportId &&
            reportsForDrawer.some((r) => r.reportId === order.nextAction.uploadReportId)
          ? order.nextAction.uploadReportId
          : reportsForDrawer[0]?.reportId ?? null;
    setSelectedReportId(initial);
    setReuploadReasonChoice("");
    setReuploadReasonOther("");
    staging.clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when drawer opens for a new order
  }, [open, order?.taskId, mode, initialReportId]);

  const handleSave = useCallback(async () => {
    if (!order || !selectedReport) return;
    const trimmedReason = reuploadReasonChoice === "Other" ? reuploadReasonOther.trim() : reuploadReasonChoice;
    if (mode === "reupload" && trimmedReason.length === 0) return;
    const selectedFiles = mode === "reupload" ? staging.validFiles.slice(0, 1) : staging.validFiles;
    const artifacts: StagedArtifactInput[] = selectedFiles
      .filter((f) => f.file)
      .map((f) => ({
        fileName: f.name,
        mimeType: f.type,
        file: f.file,
        size: f.size,
        artifactType: f.artifactType,
        isPrimary: f.isPrimary,
      }));
    if (artifacts.length === 0) return;

    setUploading(true);
    try {
      if (onPersistUpload) {
        await onPersistUpload({
          taskId: order.taskId,
          reportId: selectedReport.reportId,
          mode,
          reuploadReason: trimmedReason || undefined,
          hasExistingArtifact: selectedReport.artifacts.length > 0,
          files: selectedFiles.map((file) => file.file).filter((file): file is File => Boolean(file)),
        });
      } else {
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch {
      setUploading(false);
      return;
    }
    setUploading(false);

    onUploadComplete(order.taskId, selectedReport.reportId, selectedReport.testLabel, artifacts, {
      mode,
      reuploadReason: trimmedReason || undefined,
    });
    staging.clearAll();
    onOpenChange(false);
  }, [mode, onOpenChange, onPersistUpload, onUploadComplete, order, reuploadReasonChoice, reuploadReasonOther, selectedReport, staging]);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) {
        staging.clearAll();
      }
      onOpenChange(next);
    },
    [onOpenChange, staging],
  );

  if (!order) return null;

  const drawerTitle = selectedReport
    ? mode === "reupload"
      ? `Re-upload ${selectedReport.testLabel} Report`
      : `Upload Files — ${selectedReport.testLabel} Report`
    : `Upload Files — #${order.orderNumber}`;
  const currentArtifact = preferredArtifact(selectedReport?.artifacts ?? []);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{drawerTitle}</SheetTitle>
          <p className="text-xs text-[#6B7280]">
            {order.patientName} · #{order.orderNumber}
          </p>
        </SheetHeader>

        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <TatUrgencyIndicator tatState={order.tatState} tatLabel={order.tatLabel} />
          <ReportStatusChips reports={order.reports} />

          {reportsForDrawer.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              {mode === "reupload" ? "No uploaded report is available to re-upload." : "All reports uploaded for this order."}
            </p>
          ) : (
            <>
              {reportsForDrawer.length > 1 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#374151]">
                    {mode === "reupload" ? "Re-upload for" : "Upload for"}
                  </Label>
                  <RadioGroup
                    value={selectedReportId ?? undefined}
                    onValueChange={setSelectedReportId}
                    className="space-y-1"
                  >
                    {reportsForDrawer.map((r) => (
                      <label
                        key={r.reportId}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                          selectedReportId === r.reportId
                            ? "border-[#7C5CFC] bg-[#F4F1FF]"
                            : "border-[#E5E7EB] bg-white",
                        )}
                      >
                        <RadioGroupItem value={r.reportId} id={`report-${r.reportId}`} />
                        <span className="font-medium">{r.testLabel}</span>
                        {r.artifacts.length > 0 ? (
                          <span className="text-[10px] text-[#6B7280]">
                            · {r.artifacts.length} file{r.artifacts.length === 1 ? "" : "s"} already
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              ) : selectedReport ? (
                <NextActionLine line={mode === "reupload" ? `Re-upload ${selectedReport.testLabel} Report` : `Upload ${selectedReport.testLabel} Report`} />
              ) : null}

              {selectedReport ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    {mode === "reupload" ? "Current Report" : "Already Uploaded"}
                  </p>
                  {selectedReport.artifacts.length > 0 ? (
                  <ul className="space-y-1 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/50 p-1.5">
                    {selectedReport.artifacts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2 rounded-md bg-white px-2 py-1 text-xs text-[#374151]"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                        {a.uploadedAtLabel ? (
                          <span className="shrink-0 text-[10px] text-[#9CA3AF]">{a.uploadedAtLabel}</span>
                        ) : null}
                        {mode === "reupload" && a.id === currentArtifact?.id && onPreviewCurrent ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 px-2 text-[10px] text-[#5B3FD9]"
                            onClick={() => onPreviewCurrent(order.taskId, selectedReport.reportId)}
                          >
                            Preview Current
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#E5E7EB] px-3 py-2 text-xs text-[#6B7280]">
                      (none)
                    </p>
                  )}
                </div>
              ) : null}

              {mode === "reupload" ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Re-uploading creates an updated version. Previous delivery history remains visible.
                </div>
              ) : null}

              {mode === "reupload" ? (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#374151]">
                    Reason for re-upload <span className="text-red-600">*</span>
                  </Label>
                  <RadioGroup
                    value={reuploadReasonChoice}
                    onValueChange={(value) => {
                      setReuploadReasonChoice(value);
                      if (value !== "Other") setReuploadReasonOther("");
                    }}
                    className="grid gap-1.5 sm:grid-cols-2"
                  >
                    {REUPLOAD_REASON_OPTIONS.map((reason) => (
                      <label
                        key={reason}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                          reuploadReasonChoice === reason
                            ? "border-[#7C5CFC] bg-[#F4F1FF]"
                            : "border-[#E5E7EB] bg-white",
                        )}
                      >
                        <RadioGroupItem value={reason} id={`reupload-reason-${reason.replace(/\W+/g, "-").toLowerCase()}`} />
                        <span className="font-medium">{reason}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  {reuploadReasonChoice === "Other" ? (
                    <textarea
                      id="reupload-reason-other"
                      value={reuploadReasonOther}
                      onChange={(event) => setReuploadReasonOther(event.target.value)}
                      placeholder="Enter reason"
                      className="min-h-16 w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#7C5CFC] focus:ring-2 focus:ring-[#7C5CFC]/20"
                    />
                  ) : null}
                  <p className="text-[10px] text-[#6B7280]">
                    Select a reason so repeated re-uploads stay controlled.
                  </p>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  {mode === "reupload" ? "Upload Updated File" : "Add Files"}
                </p>
                <UploadDropzone accept={UPLOAD_ACCEPT_ATTR} onAddFiles={staging.addFiles} />
              </div>

              {staging.fileRejections.length > 0 ? (
                <div
                  className="rounded-md border border-red-200/80 bg-red-50/60 px-2.5 py-2 text-xs text-red-900"
                  role="alert"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">Some files could not be added:</p>
                    <button
                      type="button"
                      className="shrink-0 text-[#6B7280] hover:text-[#111827]"
                      aria-label="Dismiss file errors"
                      onClick={staging.dismissFileRejections}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {staging.fileRejections.map((r) => (
                      <li key={`${r.name}-${r.reason}`}>
                        <span className="font-medium">{r.name}</span>
                        {" — "}
                        {r.reason === "unsupported" ? "Unsupported file type" : rejectionReasonMessage(r.reason)}{" "}
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          {rejectionReasonLabel(r.reason)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {staging.validFiles.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    Selected Files
                  </p>
                  <ul className="space-y-1 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/50 p-1.5">
                    {staging.validFiles.map((f) => (
                      <CompletionAttachmentRow
                        key={f.id}
                        file={f}
                        accept={UPLOAD_ACCEPT_ATTR}
                        selected={staging.previewId === f.id}
                        onSelect={() => staging.setPreviewId(f.id)}
                        onReplace={(file) => staging.replaceFile(f.id, file)}
                        onRemove={() => staging.removeFile(f.id)}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {staging.previewFile ? <CompletionArtifactPreview file={staging.previewFile} /> : null}

              {selectedReport && staging.validFiles.length > 0 ? (
                <NextActionLine line={mode === "reupload" ? "Next: Resend updated report from the test row" : `Next: Send ${selectedReport.testLabel} Report`} />
              ) : null}

              <div className="flex items-center justify-end gap-2 border-t border-[#ECEBFF] pt-2">
                <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#7C5CFC] hover:bg-[#6B4CE0]"
                  onClick={() => void handleSave()}
                  disabled={
                    uploading ||
                    staging.validFiles.length === 0 ||
                    (mode === "reupload" && staging.validFiles.length !== 1) ||
                    (mode === "reupload" &&
                      (reuploadReasonChoice.length === 0 ||
                        (reuploadReasonChoice === "Other" && reuploadReasonOther.trim().length === 0)))
                  }
                >
                  {uploading ? "Saving…" : mode === "reupload" ? "Save Updated Report" : "Save Files"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
