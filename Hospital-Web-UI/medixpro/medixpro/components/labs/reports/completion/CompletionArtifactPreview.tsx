"use client";

import { SpreadsheetPreviewPanel } from "@/components/labs/reports/upload/shared/SpreadsheetPreviewPanel";
import { Button } from "@/components/ui/button";
import type { UploadFileItem } from "@/hooks/labs/useArtifactStaging";
import {
  canOpenInBrowserTab,
  isSpreadsheetFile,
} from "@/lib/labs/reports/parse-spreadsheet-preview";
import { Download, ExternalLink, FileSpreadsheet, FileText } from "lucide-react";

function fileKind(type: string, name: string): "pdf" | "image" | "spreadsheet" | "other" {
  const lower = name.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(lower)) return "image";
  if (isSpreadsheetFile(name, type)) return "spreadsheet";
  return "other";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type CompletionArtifactPreviewProps = {
  file: UploadFileItem | null;
};

export function CompletionArtifactPreview({ file }: CompletionArtifactPreviewProps) {
  if (!file) {
    return (
      <p className="rounded-lg border border-dashed border-[#E5E7EB] px-3 py-4 text-center text-xs text-[#6B7280]">
        Select a file to preview
      </p>
    );
  }

  const kind = fileKind(file.type, file.name);
  const url = file.objectUrl;
  const showTabPreview = url && canOpenInBrowserTab(file.name, file.type);
  const canParseSheet = kind === "spreadsheet" && file.file;

  return (
    <div className="rounded-lg border border-[#ECEBFF] bg-white p-2.5">
      <div className="flex min-w-0 items-start gap-2">
        {kind === "pdf" ? (
          <FileText className="h-5 w-5 shrink-0 text-red-500" aria-hidden />
        ) : kind === "spreadsheet" ? (
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[#111827]">{file.name}</p>
          <p className="text-[10px] text-[#9CA3AF]">{formatSize(file.size)}</p>
          <PreviewActions file={file} url={url} showTabPreview={!!showTabPreview} />
        </div>
      </div>

      {kind === "pdf" && url ? (
        <iframe
          title={`Preview ${file.name}`}
          src={url}
          className="mt-2 h-44 w-full rounded-md border border-[#ECEBFF] bg-[#FAFAFF]"
        />
      ) : null}

      {kind === "image" && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Preview ${file.name}`}
          className="mt-2 max-h-44 w-full rounded-md border border-[#ECEBFF] object-contain"
        />
      ) : null}

      {kind === "spreadsheet" && canParseSheet && file.file ? (
        <SpreadsheetPreviewPanel file={file.file} fileName={file.name} />
      ) : null}

      {kind === "other" ? (
        <p className="mt-2 text-xs text-[#6B7280]">Preview not available for this file type.</p>
      ) : null}
    </div>
  );
}

function PreviewActions({
  file,
  url,
  showTabPreview,
}: {
  file: UploadFileItem;
  url?: string;
  showTabPreview: boolean;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {showTabPreview && url ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[10px]"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-1 h-3 w-3" aria-hidden />
          Open in new tab
        </Button>
      ) : null}
      {url ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" asChild>
          <a href={url} download={file.name}>
            <Download className="mr-1 h-3 w-3" aria-hidden />
            Download
          </a>
        </Button>
      ) : null}
    </div>
  );
}
