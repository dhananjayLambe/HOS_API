"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, Printer, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { CancelPrescriptionModal } from "@/components/prescriptions/cancel-prescription-modal";
import { PrescriptionPreview } from "@/components/prescriptions/prescription-preview";
import { PrescriptionDrawerSkeleton } from "@/components/prescriptions/prescriptions-skeletons";
import type { PrescriptionSummaryPayload } from "@/components/prescriptions/types";

import {
  cancelPrescription,
  downloadPrescriptionPdf,
  fetchPrescriptionPreviewHtml,
  fetchPrescriptionSummary,
  type PrescriptionListItem,
} from "@/lib/api/prescriptions";
import { useToastNotification } from "@/hooks/use-toast-notification";

interface PrescriptionPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PrescriptionListItem | null;
  onCancelled?: (consultationId: string) => void;
  /** When true, drawer auto-triggers window.print() once the preview renders for the current row. */
  autoPrint?: boolean;
  onAutoPrintHandled?: () => void;
}

export function PrescriptionPreviewDrawer({
  open,
  onOpenChange,
  row,
  onCancelled,
  autoPrint = false,
  onAutoPrintHandled,
}: PrescriptionPreviewDrawerProps) {
  const toast = useToastNotification();
  const [summary, setSummary] = useState<PrescriptionSummaryPayload | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [locallyCancelled, setLocallyCancelled] = useState(false);

  const consultationId = row?.consultation_id || "";
  const isCancelled = Boolean(row?.is_cancelled) || locallyCancelled;

  // Reset internal state whenever the drawer is opened against a different row.
  useEffect(() => {
    if (!open || !row) {
      return;
    }
    setSummary(null);
    setPreviewHtml("");
    setLoadError(null);
    setLocallyCancelled(false);
  }, [open, row?.consultation_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy fetch summary + html only after open to avoid wasted network on closed drawer.
  useEffect(() => {
    if (!open || !consultationId) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const [summaryRes, htmlRes] = await Promise.all([
          fetchPrescriptionSummary(consultationId, { signal: controller.signal }),
          fetchPrescriptionPreviewHtml(consultationId, { signal: controller.signal }),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setPreviewHtml((htmlRes.data?.html || "").trim());
      } catch (error: any) {
        if (controller.signal.aborted) return;
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load prescription preview.";
        if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, consultationId]);

  const printRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    setIframeReady(false);
  }, [previewHtml, row?.consultation_id]);

  const handlePrint = useCallback(() => {
    if (isCancelled) return;
    if (typeof window !== "undefined") {
      window.print();
    }
  }, [isCancelled]);

  // Auto-print once the preview is fully ready (iframe loaded or fallback summary mounted).
  useEffect(() => {
    if (!autoPrint || !open) return;
    if (loading || loadError || isCancelled) return;
    const ready = previewHtml ? iframeReady : Boolean(summary);
    if (!ready) return;
    const handle = window.setTimeout(() => {
      window.print();
      onAutoPrintHandled?.();
    }, 80);
    return () => window.clearTimeout(handle);
  }, [autoPrint, open, loading, loadError, isCancelled, previewHtml, iframeReady, summary, onAutoPrintHandled]);

  const handleDownload = useCallback(async () => {
    if (!row || isCancelled) return;
    setPdfDownloading(true);
    try {
      await downloadPrescriptionPdf(consultationId, row.pnr);
      toast.success("Prescription downloaded successfully");
    } catch (error: any) {
      const message = error?.message || "Unable to download prescription";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => {
            void handleDownload();
          },
        },
      });
    } finally {
      setPdfDownloading(false);
    }
  }, [consultationId, isCancelled, row, toast]);

  const handleCancelConfirm = useCallback(
    async (reason: string, reasonText?: string) => {
      if (!consultationId) return;
      setIsCancelling(true);
      try {
        await cancelPrescription(consultationId, {
          reason_code: reason,
          reason_text: reasonText || "",
          source: "doctor",
        });
        setLocallyCancelled(true);
        setShowCancelModal(false);
        toast.warning("Prescription marked as cancelled.");
        onCancelled?.(consultationId);
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Failed to cancel prescription.";
        toast.error(message);
      } finally {
        setIsCancelling(false);
      }
    },
    [consultationId, onCancelled, toast]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full w-full max-w-full flex-col gap-0 p-0 sm:max-w-[70vw] lg:max-w-[45vw]"
        )}
      >
        <SheetTitle className="sr-only">Prescription Preview Drawer</SheetTitle>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 pr-12">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {row?.patient.full_name || summary?.patient?.full_name || "Patient"}
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">{row?.pnr || "-"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {isCancelled ? (
              <Badge variant="destructive" className="bg-red-600 text-white tracking-wide">
                CANCELLED
              </Badge>
            ) : (
              <Badge variant="success" className="bg-green-600 text-white tracking-wide">
                ACTIVE
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-5">
          {loading ? (
            <PrescriptionDrawerSkeleton />
          ) : loadError ? (
            <Alert className="border-red-200 bg-red-50 text-red-900">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load preview</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : (
            <div
              id="rx-print-area"
              ref={printRef}
              className="relative overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              {isCancelled ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <span className="rotate-[-28deg] text-7xl font-bold tracking-[0.35em] text-red-500/15">
                    CANCELLED
                  </span>
                </div>
              ) : null}
              {previewHtml ? (
                <iframe
                  ref={iframeRef}
                  title="Prescription Preview"
                  srcDoc={previewHtml}
                  className="h-[1100px] w-full border-0"
                  sandbox="allow-same-origin"
                  onLoad={() => setIframeReady(true)}
                />
              ) : summary ? (
                <PrescriptionPreview
                  summary={summary}
                  pnr={row?.pnr || ""}
                  cancelled={isCancelled}
                />
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Preview unavailable.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-background px-5 py-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isCancelled || loading}
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isCancelled || loading || pdfDownloading}
            onClick={() => void handleDownload()}
          >
            {pdfDownloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Download PDF
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={isCancelled || loading || isCancelling}
            onClick={() => setShowCancelModal(true)}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Cancel Prescription
          </Button>
        </div>

        <CancelPrescriptionModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          onConfirm={handleCancelConfirm}
          isSubmitting={isCancelling}
        />
      </SheetContent>
    </Sheet>
  );
}
