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

function ArtifactViewer({ artifact }: { artifact: WorkspaceArtifact }) {
  if (!artifact.previewUrl) {
    return <div className="p-6 text-sm text-[hsl(var(--clinical-text-secondary))]">Preview unavailable.</div>;
  }
  if (artifact.kind === "IMAGE") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={artifact.previewUrl}
        alt={artifact.label}
        className="h-full min-h-[min(82vh,900px)] w-full object-contain bg-[hsl(var(--clinical-surface-page))]"
      />
    );
  }

  return (
    <iframe
      title={artifact.label}
      src={artifact.previewUrl}
      className="h-[min(82vh,900px)] w-full border-0 bg-white"
    />
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
};

export function ReportPreviewWorkspace({
  open,
  onOpenChange,
  report,
  loading,
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

  const handlePrint = () => {
    if (!activeArtifact) return;
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
      return;
    }
    if (activeArtifact.kind === "IMAGE") {
      w.document.write(
        `<html><body style="margin:0;display:flex;justify-content:center"><img src="${activeArtifact.previewUrl ?? ""}" style="max-width:100%"/></body></html>`
      );
    } else {
      w.document.write(`<iframe src="${activeArtifact.previewUrl ?? ""}" style="width:100%;height:100vh;border:0;"></iframe>`);
    }
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownload = () => {
    if (!activeArtifact || !report) return;
    const a = document.createElement("a");
    a.href = activeArtifact.downloadUrl;
    a.download = activeArtifact.label;
    a.click();
    toast.success("Download started");
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
                    <button
                      type="button"
                      title="Coming soon"
                      className="inline-flex items-center gap-1 text-[hsl(var(--clinical-text-meta))]"
                    >
                      <History className="h-3.5 w-3.5" />
                      Previous reports (Coming Soon)
                    </button>
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
                    disabled={!activeArtifact}
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
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveArtifactId(a.id)}
                        className={cn(
                          "-mb-px h-8 border-b-2 px-3 text-xs transition-colors duration-150",
                          selected
                            ? "border-primary font-semibold text-[hsl(var(--clinical-text-primary))]"
                            : "border-transparent text-[hsl(var(--clinical-text-meta))] hover:text-[hsl(var(--clinical-text-primary))]"
                        )}
                      >
                        {formatArtifactTabLabel(a.label)}
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
                    <ArtifactViewer artifact={activeArtifact} />
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
