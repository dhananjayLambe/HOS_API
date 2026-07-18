"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  History,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  type WorkspaceArtifact,
  type WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import {
  formatArtifactTabLabel,
  typeMeta,
  typePatientName,
  typeSectionTitle,
} from "@/lib/design-system/clinical";
import { cn } from "@/lib/utils";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { resolveWorkspaceAccessUrl } from "@/lib/doctor/diagnostic-reports-workspace/resolve-workspace-access-url";
import { printResolvedWorkspaceUrl } from "@/lib/doctor/diagnostic-reports-workspace/print-workspace-artifact";

function ArtifactViewer({
  artifact,
  onDownload,
}: {
  artifact: WorkspaceArtifact;
  onDownload?: () => void;
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(artifact.previewUrl));

  const isTextKind = artifact.kind === "CSV" || artifact.kind === "TXT";
  const isOfficeOrBinary =
    artifact.kind === "XLSX" ||
    artifact.kind === "DOCX" ||
    artifact.kind === "ZIP" ||
    artifact.kind === "DICOM" ||
    artifact.kind === "OTHER";

  useEffect(() => {
    let cancelled = false;
    let revoke: (() => void) | undefined;
    const previewUrl = artifact.previewUrl;

    if (!previewUrl) {
      setResolvedSrc(null);
      setTextPreview(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setResolvedSrc(null);
    setTextPreview(null);

    void resolveWorkspaceAccessUrl(previewUrl)
      .then(async (resolved) => {
        if (cancelled) {
          if (resolved.kind === "blob") resolved.revoke();
          return;
        }
        if (resolved.kind === "blob") revoke = resolved.revoke;
        if (isTextKind) {
          const res = await fetch(resolved.url);
          const text = await res.text();
          if (!cancelled) setTextPreview(text);
          if (resolved.kind === "blob") {
            // Text loaded — can revoke blob URL after reading
            resolved.revoke();
            revoke = undefined;
          }
        } else {
          setResolvedSrc(resolved.url);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Preview failed to load.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      revoke?.();
    };
  }, [artifact.id, artifact.previewUrl, isTextKind]);

  if (!artifact.previewUrl) {
    return (
      <DownloadOnlyPanel
        kind={artifact.kind}
        label={artifact.label}
        canDownload={Boolean(artifact.downloadUrl)}
        onDownload={onDownload}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[min(82vh,900px)] items-center justify-center gap-2 text-sm text-[hsl(var(--clinical-text-secondary))]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading document…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 p-6 text-sm text-[hsl(var(--clinical-text-secondary))]">
        <p>{error}</p>
        {artifact.downloadUrl && onDownload ? (
          <Button type="button" size="sm" variant="outline" onClick={onDownload}>
            <Download className="mr-1.5 h-4 w-4" />
            Download file
          </Button>
        ) : null}
      </div>
    );
  }

  if (isTextKind && textPreview != null) {
    return (
      <pre className="max-h-[min(82vh,900px)] overflow-auto whitespace-pre-wrap break-words bg-[hsl(var(--clinical-surface-page))] p-4 font-mono text-xs leading-relaxed text-[hsl(var(--clinical-text-primary))]">
        {textPreview}
      </pre>
    );
  }

  if (artifact.kind === "IMAGE" && resolvedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={artifact.label}
        className="h-full min-h-[min(82vh,900px)] w-full object-contain bg-[hsl(var(--clinical-surface-page))]"
      />
    );
  }

  if (artifact.kind === "PDF" && resolvedSrc) {
    return (
      <iframe
        title={artifact.label}
        src={resolvedSrc}
        className="h-[min(82vh,900px)] w-full border-0 bg-white"
      />
    );
  }

  if (isOfficeOrBinary || !resolvedSrc) {
    return (
      <DownloadOnlyPanel
        kind={artifact.kind}
        label={artifact.label}
        canDownload={Boolean(artifact.downloadUrl)}
        onDownload={onDownload}
      />
    );
  }

  return (
    <iframe
      title={artifact.label}
      src={resolvedSrc}
      className="h-[min(82vh,900px)] w-full border-0 bg-white"
    />
  );
}

function DownloadOnlyPanel({
  kind,
  label,
  canDownload,
  onDownload,
}: {
  kind: WorkspaceArtifact["kind"];
  label: string;
  canDownload: boolean;
  onDownload?: () => void;
}) {
  const hint =
    kind === "DOCX"
      ? "Word documents open best after download (Microsoft Word or compatible app)."
      : kind === "XLSX"
        ? "Spreadsheets open best after download (Excel or compatible app)."
        : kind === "ZIP"
          ? "Archives must be downloaded to extract."
          : kind === "DICOM"
            ? "DICOM imaging requires a dedicated viewer — download the file."
            : "Inline preview is not available for this file type.";

  return (
    <div className="flex min-h-[min(40vh,420px)] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-sm font-medium text-[hsl(var(--clinical-text-primary))]">
        {label || "Report file"}
      </p>
      <p className="max-w-md text-sm text-[hsl(var(--clinical-text-secondary))]">{hint}</p>
      {canDownload && onDownload ? (
        <Button type="button" onClick={onDownload}>
          <Download className="mr-1.5 h-4 w-4" />
          Download {kind === "OTHER" ? "file" : kind}
        </Button>
      ) : (
        <p className="text-xs text-[hsl(var(--clinical-text-meta))]">
          Download is not available for this artifact.
        </p>
      )}
    </div>
  );
}

function compactRelative(iso: string | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Thin clinical timeline — one strip, not a card. */
function CompactTimeline({ report }: { report: WorkspaceReport }) {
  const stages = [
    { label: "Ordered", at: report.timeline.orderedAt ?? report.collectionDate },
    { label: "Collected", at: report.timeline.collectedAt ?? report.collectionDate },
    { label: "Uploaded", at: report.timeline.uploadedAt ?? report.uploadedAt ?? report.reportDate },
  ];

  return (
    <ol className="flex h-8 min-w-0 items-center gap-1 overflow-x-auto text-xs">
      {stages.map((stage, i) => (
        <li key={stage.label} className="flex shrink-0 items-center gap-1">
          {i > 0 ? <span className="text-[hsl(var(--clinical-text-meta))]">/</span> : null}
          <span className="font-medium text-[hsl(var(--clinical-text-primary))]">
            {stage.label}
          </span>
          <span className="text-[hsl(var(--clinical-text-meta))]">
            {compactRelative(stage.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}

type ReportPreviewWorkspaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: WorkspaceReport | null;
  loading?: boolean;
  /** Phase 1: show all workspace reports for this patient (not full history/versioning). */
  onViewPatientReports?: (patientId: string) => void;
};

export function ReportPreviewWorkspace({
  open,
  onOpenChange,
  report,
  loading,
  onViewPatientReports,
}: ReportPreviewWorkspaceProps) {
  const toast = useToastNotification();
  const primary = useMemo(
    () => report?.artifacts.find((a) => a.isPrimary) ?? report?.artifacts[0] ?? null,
    [report]
  );
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  useEffect(() => {
    setActiveArtifactId(primary?.id ?? null);
  }, [report?.id, primary?.id]);

  const activeArtifact =
    report?.artifacts.find((a) => a.id === activeArtifactId) ?? primary;

  const canPrint =
    activeArtifact &&
    (activeArtifact.kind === "PDF" ||
      activeArtifact.kind === "IMAGE" ||
      activeArtifact.kind === "CSV" ||
      activeArtifact.kind === "TXT") &&
    Boolean(activeArtifact.previewUrl);

  const handlePrint = async () => {
    if (!activeArtifact?.previewUrl || !canPrint) return;
    let revoke: (() => void) | undefined;
    try {
      const resolved = await resolveWorkspaceAccessUrl(activeArtifact.previewUrl);
      if (resolved.kind === "blob") revoke = resolved.revoke;
      await printResolvedWorkspaceUrl(resolved.url, activeArtifact.kind);
      toast.success("Print dialog opened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Print failed.");
    } finally {
      if (revoke) {
        window.setTimeout(revoke, 60_000);
      }
    }
  };

  const handleDownload = async () => {
    if (!activeArtifact?.downloadUrl || !report) return;
    try {
      const resolved = await resolveWorkspaceAccessUrl(activeArtifact.downloadUrl);
      const a = document.createElement("a");
      a.href = resolved.url;
      a.download = activeArtifact.label;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (resolved.kind === "blob") {
        window.setTimeout(() => resolved.revoke(), 0);
      }
      toast.success("Download started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,68vw)] lg:max-w-[min(96vw,1120px)]"
      >
        <SheetTitle className="sr-only">
          {report ? `${report.patient.name} · ${report.testName}` : "Report preview"}
        </SheetTitle>

        {loading || !report ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-10 text-sm text-[hsl(var(--clinical-text-secondary))]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading preview…
          </div>
        ) : (
          <>
            {/* Compact patient banner */}
            <header className="shrink-0 border-b border-[hsl(var(--clinical-divider))] bg-[hsl(var(--clinical-surface-section))] px-4 py-2.5 pr-14 sm:px-5 sm:pr-16">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={cn(typePatientName, "truncate")}>
                      {report.patient.name}
                    </h2>
                  </div>
                  <p className={cn(typeMeta, "mt-0.5")}>
                    {report.patient.age ?? "—"}Y {report.patient.gender}
                    <span className="mx-1.5 text-[hsl(var(--clinical-text-meta)/0.5)]">·</span>
                    Patient Identifier: {report.patient.identifier}
                    {report.patient.mobile ? (
                      <>
                        <span className="mx-1.5 text-[hsl(var(--clinical-text-meta)/0.5)]">
                          ·
                        </span>
                        {report.patient.mobile}
                      </>
                    ) : null}
                  </p>
                  <nav className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <Link
                      href={`/patients/${report.patient.id}?tab=labs`}
                      className="font-medium text-primary hover:underline"
                    >
                      Patient Summary
                    </Link>
                    {onViewPatientReports ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        onClick={() => {
                          onOpenChange(false);
                          onViewPatientReports(report.patient.id);
                        }}
                      >
                        <History className="h-3.5 w-3.5" />
                        Previous reports
                      </button>
                    ) : (
                      <span
                        title="Coming soon"
                        className="inline-flex items-center gap-1 text-[hsl(var(--clinical-text-meta))]"
                      >
                        <History className="h-3.5 w-3.5" />
                        Previous reports (Coming Soon)
                      </span>
                    )}
                  </nav>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-start">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={!activeArtifact}
                    onClick={handleDownload}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9"
                    disabled={!canPrint}
                    title={
                      canPrint
                        ? "Print"
                        : "Print is available for PDF, images, CSV, and text files"
                    }
                    onClick={handlePrint}
                  >
                    <Printer className="mr-1.5 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            </header>

            {/* Report metadata — separated from patient context */}
            <div className="shrink-0 space-y-2 border-b border-[hsl(var(--clinical-divider))] px-4 py-2.5 sm:px-5">
              <div>
                <h3 className={typeSectionTitle}>{report.testName}</h3>
                <dl className={cn(typeMeta, "mt-1 flex flex-wrap gap-x-3 gap-y-1")}>
                  <div>
                    <dt className="sr-only">Category</dt>
                    <dd>{report.category ?? "Diagnostic"}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Report ID</dt>
                    <dd className="font-medium text-[hsl(var(--clinical-text-primary)/0.85)]">
                      {report.reportNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Lab</dt>
                    <dd>{report.labName ?? "—"}</dd>
                  </div>
                  {report.doctorName ? (
                    <div>
                      <dt className="sr-only">Doctor</dt>
                      <dd>{report.doctorName}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="sr-only">Collection date</dt>
                    <dd>Collected {formatShortDate(report.collectionDate)}</dd>
                  </div>
                  {report.consultationLabel ? (
                    <div>
                      <dt className="sr-only">Consultation</dt>
                      <dd className="truncate">{report.consultationLabel}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <CompactTimeline report={report} />

              {report.artifacts.length > 1 ? (
                <div
                  role="tablist"
                  className="flex h-8 w-full items-end gap-0 border-b border-[hsl(var(--clinical-divider))]"
                >
                  {report.artifacts.map((a) => {
                    const selected = activeArtifact?.id === a.id;
                    const name = formatArtifactTabLabel(a.label);
                    const tabLabel = a.isPrimary
                      ? `${a.kind} · Primary · ${name}`
                      : `${a.kind} · ${name}`;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        title={tabLabel}
                        onClick={() => setActiveArtifactId(a.id)}
                        className={cn(
                          "-mb-px h-8 max-w-[12rem] truncate border-b-2 px-3 text-xs transition-colors duration-150",
                          selected
                            ? "border-primary font-semibold text-[hsl(var(--clinical-text-primary))]"
                            : "border-transparent text-[hsl(var(--clinical-text-meta))] hover:text-[hsl(var(--clinical-text-primary))]"
                        )}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Clinical content (dominant) */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {report.clinicalFindings ? (
                <div
                  className={cn(
                    "mx-4 mt-3 shrink-0 rounded-lg border px-3.5 py-3 sm:mx-5",
                    "border-[hsl(var(--clinical-accent-awaiting)/0.35)] bg-[hsl(var(--clinical-accent-awaiting-soft))] text-amber-950 dark:text-amber-50"
                  )}
                >
                  <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide">
                    <Sparkles className="h-4 w-4" />
                    Clinical findings
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-snug md:text-base">
                    {report.clinicalFindings}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                {report.artifacts.length === 0 ? (
                  <div className="mx-4 rounded-lg border border-dashed border-[hsl(var(--clinical-border-subtle))] px-4 py-16 text-center text-sm text-[hsl(var(--clinical-text-secondary))] sm:mx-5">
                    Report not available yet. Still awaiting results.
                  </div>
                ) : activeArtifact ? (
                  <div className="min-h-0 flex-1 border-t border-[hsl(var(--clinical-divider))] bg-white dark:bg-background">
                    <ArtifactViewer
                      artifact={activeArtifact}
                      onDownload={
                        activeArtifact.downloadUrl ? handleDownload : undefined
                      }
                    />
                  </div>
                ) : null}
              </div>

              {/* Collapsed AI placeholder — unobtrusive */}
              <div className="mx-4 mb-3 mt-auto flex shrink-0 items-center gap-2 rounded-md border border-dashed border-[hsl(var(--clinical-border-subtle))] px-3 py-2 text-xs text-[hsl(var(--clinical-text-meta))] sm:mx-5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>AI summary reserved — trends and risk indicators coming later</span>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
