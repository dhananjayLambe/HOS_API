"use client";

import { Button } from "@/components/ui/button";
import { downloadReportArtifact } from "@/lib/labs/reports/completion/artifact-download";
import type { ReportArtifactViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";

export function ArtifactDownloadButton({
  artifact,
  disabled,
  remoteBlobUrl,
  variant = "outline",
  size,
  className,
  iconClassName = "mr-1.5 h-4 w-4",
}: {
  artifact: ReportArtifactViewModel | null;
  disabled?: boolean;
  remoteBlobUrl?: string | null;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
  iconClassName?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!artifact || disabled || downloading) return;
    setDownloading(true);
    try {
      await downloadReportArtifact(artifact, { remoteBlobUrl });
    } catch {
      // Keep failure silent in-button; parent preview already surfaces auth/load issues.
    } finally {
      setDownloading(false);
    }
  }, [artifact, disabled, downloading, remoteBlobUrl]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => void handleDownload()}
      disabled={disabled || downloading || !artifact}
    >
      <Download className={cn(iconClassName)} aria-hidden />
      {downloading ? "Downloading..." : "Download"}
    </Button>
  );
}
