"use client";

import { ArtifactDownloadButton } from "@/components/labs/reports/completion/ArtifactDownloadButton";
import { PreviewArtifactTabs } from "@/components/labs/reports/completion/PreviewArtifactTabs";
import { SpreadsheetPreviewPanel } from "@/components/labs/reports/upload/shared/SpreadsheetPreviewPanel";
import { Button } from "@/components/ui/button";
import { fetchArtifactBlob } from "@/lib/labs/reports/api/v1/reports-api";
import { canDownloadArtifact } from "@/lib/labs/reports/completion/artifact-download";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { ReportArtifactViewModel, TestDeliveryState } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { isSpreadsheetFile } from "@/lib/labs/reports/parse-spreadsheet-preview";
import { cn } from "@/lib/utils";
import { FileArchive, FileSpreadsheet, FileText, ImageIcon, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

export type QuickPreviewTarget = {
  taskId: string;
  reportId: string;
  patientName: string;
  orderNumber: string;
  testName: string;
  deliveryState: TestDeliveryState;
  corrected: boolean;
  isReuploaded?: boolean;
  artifacts: ReportArtifactViewModel[];
  canSend: boolean;
  canReupload: boolean;
};

type PreviewKind = "pdf" | "image" | "spreadsheet" | "text" | "zip" | "other";

function previewKind(artifact: ReportArtifactViewModel | null): PreviewKind {
  if (!artifact) return "other";
  const name = artifact.fileName.toLowerCase();
  const type = artifact.mimeType.toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return "image";
  if (isSpreadsheetFile(artifact.fileName, artifact.mimeType)) return "spreadsheet";
  if (type.startsWith("text/") || name.endsWith(".txt")) return "text";
  if (type.includes("zip") || name.endsWith(".zip")) return "zip";
  return "other";
}

function deliveryLabel(state: TestDeliveryState, isReuploaded?: boolean): string {
  if (isReuploaded && state === "SENT") return "Updated report delivered";
  if (isReuploaded && state === "READY") return "Updated report ready";
  if (state === "SENT") return "Delivered";
  if (state === "READY") return "Ready to send";
  if (state === "FAILED") return "Delivery failed";
  return "Not sent";
}

function preferredArtifactId(artifacts: ReportArtifactViewModel[]): string | undefined {
  return (
    artifacts.find((artifact) => artifact.isPrimary)?.id ??
    artifacts.find((artifact) => artifact.patientVisible)?.id ??
    artifacts[0]?.id
  );
}

export function QuickPreviewPanel({
  open,
  target,
  loading = false,
  error = null,
  onRetry,
  onOpenChange,
  onSend,
  onReupload,
}: {
  open: boolean;
  target: QuickPreviewTarget | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenChange: (open: boolean) => void;
  onSend: (taskId: string, reportIds: string[]) => void;
  onReupload: (taskId: string, reportId: string) => void;
}) {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | undefined>();
  const [remoteBlobUrl, setRemoteBlobUrl] = useState<string | null>(null);
  const artifacts = target?.artifacts ?? [];

  useEffect(() => {
    setSelectedArtifactId(preferredArtifactId(artifacts));
  }, [target?.taskId, target?.reportId, artifacts]);

  useEffect(() => {
    setRemoteBlobUrl(null);
  }, [selectedArtifactId]);

  const selectedArtifact =
    artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[0] ?? null;
  const kind = previewKind(selectedArtifact);
  const canDownload = canDownloadArtifact(selectedArtifact, { remoteBlobUrl });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/10"
        className="flex h-full w-full max-w-full flex-col gap-0 p-0 sm:max-w-[70vw] lg:max-w-[45vw]"
      >
        <SheetTitle className="sr-only">Report Quick Preview</SheetTitle>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 pr-12">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#111827]">
              {target?.testName ?? "Report Preview"}
            </p>
            <p className="truncate text-xs font-medium text-[#6B7280]">
              {target ? `${target.patientName} · #${target.orderNumber}` : "Select a report"}
            </p>
          </div>
          {target ? (
            <span className="shrink-0 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#374151]">
              {deliveryLabel(target.deliveryState, target.isReuploaded)}
            </span>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-5">
          {loading ? (
            <EmptyPreview message="Loading report preview..." />
          ) : error ? (
            <div className="space-y-2">
              <EmptyPreview message={error} />
              {onRetry ? (
                <div className="flex justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Retry
                  </Button>
                </div>
              ) : null}
            </div>
          ) : target ? (
            <div className="space-y-3">
              <PreviewArtifactTabs
                artifacts={artifacts}
                selectedArtifactId={selectedArtifact?.id}
                onSelect={setSelectedArtifactId}
              />
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <PreviewHeader
                  artifact={selectedArtifact}
                  kind={kind}
                  remoteBlobUrl={remoteBlobUrl}
                  canDownload={canDownload}
                />
                <div className="p-3">
                  <ArtifactPreview
                    artifact={selectedArtifact}
                    kind={kind}
                    onRemoteBlobReady={setRemoteBlobUrl}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] bg-white px-3 py-8 text-center text-sm text-[#6B7280]">
              Select a report to preview.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-background px-5 py-3">
          {target?.canSend ? (
            <Button
              type="button"
              className="min-h-10 bg-[#7C5CFC] hover:bg-[#6B4CE0]"
              onClick={() => onSend(target.taskId, [target.reportId])}
            >
              <Send className="mr-1.5 h-4 w-4" aria-hidden />
              {target.isReuploaded ? "Resend Updated Report" : "Send"}
            </Button>
          ) : null}
          {target?.canReupload ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              onClick={() => onReupload(target.taskId, target.reportId)}
            >
              Re-upload Report
            </Button>
          ) : null}
          <ArtifactDownloadButton
            artifact={selectedArtifact}
            remoteBlobUrl={remoteBlobUrl}
            disabled={!canDownload}
            className="min-h-10"
          />
          <Button type="button" variant="ghost" className="min-h-10" onClick={() => onOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" aria-hidden />
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PreviewHeader({
  artifact,
  kind,
  remoteBlobUrl,
  canDownload,
}: {
  artifact: ReportArtifactViewModel | null;
  kind: PreviewKind;
  remoteBlobUrl: string | null;
  canDownload: boolean;
}) {
  const Icon =
    kind === "image"
      ? ImageIcon
      : kind === "spreadsheet"
        ? FileSpreadsheet
        : kind === "zip"
          ? FileArchive
          : FileText;
  return (
    <div className="flex min-w-0 items-center gap-2 border-b bg-white px-3 py-2">
      <Icon className={cn("h-4 w-4 shrink-0", kind === "pdf" ? "text-red-500" : "text-[#7C5CFC]")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#111827]">
          {artifact?.fileName ?? "No file selected"}
        </p>
        {artifact ? <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">{kind}</p> : null}
      </div>
      <ArtifactDownloadButton
        artifact={artifact}
        remoteBlobUrl={remoteBlobUrl}
        disabled={!canDownload}
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-[10px]"
        iconClassName="mr-1 h-3 w-3"
      />
    </div>
  );
}

function ArtifactPreview({
  artifact,
  kind,
  onRemoteBlobReady,
}: {
  artifact: ReportArtifactViewModel | null;
  kind: PreviewKind;
  onRemoteBlobReady?: (url: string | null) => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [remotePreviewFile, setRemotePreviewFile] = useState<File | null>(null);
  const [remoteObjectUrl, setRemoteObjectUrl] = useState<string | null>(null);
  const [remoteLoadFailed, setRemoteLoadFailed] = useState(false);

  useEffect(() => {
    if (!artifact?.previewFile) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(artifact.previewFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [artifact?.previewFile]);

  useEffect(() => {
    onRemoteBlobReady?.(remoteObjectUrl);
  }, [remoteObjectUrl, onRemoteBlobReady]);

  useEffect(() => {
    let cancelled = false;
    const sourceUrl = artifact?.previewUrl ?? artifact?.downloadUrl ?? null;
    const canInlineRemotely =
      kind === "pdf" || kind === "image" || kind === "spreadsheet" || kind === "text";
    if (!sourceUrl || !canInlineRemotely) {
      setRemoteLoadFailed(false);
      setRemotePreviewFile(null);
      setRemoteObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }
    setRemoteLoadFailed(false);
    void fetchArtifactBlob(sourceUrl)
      .then((blob) => {
        const fileName = artifact?.fileName || "preview";
        const mimeType = artifact?.mimeType || "application/octet-stream";
        const file = new File([blob], fileName, { type: mimeType });
        if (cancelled) {
          return;
        }
        setRemotePreviewFile(file);
        const nextUrl = URL.createObjectURL(file);
        setRemoteObjectUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextUrl;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteLoadFailed(true);
          setRemoteObjectUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
          });
        }
      });
    return () => {
      cancelled = true;
      setRemoteObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [artifact?.downloadUrl, artifact?.previewUrl, artifact?.fileName, artifact?.mimeType, kind]);

  useEffect(
    () => () => {
      if (remoteObjectUrl) URL.revokeObjectURL(remoteObjectUrl);
    },
    [remoteObjectUrl],
  );

  if (!artifact) {
    return <EmptyPreview message="No report files are available for this test yet." />;
  }

  // Live API can provide a download URL without a dedicated preview URL.
  const url = remoteObjectUrl ?? artifact.previewUrl ?? artifact.downloadUrl ?? objectUrl;
  const effectivePreviewFile = artifact.previewFile ?? remotePreviewFile ?? undefined;

  if (kind === "pdf") {
    return url ? (
      <iframe title={`Preview ${artifact.fileName}`} src={url} className="h-[68vh] w-full rounded-md border bg-[#FAFAFF]" />
    ) : (
      <EmptyPreview
        message={
          remoteLoadFailed
            ? "Preview could not be loaded with authenticated access. Use Download and retry."
            : "PDF preview will appear here when the uploaded report URL is available."
        }
      />
    );
  }

  if (kind === "image") {
    return url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`Preview ${artifact.fileName}`} className="max-h-[68vh] w-full rounded-md border object-contain" />
    ) : (
      <EmptyPreview
        message={
          remoteLoadFailed
            ? "Preview could not be loaded with authenticated access. Use Download and retry."
            : "Image preview will appear here when the uploaded report URL is available."
        }
      />
    );
  }

  if (kind === "spreadsheet") {
    if (effectivePreviewFile) {
      return <SpreadsheetPreviewPanel file={effectivePreviewFile} fileName={artifact.fileName} />;
    }
    if (artifact.previewRows?.length) {
      return <PreviewRowsTable rows={artifact.previewRows} />;
    }
    return url ? (
      <EmptyPreview message="Spreadsheet inline preview is not available in this view. Use Download to inspect this file." />
    ) : (
      <EmptyPreview message="Spreadsheet preview is unavailable because file URL is missing." />
    );
  }

  if (kind === "text") {
    if (artifact.previewText) return <pre className="max-h-[68vh] overflow-auto whitespace-pre-wrap rounded-md border bg-[#FAFAFF] p-3 text-xs text-[#111827]">{artifact.previewText}</pre>;
    if (effectivePreviewFile) return <TextFilePreview file={effectivePreviewFile} />;
    return url ? (
      <EmptyPreview message="Text inline preview is not available in this view. Use Download to inspect this file." />
    ) : (
      <EmptyPreview message="Text preview is unavailable because file URL is missing." />
    );
  }

  if (kind === "zip") {
    return artifact.zipEntries?.length ? (
      <ul className="space-y-1 rounded-md border bg-[#FAFAFF] p-3 text-xs text-[#374151]">
        {artifact.zipEntries.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    ) : (
      <EmptyPreview
        message={
          url
            ? "ZIP inline rendering is not supported. Use Download to inspect contents."
            : "ZIP preview is unavailable because file URL is missing."
        }
      />
    );
  }

  return <EmptyPreview message="Preview is not available for this file type." />;
}

function PreviewRowsTable({ rows }: { rows: string[][] }) {
  const [headerRow, ...bodyRows] = rows;
  return (
    <div className="max-h-[68vh] overflow-auto rounded-md border border-[#ECEBFF]">
      <table className="w-full min-w-[360px] border-collapse text-left text-xs">
        {headerRow?.length ? (
          <thead className="sticky top-0 bg-[#F4F1FF]">
            <tr>
              {headerRow.map((cell, index) => (
                <th key={`h-${index}`} className="border-b border-[#ECEBFF] px-2 py-1.5 font-semibold text-[#374151]">
                  {cell || "-"}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {(headerRow?.length ? bodyRows : rows).map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-white even:bg-[#FAFAFF]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-[#F0EFFF] px-2 py-1.5 text-[#111827]">
                  {cell || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextFilePreview({ file }: { file: File }) {
  const [text, setText] = useState<string>("Loading text preview...");

  useEffect(() => {
    let cancelled = false;
    void file.text().then((content) => {
      if (!cancelled) setText(content.slice(0, 12000));
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return <pre className="max-h-[68vh] overflow-auto whitespace-pre-wrap rounded-md border bg-[#FAFAFF] p-3 text-xs text-[#111827]">{text}</pre>;
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#FAFAFF] px-3 py-10 text-center text-sm text-[#6B7280]">
      {message}
    </p>
  );
}
