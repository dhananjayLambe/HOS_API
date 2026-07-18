"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { resolveWorkspaceAccessUrl } from "@/lib/doctor/diagnostic-reports-workspace/resolve-workspace-access-url";
import { printResolvedWorkspaceUrl } from "@/lib/doctor/diagnostic-reports-workspace/print-workspace-artifact";
import { useClinicalLabHistoryDetail } from "./hooks/use-clinical-lab-history";
import type { ClinicalLabHistoryArtifact } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  reportId: string | null;
};

function ArtifactViewer({ artifact }: { artifact: ClinicalLabHistoryArtifact }) {
  const [src, setSrc] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(artifact.previewUrl));
  const [error, setError] = useState<string | null>(null);
  const isText = artifact.kind === "CSV" || artifact.kind === "TXT";

  useEffect(() => {
    let cancelled = false;
    let revoke: (() => void) | undefined;
    if (!artifact.previewUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void resolveWorkspaceAccessUrl(artifact.previewUrl)
      .then(async (resolved) => {
        if (cancelled) {
          if (resolved.kind === "blob") resolved.revoke();
          return;
        }
        if (resolved.kind === "blob") revoke = resolved.revoke;
        if (isText) {
          const res = await fetch(resolved.url);
          const body = await res.text();
          if (!cancelled) setText(body);
          if (resolved.kind === "blob") resolved.revoke();
        } else {
          setSrc(resolved.url);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to preview this file.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      revoke?.();
    };
  }, [artifact.previewUrl, artifact.id, isText]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error) return <p className="p-4 text-sm text-slate-500">{error}</p>;
  if (text != null) {
    return (
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
        {text}
      </pre>
    );
  }
  if (src && artifact.kind === "PDF") {
    return <iframe title={artifact.label} src={src} className="h-[70vh] w-full border-0" />;
  }
  if (src && artifact.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={artifact.label} className="max-h-[70vh] w-full object-contain" />;
  }
  return (
    <p className="p-4 text-sm text-slate-500">
      Preview not available for this file type. Use Download instead.
    </p>
  );
}

export function LabHistoryPreviewSheet({
  open,
  onOpenChange,
  patientId,
  reportId,
}: Props) {
  const { data, isLoading, isError } = useClinicalLabHistoryDetail(
    open ? patientId : null,
    open ? reportId : null
  );
  const primary =
    data?.artifacts.find((a: ClinicalLabHistoryArtifact) => a.isPrimary) ??
    data?.artifacts[0] ??
    null;

  async function handleDownload() {
    if (!primary?.downloadUrl) return;
    const resolved = await resolveWorkspaceAccessUrl(primary.downloadUrl);
    const a = document.createElement("a");
    a.href = resolved.url;
    a.download = primary.label || "report";
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
    if (resolved.kind === "blob") {
      setTimeout(() => resolved.revoke(), 30_000);
    }
  }

  async function handlePrint() {
    if (!primary?.previewUrl && !primary?.downloadUrl) return;
    const url = primary.previewUrl || primary.downloadUrl;
    const resolved = await resolveWorkspaceAccessUrl(url);
    await printResolvedWorkspaceUrl(
      resolved.url,
      (primary.kind as "PDF" | "IMAGE" | "CSV" | "TXT" | "OTHER") || "PDF"
    );
    if (resolved.kind === "blob") resolved.revoke();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <SheetTitle className="text-base font-semibold">
            {data?.testName || "Report preview"}
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 border-b border-slate-100 px-4 py-2">
          <Button variant="outline" size="sm" disabled={!primary} onClick={() => void handleDownload()}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
          <Button variant="outline" size="sm" disabled={!primary} onClick={() => void handlePrint()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
        </div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : isError || !data ? (
          <p className="p-4 text-sm text-slate-500">Unable to load report detail.</p>
        ) : primary ? (
          <ArtifactViewer artifact={primary} />
        ) : (
          <p className="p-4 text-sm text-slate-500">No attachments on this report.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
