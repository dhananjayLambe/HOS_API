"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatient } from "@/lib/patientContext";
import { useAuth } from "@/lib/authContext";
import { backendAxiosClient } from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Search, Pill, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsultationActionBar } from "@/components/consultations/consultation-action-bar";
import { ConsultationRightMenu } from "@/components/consultations/consultation-right-menu";
import { ConsultationDynamicDetailPanel } from "@/components/consultations/consultation-dynamic-detail-panel";
import { ConsultationSection } from "@/components/consultations/consultation-section";
import { ConsultationErrorBoundary } from "@/components/consultations/consultation-error-boundary";
import { ConsultationSectionScrollProvider } from "@/components/consultations/consultation-section-scroll-context";
import {
  ProceduresSection,
  SymptomsSection,
  FindingsSection,
  DiagnosisSection,
  InstructionsSection,
  InvestigationsSection,
  FollowUpSection,
} from "@/components/consultations/sections";
import { useConsultationStore } from "@/store/consultationStore";
import { useShallow } from "zustand/react/shallow";
import {
  isLeftPanelVisible,
  isSectionVisible,
  isMedicinesSectionExpandedByDefault,
} from "@/lib/consultation-workflow";
import { isUuidLike, loadPreConsultPreviewVitals } from "@/lib/loadPreConsultPreviewVitals";
import { syncQueueAfterConsultationStart } from "@/lib/syncQueueAfterConsultationStart";
import { useEncounterMultiTabLeader } from "@/hooks/useEncounterMultiTabLeader";
import { useEncounter } from "@/lib/encounterContext";

export default function StartConsultationContent() {
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();
  const [showAlert, setShowAlert] = useState(false);
  const [isResolvingOrCreating, setIsResolvingOrCreating] = useState(false);
  const entryFlowDoneRef = useRef(false);
  const { user } = useAuth();
  const doctorId = user?.user_id ?? null;
  const encounterIdFromUrl = searchParams.get("encounter_id");
  const encounterIdForLock =
    encounterIdFromUrl && isUuidLike(encounterIdFromUrl) ? encounterIdFromUrl : null;
  const { isSecondaryTab } = useEncounterMultiTabLeader(encounterIdForLock);
  const multiTabLocked = Boolean(encounterIdForLock && isSecondaryTab);
  const { invalidateEncounterById } = useEncounter();

  const {
    consultationType,
    setConsultationType,
    setEncounterId,
    setVitalsLoaded,
    sectionItems,
    diagnosisSchemaByKey,
    encounterId: encounterIdFromStore,
  } = useConsultationStore(
    useShallow((s) => ({
      consultationType: s.consultationType,
      setConsultationType: s.setConsultationType,
      setEncounterId: s.setEncounterId,
      setVitalsLoaded: s.setVitalsLoaded,
      sectionItems: s.sectionItems,
      diagnosisSchemaByKey: s.diagnosisSchemaByKey,
      encounterId: s.encounterId,
    }))
  );

  const diagnosisIdsForApi = useMemo(() => {
    const list = sectionItems.diagnosis ?? [];
    const out: string[] = [];
    for (const it of list) {
      const key = it.diagnosisKey;
      if (!key) continue;
      const row = diagnosisSchemaByKey[key] as { id?: string } | undefined;
      if (row?.id && isUuidLike(String(row.id))) {
        out.push(String(row.id));
      }
    }
    return out;
  }, [sectionItems.diagnosis, diagnosisSchemaByKey]);

  const redirectingDueToCancelledRef = useRef(false);
  const redirectedForEncounterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!encounterIdFromUrl) return;
    const { encounterId: storeEncounterId } = useConsultationStore.getState();
    if (storeEncounterId !== encounterIdFromUrl) {
      useConsultationStore.getState().reset();
      setEncounterId(encounterIdFromUrl);
    } else {
      setEncounterId(encounterIdFromUrl);
    }
    entryFlowDoneRef.current = true;
  }, [encounterIdFromUrl, setEncounterId]);

  const reloadPreviewVitals = useCallback(
    (signal?: AbortSignal) =>
      loadPreConsultPreviewVitals(encounterIdFromUrl ?? "", {
        signal,
        onSoftError: (msg) => toast.error(msg),
      }),
    [encounterIdFromUrl, toast]
  );

  // Load pre-consultation preview (including vitals) when encounter changes; abort in-flight on change/unmount.
  useEffect(() => {
    if (!encounterIdFromUrl || !isUuidLike(encounterIdFromUrl)) return;
    const ac = new AbortController();
    void reloadPreviewVitals(ac.signal);
    return () => ac.abort();
  }, [encounterIdFromUrl, reloadPreviewVitals]);

  // Helpdesk may save vitals after the doctor opened this page — refetch when tab becomes visible or window gains focus.
  useEffect(() => {
    if (!encounterIdFromUrl || !isUuidLike(encounterIdFromUrl)) return;
    const DEBOUNCE_MS = 400;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (document.visibilityState !== "visible") return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        void reloadPreviewVitals();
      }, DEBOUNCE_MS);
    };
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("focus", schedule);
    return () => {
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("focus", schedule);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [encounterIdFromUrl, reloadPreviewVitals]);

  // When opening with encounter_id in URL, detect cancelled visit and redirect so user starts a new one
  useEffect(() => {
    if (!encounterIdFromUrl || redirectingDueToCancelledRef.current) return;
    let cancelled = false;
    backendAxiosClient
      .get<{ status: string; cancelled?: boolean }>(`/consultations/encounter/${encounterIdFromUrl}/`)
      .then((res) => {
        if (cancelled) return;
        const st = (res.data?.status ?? "").toUpperCase().replace(/\s/g, "_");
        if (st === "CANCELLED" || res.data?.cancelled) {
          redirectingDueToCancelledRef.current = true;
          redirectedForEncounterIdRef.current = encounterIdFromUrl;
          toast.error("Visit already cancelled. Please start a new visit.");
          useConsultationStore.getState().reset();
          router.replace("/doctor-dashboard");
        }
      })
      .catch(() => {
        // On fetch error, leave user on page (encounter may still be valid)
      });
    return () => {
      cancelled = true;
    };
  }, [encounterIdFromUrl, router, toast]);

  // Direct Start Consultation: cancel any previous encounter, create new one, then start (skip pre-consultation).
  useEffect(() => {
    if (encounterIdFromUrl || !selectedPatient?.id || entryFlowDoneRef.current || isResolvingOrCreating) return;

    const runEntryFlow = async () => {
      setIsResolvingOrCreating(true);
      try {
        useConsultationStore.getState().reset();
        const startNewVisitRes = await backendAxiosClient.post<{
          encounter_id: string;
          visit_pnr?: string;
          status?: string;
          redirect_url?: string;
        }>("/consultations/entry/start-new-visit/", {
          patient_profile_id: selectedPatient.id,
        });
        const encounterId = startNewVisitRes.data?.encounter_id;
        if (!encounterId) {
          toast.error("Failed to create encounter. Invalid response.");
          entryFlowDoneRef.current = true;
          return;
        }

        // Existing encounter (200): follow API redirect (usually pre-consultation) so we do not open
        // start-consultation without a Consultation row (Preview Rx would stay disabled).
        const isExistingEncounter = startNewVisitRes.status === 200;
        if (isExistingEncounter) {
          setEncounterId(encounterId);
          entryFlowDoneRef.current = true;
          const redirect =
            startNewVisitRes.data?.redirect_url?.trim() ||
            `/consultations/pre-consultation?encounter_id=${encounterId}`;
          router.replace(redirect, { scroll: false });
          return;
        }

        const startConsultation = async (attempt = 0): Promise<void> => {
          const maxAttempts = 3;
          try {
            await backendAxiosClient.post(`/consultations/encounter/${encounterId}/consultation/start/`);
          } catch (startErr: unknown) {
            const ax = startErr as { response?: { data?: { detail?: string; message?: string }; status?: number } };
            if (ax.response?.status === 409 && attempt < maxAttempts - 1) {
              await new Promise((r) => setTimeout(r, 250));
              return startConsultation(attempt + 1);
            }
            const detail = (ax.response?.data?.detail ?? ax.response?.data?.message ?? "") as string;
            const msg = detail || "Cannot start consultation.";
            if (ax.response?.status === 400) {
              if (detail?.toLowerCase().includes("cancelled")) {
                toast.error("Visit already cancelled. Please start a new visit.");
                router.replace("/doctor-dashboard");
                throw startErr;
              }
              // Already in progress: open that visit instead of cancelling and sending to dashboard
              if (detail?.toLowerCase().includes("already in progress") || detail?.toLowerCase().includes("consultation already")) {
                toast.success("Opening existing visit.");
                setEncounterId(encounterId);
                entryFlowDoneRef.current = true;
                void syncQueueAfterConsultationStart(encounterId);
                invalidateEncounterById(encounterId);
                router.replace(`/consultations/start-consultation?encounter_id=${encounterId}`, { scroll: false });
                throw startErr;
              }
              toast.error(msg);
              router.replace("/doctor-dashboard");
              throw startErr;
            }
            toast.error(msg);
            throw startErr;
          }
        };
        await startConsultation();
        await syncQueueAfterConsultationStart(encounterId);
        invalidateEncounterById(encounterId);

        setEncounterId(encounterId);
        entryFlowDoneRef.current = true;
        router.replace(`/consultations/start-consultation?encounter_id=${encounterId}`, { scroll: false });
      } catch (err: unknown) {
        const ax = err as {
          response?: { data?: { detail?: string; message?: string; error?: string }; status?: number };
          message?: string;
        };
        if (ax.response?.status === 400) {
          entryFlowDoneRef.current = true;
          return;
        }
        const data = ax.response?.data;
        const msg =
          (typeof data?.detail === "string" ? data.detail : null) ??
          (typeof data?.message === "string" ? data.message : null) ??
          (typeof data?.error === "string" ? data.error : null) ??
          (ax as Error).message ??
          "Failed to start consultation.";
        toast.error(String(msg));
        entryFlowDoneRef.current = true;
      } finally {
        setIsResolvingOrCreating(false);
      }
    };

    runEntryFlow();
  }, [selectedPatient?.id, encounterIdFromUrl, isResolvingOrCreating, router, setEncounterId, toast]);

  const showLeftPanel = useMemo(
    () => isLeftPanelVisible(consultationType),
    [consultationType]
  );
  const medicinesDefaultOpen = useMemo(
    () => isMedicinesSectionExpandedByDefault(consultationType),
    [consultationType]
  );
  useEffect(() => {
    if (!selectedPatient) {
      setShowAlert(true);
    }
  }, [selectedPatient]);

  // Default to Full Consultation when opening the page or when switching patient
  useEffect(() => {
    if (selectedPatient) {
      setConsultationType("FULL");
    }
  }, [selectedPatient?.id, setConsultationType]);

  const handleAlertClose = () => {
    setShowAlert(false);
    router.push("/doctor-dashboard");
  };

  if (!selectedPatient) {
    return (
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>

        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle className="text-xl">Select Patient First</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Please select a patient from the search bar at the top to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
            <Search className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="text-sm text-purple-900 dark:text-purple-200">
              Look for the <span className="font-semibold">"Select Patient"</span> search bar in the
              header
            </p>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction
              onClick={() => {
                setShowAlert(false);
                triggerSearchHighlight();
                router.push("/doctor-dashboard");
              }}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white order-1"
            >
              Show Search Bar
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleAlertClose}
              className="w-full sm:w-auto order-2"
            >
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (!encounterIdFromUrl && isResolvingOrCreating) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm font-medium">Setting up consultation…</p>
      </div>
    );
  }

  const ACTION_BAR_HEIGHT = 56; // h-14 in action bar
  const STICKY_TOP_PANELS = ACTION_BAR_HEIGHT + 12; // 68px below action bar
  const gridCols = showLeftPanel
    ? "lg:grid-cols-[minmax(0,18%)_1fr_minmax(0,28%)]"
    : "lg:grid-cols-[1fr_minmax(0,28%)]";

  return (
    <ConsultationErrorBoundary>
      <ConsultationSectionScrollProvider>
      <>
        {multiTabLocked && (
          <div
            role="status"
            className="shrink-0 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 sm:px-4 md:px-5 lg:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                This patient is open in another tab.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto" asChild>
              <Link href="/doctor-dashboard">Go to dashboard</Link>
            </Button>
          </div>
        )}
        <div
          className={`flex min-h-0 flex-1 flex-col mt-0 pt-0 overflow-x-hidden min-w-0 w-full max-w-full ${multiTabLocked ? "pointer-events-none select-none opacity-60" : ""}`}
        >
        <ConsultationActionBar />
        <div className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 min-h-0 overflow-x-hidden px-3 sm:px-4 md:px-5 lg:px-6 pt-3 sm:pt-4 pb-6 pb-safe sm:pb-8 flex flex-col overflow-y-auto lg:overflow-y-hidden">
          <div
            className={`grid w-full max-w-full min-w-0 gap-3 sm:gap-4 md:gap-5 grid-cols-1 ${gridCols} grid-rows-[auto_auto_auto] lg:grid-rows-[1fr] flex-1 min-h-0`}
            style={{ width: "100%", minWidth: 0 }}
          >
            {showLeftPanel && (
              <div
                className="min-w-0 overflow-y-auto pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden order-2 lg:order-none lg:sticky lg:max-h-[calc(100vh-120px)]"
                style={{ top: STICKY_TOP_PANELS } as React.CSSProperties}
              >
                <ConsultationRightMenu />
              </div>
            )}
            <div
              id="consultation-container"
              className="min-w-0 min-h-0 overflow-y-auto lg:overflow-y-scroll lg:max-h-[calc(100vh-120px)] pr-2 sm:pr-4 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 order-1 lg:order-none"
            >
              <div className="space-y-3 sm:space-y-4">
                {isSectionVisible(consultationType, "symptoms") && <SymptomsSection />}
                {isSectionVisible(consultationType, "findings") && <FindingsSection />}
                {isSectionVisible(consultationType, "diagnosis") && <DiagnosisSection />}
                {isSectionVisible(consultationType, "medicines") && (
                  <ConsultationSection
                    type="medicines"
                    title="Medicines"
                    icon={<Pill className="text-muted-foreground" />}
                    defaultOpen={medicinesDefaultOpen}
                    medicineApiContext={
                      doctorId && selectedPatient?.id
                        ? {
                            doctorId,
                            patientId: selectedPatient.id,
                            consultationId: encounterIdFromUrl ?? encounterIdFromStore,
                            diagnosisIds: diagnosisIdsForApi,
                          }
                        : null
                    }
                  />
                )}
                {isSectionVisible(consultationType, "investigations") && (
                  <InvestigationsSection />
                )}
                {isSectionVisible(consultationType, "instructions") && (
                  <InstructionsSection />
                )}
                {isSectionVisible(consultationType, "follow_up") && <FollowUpSection />}
                {isSectionVisible(consultationType, "procedure") && <ProceduresSection />}
              </div>
            </div>
            <div
              className="min-w-0 overflow-y-scroll order-3 lg:order-none lg:sticky lg:max-h-[calc(100vh-120px)] pr-2 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
              style={{ top: STICKY_TOP_PANELS } as React.CSSProperties}
            >
              <ConsultationDynamicDetailPanel />
            </div>
          </div>
        </div>
      </div>
      </>
      </ConsultationSectionScrollProvider>
    </ConsultationErrorBoundary>
  );
}
