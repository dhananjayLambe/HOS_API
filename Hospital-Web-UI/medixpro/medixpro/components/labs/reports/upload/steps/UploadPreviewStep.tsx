"use client";

import { SpreadsheetPreviewPanel } from "@/components/labs/reports/upload/shared/SpreadsheetPreviewPanel";
import { Button } from "@/components/ui/button";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
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

type UploadPreviewStepProps = {
  files: UploadFileItem[];
  primaryFileId: string | null;
};

export function UploadPreviewStep({ files, primaryFileId }: UploadPreviewStepProps) {
  if (files.length === 0) {
    return <p className="text-sm text-[#6B7280]">Add files in the previous step to preview.</p>;
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-[#111827]">Verify files before continuing</h3>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          Confirm patient, visit, and attachments. This step is for verification, not browsing.
        </p>
      </div>
      <ul className="space-y-2 pb-0">
        {files.map((f) => {
          const kind = fileKind(f.type, f.name);
          const isPrimary = f.id === primaryFileId;
          const url = f.objectUrl;
          const showTabPreview = url && canOpenInBrowserTab(f.name, f.type);
          const canParseSheet = kind === "spreadsheet" && f.file;

          return (
            <li key={f.id} className="rounded-lg border border-[#ECEBFF] bg-white p-2.5">
              <div className="flex min-w-0 items-start gap-2">
                {kind === "pdf" ? (
                  <FileText className="h-6 w-6 shrink-0 text-red-500" aria-hidden />
                ) : kind === "spreadsheet" ? (
                  <FileSpreadsheet className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-[#111827]">{f.name}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{formatSize(f.size)}</p>
                  {isPrimary ? (
                    <span className="mt-0.5 inline-block text-[9px] font-bold uppercase text-[#6D4FF5]">
                      Primary report
                    </span>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap gap-1">
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
                  className="mt-2 h-40 w-full rounded-md border border-[#ECEBFF] bg-[#FAFAFF]"
                />
              ) : null}

              {kind === "spreadsheet" && canParseSheet ? (
                <SpreadsheetPreviewPanel file={f.file!} fileName={f.name} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
