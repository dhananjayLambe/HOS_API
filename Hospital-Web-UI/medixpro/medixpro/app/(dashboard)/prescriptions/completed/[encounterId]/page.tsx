"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Lock, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { backendAxiosClient } from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CancelPrescriptionModal } from "@/components/prescriptions/cancel-prescription-modal";
import { PrescriptionActionsSidebar } from "@/components/prescriptions/prescription-actions-sidebar";
import { PrescriptionSuccessHeader } from "@/components/prescriptions/prescription-success-header";
import { StartNextConsultationSection } from "@/components/prescriptions/start-next-consultation-section";
import { WhatsAppDeliveryCard } from "@/components/prescriptions/whatsapp-delivery-card";
import type { CancelState, PrescriptionSummaryPayload } from "@/components/prescriptions/types";
import {
  fetchPrescriptionSummary,
  fetchWhatsAppConsultationStatus,
  resendWhatsAppDelivery,
  resendWhatsAppConsultationDelivery,
  retryWhatsAppDelivery,
} from "@/lib/api/prescriptions";

type EncounterLookupResponse = {
  id: string;
  visit_pnr: string;
  status: string;
  consultation_id?: string | null;
  consultation_end_time?: string | null;
};

type CompletionState = {
  consultation_id: string;
  encounter_id: string;
  visit_pnr?: string;
  completed_at: string;
};

const completionKey = (encounterId: string) => `rx-completion:${encounterId}`;
const cancelKey = (encounterId: string) => `rx-cancel:${encounterId}`;
const downloadedKey = (encounterId: string) => `rx-pdf-downloaded:${encounterId}`;

const WHATSAPP_POLL_INTERVAL_MS = 3000;
const WHATSAPP_POLL_MAX_MS = 45000;

/** Poll only until Celery finishes send; sent/delivered come from the API without extra polling. */
function shouldPollWhatsAppStatus(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  if (!normalized) return true;
  return normalized === "queued";
}

function isWhatsAppQueuedStatus(status?: string | null) {
  return (status || "").toLowerCase() === "queued";
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function CompletedPrescriptionPage() {
  const { encounterId: rawEncounterId } = useParams<{ encounterId: string }>();
  const encounterId = decodeURIComponent(rawEncounterId || "");
  const router = useRouter();
  const toast = useToastNotification();
  const { user } = useAuth();
  const toastErrorRef = useRef(toast.error);
  toastErrorRef.current = toast.error;
  const downloadPdfRef = useRef<(markAsAutoDownload: boolean) => Promise<void>>(async () => {});
  const autoDownloadTriggeredRef = useRef(false);
  const pdfAutoDownloadInFlightRef = useRef(false);

  const [summary, setSummary] = useState<PrescriptionSummaryPayload | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [encounterLookup, setEncounterLookup] = useState<EncounterLookupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupFailed, setLookupFailed] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelState, setCancelState] = useState<CancelState | null>(null);
  const [isCancellingPrescription, setIsCancellingPrescription] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [whatsappPolling, setWhatsappPolling] = useState(false);
  const [whatsappPollTimedOut, setWhatsappPollTimedOut] = useState(false);
  const [whatsappRetrying, setWhatsappRetrying] = useState(false);
  const [whatsappResending, setWhatsappResending] = useState(false);
  const whatsappPollGenerationRef = useRef(0);
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const completionData: CompletionState | null = useMemo(() => {
    if (!encounterId || typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(completionKey(encounterId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CompletionState;
    } catch {
      return null;
    }
  }, [encounterId]);

  const consultationId = completionData?.consultation_id || encounterLookup?.consultation_id || "";
  const completedAt =
    completionData?.completed_at ||
    encounterLookup?.consultation_end_time ||
    summary?.meta?.completed_at ||
    "";
  const encounterStatus = (encounterLookup?.status || "CONSULTATION_COMPLETED").toUpperCase();
  const isCompleted = encounterStatus === "CONSULTATION_COMPLETED";
  const visitPnr = completionData?.visit_pnr || encounterLookup?.visit_pnr || "PNR";

  const generatedBy = summary?.doctor?.full_name || "Doctor";
  const generatedAt = formatDateTime(summary?.meta?.generated_at || completedAt);
  const patientName = summary?.patient?.full_name || "Patient";
  const ageGender = `${summary?.patient?.age_display || "-"} / ${summary?.patient?.gender || "-"}`;

  const getCancelState = useCallback(() => {
    if (!encounterId || typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(cancelKey(encounterId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CancelState;
    } catch {
      return null;
    }
  }, [encounterId]);

  const downloadPdf = useCallback(
    async (markAsAutoDownload: boolean) => {
      if (!consultationId || !encounterId) return;
      if (markAsAutoDownload) {
        if (pdfAutoDownloadInFlightRef.current) return;
        pdfAutoDownloadInFlightRef.current = true;
        window.sessionStorage.setItem(downloadedKey(encounterId), "1");
      }
      setIsPdfDownloading(true);
      setPdfError(null);
      try {
        const token = window.localStorage.getItem("access_token");
        const response = await fetch(`/api/consultations/${consultationId}/summary-lite/pdf/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          throw new Error("Unable to auto-download prescription");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `prescription-${visitPnr}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        if (markAsAutoDownload) {
          toast.success("Prescription downloaded successfully");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to auto-download prescription";
        if (markAsAutoDownload) {
          window.sessionStorage.removeItem(downloadedKey(encounterId));
          setPdfError(message);
        } else {
          toast.error(message);
        }
      } finally {
        if (markAsAutoDownload) {
          pdfAutoDownloadInFlightRef.current = false;
        }
        setIsPdfDownloading(false);
      }
    },
    [consultationId, encounterId, toast, visitPnr]
  );

  downloadPdfRef.current = downloadPdf;

  useEffect(() => {
    setCancelState(getCancelState());
  }, [getCancelState]);

  useEffect(() => {
    if (!summary?.prescription?.is_cancelled || cancelState || !encounterId) return;
    const nextCancelState: CancelState = {
      reason: "already_cancelled",
      reasonText: "",
      cancelledAt: formatDateTime(summary.prescription.cancelled_at || ""),
      cancelledBy: "Doctor",
    };
    window.sessionStorage.setItem(cancelKey(encounterId), JSON.stringify(nextCancelState));
    setCancelState(nextCancelState);
  }, [cancelState, encounterId, summary?.prescription?.cancelled_at, summary?.prescription?.is_cancelled]);

  useEffect(() => {
    if (!encounterId) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setLookupFailed(null);
      try {
        let lookup: EncounterLookupResponse | null = null;
        if (!completionData) {
          const lookupRes = await backendAxiosClient.get<EncounterLookupResponse>(
            `/consultations/encounter/${encodeURIComponent(encounterId)}/`
          );
          lookup = lookupRes.data;
          if (isMounted) setEncounterLookup(lookupRes.data);
        } else {
          setEncounterLookup(null);
        }

        const resolvedConsultationId = completionData?.consultation_id || lookup?.consultation_id;
        if (!resolvedConsultationId) {
          throw new Error("Consultation not available for this encounter.");
        }

        const cid = encodeURIComponent(resolvedConsultationId);
        const [summaryRes, previewRes, whatsappRes] = await Promise.all([
          backendAxiosClient.get<PrescriptionSummaryPayload>(`/consultations/${cid}/summary-lite/`),
          backendAxiosClient.post<{ html?: string }>(`/consultations/${cid}/summary-lite/html/`, {}),
          fetchWhatsAppConsultationStatus(resolvedConsultationId, { enqueue: true }),
        ]);
        const whatsapp =
          whatsappRes.data?.message || summaryRes.data?.prescription?.whatsapp || undefined;
        if (isMounted) {
          setSummary(
            summaryRes.data
              ? {
                  ...summaryRes.data,
                  prescription: {
                    ...(summaryRes.data.prescription || {}),
                    ...(whatsapp ? { whatsapp } : {}),
                  },
                }
              : null
          );
        }
        if (isMounted) setPreviewHtml((previewRes.data?.html || "").trim());
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load completion workspace.";
        if (isMounted) {
          setLookupFailed(message);
          toastErrorRef.current(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [completionData, encounterId]);

  const refreshSummary = useCallback(async () => {
    if (!consultationId) return null;
    const [summaryRes, whatsappRes] = await Promise.all([
      fetchPrescriptionSummary(consultationId),
      fetchWhatsAppConsultationStatus(consultationId, { enqueue: true }),
    ]);
    const whatsapp = whatsappRes.data?.message || summaryRes.data?.prescription?.whatsapp;
    const mergedSummary = summaryRes.data
      ? {
          ...summaryRes.data,
          prescription: {
            ...(summaryRes.data.prescription || {}),
            ...(whatsapp ? { whatsapp } : {}),
          },
        }
      : null;
    if (mergedSummary) {
      setSummary(mergedSummary);
    }
    const nextStatus = whatsapp?.status;
    if (nextStatus) {
      setWhatsappPollTimedOut(false);
    }
    return mergedSummary;
  }, [consultationId]);

  const refreshWhatsAppStatus = useCallback(async () => {
    if (!consultationId) return null;
    const whatsappRes = await fetchWhatsAppConsultationStatus(consultationId, { enqueue: true });
    const whatsapp = whatsappRes.data?.message;
    if (whatsapp?.status) {
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              prescription: {
                ...(prev.prescription || {}),
                whatsapp,
              },
            }
          : prev
      );
      setWhatsappPollTimedOut(false);
    }
    return whatsapp;
  }, [consultationId]);

  useEffect(() => {
    if (!consultationId || loading || lookupFailed || cancelState) return;

    const initialStatus = summaryRef.current?.prescription?.whatsapp?.status;
    if (!shouldPollWhatsAppStatus(initialStatus)) {
      setWhatsappPolling(false);
      return;
    }

    const generation = ++whatsappPollGenerationRef.current;
    let stopped = false;

    const stopPolling = (timedOut = false) => {
      if (stopped || generation !== whatsappPollGenerationRef.current) return;
      stopped = true;
      setWhatsappPolling(false);
      if (timedOut) {
        setWhatsappPollTimedOut(true);
      }
    };

    const pollOnce = async () => {
      if (stopped || generation !== whatsappPollGenerationRef.current) return null;
      return refreshWhatsAppStatus();
    };

    const runPollCycle = async () => {
      setWhatsappPollTimedOut(false);
      setWhatsappPolling(true);
      const startedAt = Date.now();

      let whatsapp = await pollOnce();
      if (stopped) return;
      if (!shouldPollWhatsAppStatus(whatsapp?.status)) {
        stopPolling();
        return;
      }

      while (!stopped && generation === whatsappPollGenerationRef.current) {
        if (Date.now() - startedAt >= WHATSAPP_POLL_MAX_MS) {
          stopPolling(true);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, WHATSAPP_POLL_INTERVAL_MS));
        if (stopped) return;
        whatsapp = await pollOnce();
        if (stopped) return;
        if (!shouldPollWhatsAppStatus(whatsapp?.status)) {
          stopPolling();
          return;
        }
      }
    };

    void runPollCycle();

    return () => {
      stopped = true;
      whatsappPollGenerationRef.current += 1;
      setWhatsappPolling(false);
    };
  }, [cancelState, consultationId, loading, lookupFailed, refreshWhatsAppStatus]);

  const restartWhatsAppPolling = useCallback(() => {
    whatsappPollGenerationRef.current += 1;
    setWhatsappPollTimedOut(false);
    setWhatsappPolling(true);
    const generation = ++whatsappPollGenerationRef.current;

    void (async () => {
      const startedAt = Date.now();
      let whatsapp = await refreshWhatsAppStatus();
      if (generation !== whatsappPollGenerationRef.current) return;
      if (!shouldPollWhatsAppStatus(whatsapp?.status)) {
        setWhatsappPolling(false);
        return;
      }

      while (generation === whatsappPollGenerationRef.current) {
        if (Date.now() - startedAt >= WHATSAPP_POLL_MAX_MS) {
          setWhatsappPolling(false);
          setWhatsappPollTimedOut(true);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, WHATSAPP_POLL_INTERVAL_MS));
        if (generation !== whatsappPollGenerationRef.current) return;
        whatsapp = await refreshWhatsAppStatus();
        if (generation !== whatsappPollGenerationRef.current) return;
        if (!shouldPollWhatsAppStatus(whatsapp?.status)) {
          setWhatsappPolling(false);
          return;
        }
      }
    })();
  }, [refreshWhatsAppStatus]);

  const handleWhatsAppRetry = useCallback(async () => {
    const messageId = summary?.prescription?.whatsapp?.message_id;
    if (!messageId) return;
    setWhatsappRetrying(true);
    try {
      await retryWhatsAppDelivery(messageId);
      toast.success("WhatsApp delivery retry queued.");
      await refreshSummary();
      restartWhatsAppPolling();
    } catch (error: any) {
      const message =
        error?.response?.data?.detail || error?.message || "Unable to retry WhatsApp delivery.";
      if (error?.response?.status === 400) {
        await refreshSummary();
      }
      toast.error(message);
    } finally {
      setWhatsappRetrying(false);
    }
  }, [refreshSummary, restartWhatsAppPolling, summary?.prescription?.whatsapp?.message_id, toast]);

  const handleWhatsAppResend = useCallback(async () => {
    const prescriptionId = summary?.prescription?.prescription_id;
    if (!prescriptionId && !consultationId) return;
    setWhatsappResending(true);
    try {
      if (prescriptionId) {
        await resendWhatsAppDelivery(prescriptionId);
      } else {
        await resendWhatsAppConsultationDelivery(consultationId);
      }
      toast.success("WhatsApp delivery resend queued.");
      await refreshSummary();
      restartWhatsAppPolling();
    } catch (error: any) {
      const message =
        error?.response?.data?.detail || error?.message || "Unable to resend WhatsApp delivery.";
      toast.error(message);
    } finally {
      setWhatsappResending(false);
    }
  }, [consultationId, refreshSummary, restartWhatsAppPolling, summary?.prescription?.prescription_id, toast]);

  useEffect(() => {
    if (!encounterId || !consultationId || loading || lookupFailed) return;
    if (cancelState) return;
    const wasDownloaded = window.sessionStorage.getItem(downloadedKey(encounterId)) === "1";
    if (wasDownloaded || autoDownloadTriggeredRef.current) return;
    autoDownloadTriggeredRef.current = true;
    // Defer PDF so summary + iframe paint are not competing with a second heavy request.
    const t = window.setTimeout(() => {
      void downloadPdfRef.current(true);
    }, 350);
    return () => clearTimeout(t);
  }, [cancelState, consultationId, encounterId, loading, lookupFailed]);

  const handlePrint = useCallback(() => {
    if (cancelState) return;
    window.print();
  }, [cancelState]);

  const handleCancelConfirm = useCallback(
    async (reason: string, reasonText?: string) => {
      if (!consultationId) {
        toast.error("Consultation not found for cancellation.");
        return;
      }
      const doctorName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Doctor";
      setIsCancellingPrescription(true);
      try {
        await backendAxiosClient.post(`/consultations/${encodeURIComponent(consultationId)}/prescription/cancel/`, {
          reason_code: reason,
          reason_text: reasonText || "",
          source: "doctor",
        });
        const nextCancelState: CancelState = {
          reason,
          reasonText: reasonText || "",
          cancelledAt: formatDateTime(new Date().toISOString()),
          cancelledBy: doctorName.startsWith("Dr.") ? doctorName : `Dr. ${doctorName}`,
        };
        window.sessionStorage.setItem(cancelKey(encounterId), JSON.stringify(nextCancelState));
        setCancelState(nextCancelState);
        setShowCancelModal(false);
        toast.warning("Prescription marked as cancelled.");
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Failed to cancel prescription.";
        toast.error(message);
      } finally {
        setIsCancellingPrescription(false);
      }
    },
    [consultationId, encounterId, toast, user?.first_name, user?.last_name]
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-center text-sm font-medium text-foreground">Opening prescription summary…</p>
        <p className="text-center text-xs text-muted-foreground">Loading preview and details</p>
      </div>
    );
  }

  if (lookupFailed || !summary || !previewHtml) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold">Unable to load prescription workspace</p>
        <p className="text-sm text-muted-foreground">{lookupFailed || "Prescription summary unavailable."}</p>
        <Button type="button" onClick={() => router.push("/doctor-dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (!isCompleted) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold">Consultation is not completed yet</p>
        <p className="text-sm text-muted-foreground">
          This workspace is available only after consultation completion.
        </p>
        <Button type="button" onClick={() => router.push("/doctor-dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 bg-slate-50 pb-8">
      <PrescriptionSuccessHeader
        patientName={patientName}
        ageGender={ageGender}
        pnr={visitPnr}
        completedTime={formatTime(completedAt)}
        onPrint={handlePrint}
        onCancel={() => setShowCancelModal(true)}
        isCancelled={Boolean(cancelState)}
        actionsDisabled={isPdfDownloading && !cancelState}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          {pdfError ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Unable to auto-download prescription</AlertTitle>
              <AlertDescription className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{pdfError}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={() => downloadPdf(false)}
                  disabled={Boolean(cancelState) || isPdfDownloading}
                >
                  Download Again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div id="rx-print-area" className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
            {cancelState ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <span className="rotate-[-28deg] text-7xl font-bold tracking-[0.35em] text-red-500/15">CANCELLED</span>
              </div>
            ) : null}
            <iframe
              title="Prescription Preview"
              srcDoc={previewHtml}
              className="h-[1200px] w-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Prescription locked after consultation completion
            </span>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-28">
            <WhatsAppDeliveryCard
              delivery={summary?.prescription?.whatsapp}
              loading={whatsappPolling && !summary?.prescription?.whatsapp?.status}
              statusRefreshing={
                whatsappPolling && isWhatsAppQueuedStatus(summary?.prescription?.whatsapp?.status)
              }
              statusTimedOut={whatsappPollTimedOut && shouldPollWhatsAppStatus(summary?.prescription?.whatsapp?.status)}
              retrying={whatsappRetrying}
              resending={whatsappResending}
              onRefreshStatus={() => void refreshSummary()}
              onRetry={
                summary?.prescription?.whatsapp?.can_retry
                  ? () => void handleWhatsAppRetry()
                  : undefined
              }
              onResend={
                summary?.prescription?.whatsapp?.can_resend ||
                (whatsappPollTimedOut &&
                  (summary?.prescription?.prescription_id || consultationId))
                  ? () => void handleWhatsAppResend()
                  : undefined
              }
            />
            <PrescriptionActionsSidebar
              generatedAt={generatedAt}
              generatedBy={generatedBy}
              isCancelled={Boolean(cancelState)}
              cancelState={cancelState}
              onPrint={handlePrint}
              onDownload={() => downloadPdf(false)}
              actionsDisabled={isPdfDownloading}
            />
          </div>
        </div>
      </div>

      <StartNextConsultationSection
        onOpenSmartQueue={() => router.push("/doctor-dashboard?queue=open")}
        onSearchPatient={() => router.push("/doctor-dashboard?search=patient")}
      />

      <CancelPrescriptionModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onConfirm={handleCancelConfirm}
        isSubmitting={isCancellingPrescription}
      />

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #rx-print-area,
          #rx-print-area * {
            visibility: visible !important;
          }
          #rx-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
