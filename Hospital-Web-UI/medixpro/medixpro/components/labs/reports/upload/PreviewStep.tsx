"use client";

import { SpreadsheetPreviewPanel } from "@/components/labs/reports/upload/SpreadsheetPreviewPanel";
import { Button } from "@/components/ui/button";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import {
  canOpenInBrowserTab,
  isSpreadsheetFile,
} from "@/lib/labs/reports/parse-spreadsheet-preview";
import { Download, ExternalLink, FileSpreadsheet, FileText, FileWarning, Image as ImageIcon } from "lucide-react";

function fileKind(type: string, name: string): "pdf" | "image" | "spreadsheet" | "zip" | "other" {
  const lower = name.toLowerCase();
  if (type.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(lower)) return "image";
  if (isSpreadsheetFile(name, type)) return "spreadsheet";
  if (type.includes("zip") || lower.endsWith(".zip")) return "zip";
  return "other";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PreviewStepProps = {
  files: UploadFileItem[];
  primaryFileId: string | null;
};

export function PreviewStep({ files, primaryFileId }: PreviewStepProps) {
  if (files.length === 0) {
    return <p className="text-sm text-[#6B7280]">Add files in the previous step to preview.</p>;
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-1">
      {files.map((f) => {
        const kind = fileKind(f.type, f.name);
        const isPrimary = f.id === primaryFileId;
        const url = f.objectUrl;
        const showTabPreview = url && canOpenInBrowserTab(f.name, f.type);
        const canParseSheet = kind === "spreadsheet" && f.file;

        return (
          <li key={f.id} className="rounded-lg border border-[#ECEBFF] bg-white p-3 shadow-sm">
            <div className="flex items-start gap-2">
              {kind === "image" && url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
              ) : kind === "pdf" ? (
                <FileText className="h-8 w-8 shrink-0 text-red-500" aria-hidden />
              ) : kind === "spreadsheet" ? (
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <ImageIcon className="h-8 w-8 shrink-0 text-[#9CA3AF]" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[#111827]">{f.name}</p>
                <p className="text-[10px] text-[#9CA3AF]">{formatSize(f.size)}</p>
                {isPrimary ? (
                  <span className="mt-0.5 inline-block text-[9px] font-bold uppercase text-[#6D4FF5]">
                    Primary
                  </span>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {showTabPreview ? (
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
                      <a href={url} download={f.name}>
                        <Download className="mr-1 h-3 w-3" aria-hidden />
                        Download
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {kind === "pdf" && url ? (
              <iframe
                title={`Preview ${f.name}`}
                src={url}
                className="mt-2 h-52 w-full rounded-md border border-[#ECEBFF] bg-[#FAFAFF]"
              />
            ) : null}

            {kind === "spreadsheet" ? (
              canParseSheet ? (
                <SpreadsheetPreviewPanel file={f.file!} fileName={f.name} />
              ) : (
                <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/60 px-2 py-1.5 text-xs text-amber-900">
                  <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  Re-upload this file to preview Excel/CSV content here. Download still works if the file was
                  saved in a draft.
                </p>
              )
            ) : null}

            {kind === "spreadsheet" && !showTabPreview ? (
              <p className="mt-1 text-[10px] text-[#9CA3AF]">
                Excel files are previewed in the table below (browsers cannot open .xlsx in a new tab).
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
