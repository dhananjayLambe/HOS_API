"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, FileText, Eye, X, MoreHorizontal, Stethoscope, CheckCircle, LayoutList, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsultationStore } from "@/store/consultationStore";
import { usePatient } from "@/lib/patientContext";
import { backendAxiosClient } from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConsultationWorkflowType } from "@/lib/consultation-types";
import { ViewPreDrawer } from "./view-pre-drawer";
import { draftFindingsToEndConsultationPayload } from "@/lib/consultation-findings-helpers";

const CONSULTATION_TYPE_LABELS: Record<ConsultationWorkflowType, string> = {
  FULL: "Full Consultation",
  QUICK_RX: "Quick Prescription",
  TEST_ONLY: "Test Only Visit",
};

function isFollowUpSet(store: ReturnType<typeof useConsultationStore.getState>): boolean {
  const { follow_up_date, follow_up_interval } = store;
  return !!(follow_up_date?.trim() || follow_up_interval > 0);
}

export function ConsultationActionBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();
  const { selectedPatient } = usePatient();
  const { setSelectedDetail, consultationType, setConsultationType, encounterId: storeEncounterId } = useConsultationStore();
  const encounterIdFromUrl = searchParams.get("encounter_id");
  const encounterId = storeEncounterId || encounterIdFromUrl;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);
  const [showEndConsultationConfirm, setShowEndConsultationConfirm] = useState(false);
  const [showStartNewVisitConfirm, setShowStartNewVisitConfirm] = useState(false);
  const [showViewPre, setShowViewPre] = useState(false);
  const [isEndingConsultation, setIsEndingConsultation] = useState(false);
  const [isStartingNewVisit, setIsStartingNewVisit] = useState(false);
  const [endConsultationTestData, setEndConsultationTestData] = useState<Record<string, unknown> | null>(null);
  const [loadingTestData, setLoadingTestData] = useState(false);
  const [visitPnr, setVisitPnr] = useState<string | null>(null);

  // Fetch visit_pnr when encounterId is available
  useEffect(() => {
    if (!encounterId) {
      setVisitPnr(null);
      return;
    }
    let cancelled = false;
    backendAxiosClient
      .get<{ visit_pnr?: string }>(`/consultations/encounter/${encounterId}/`)
      .then((res) => {
        if (!cancelled && res.data?.visit_pnr) setVisitPnr(res.data.visit_pnr);
      })
      .catch(() => setVisitPnr(null));
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  const copyPnrToClipboard = () => {
    if (!visitPnr) return;
    navigator.clipboard.writeText(visitPnr).then(() => {
      toast.success("Visit PNR copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy PNR");
    });
  };

  // Intercept browser back so the same "Unsaved changes" dialog appears; on confirm, same as Cancel (reset + dashboard)
  useEffect(() => {
    const stateKey = "consultation-unsaved";
    if (typeof window === "undefined") return;
    window.history.pushState({ [stateKey]: true }, "");
    const onPopState = (e: PopStateEvent) => {
      window.history.pushState({ [stateKey]: true }, "");
      setShowCancelConfirm(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // For testing: when End Consultation dialog opens, fetch encounter + instructions and snapshot store
  useEffect(() => {
    if (!showEndConsultationConfirm || !encounterId) {
      setEndConsultationTestData(null);
      return;
    }
    setLoadingTestData(true);
    const store = useConsultationStore.getState();
    const storeSnapshot: Record<string, unknown> = {
      encounterId: store.encounterId,
      consultationType: store.consultationType,
      draftStatus: store.draftStatus,
      symptoms: store.symptoms,
      findings: store.findings,
      diagnosis: store.diagnosis,
      medicines: store.medicines,
      investigations: store.investigations,
      instructions: store.instructions,
      procedures: store.procedures,
      medicalHistory: store.medicalHistory,
      vitals: store.vitals,
      prescriptionNotes: store.prescriptionNotes,
      doctorNotes: store.doctorNotes,
      follow_up_interval: store.follow_up_interval,
      follow_up_unit: store.follow_up_unit,
      follow_up_date: store.follow_up_date,
      follow_up_reason: store.follow_up_reason,
      follow_up_early_if_persist: store.follow_up_early_if_persist,
      sectionItems: store.sectionItems,
      draftFindings: store.draftFindings,
      instructionsList: store.instructionsList,
      consultationFinalized: store.consultationFinalized,
      selectedDetail: store.selectedDetail,
    };
    const preConsultSectionCodes = ["vitals", "chief_complaint", "allergies", "medical_history"];
    const preConsultFetches = preConsultSectionCodes.map((code) =>
      backendAxiosClient
        .get(`/consultations/pre-consult/encounter/${encounterId}/section/${code}/`)
        .then((r) => ({ code, data: r.data?.data ?? null }))
        .catch(() => ({ code, data: null }))
    );
    Promise.all([
      backendAxiosClient.get(`/consultations/encounter/${encounterId}/`).then((r) => r.data).catch((e) => ({ error: e.message || "Failed to fetch encounter" })),
      backendAxiosClient.get(`/consultations/encounter/${encounterId}/instructions/`).then((r) => r.data).catch((e) => ({ error: e.message || "Failed to fetch instructions" })),
      Promise.all(preConsultFetches).then((results) => {
        const sections: Record<string, unknown> = {};
        results.forEach(({ code, data }) => {
          sections[code] = data;
        });
        return { encounter_id: encounterId, ...sections };
      }),
    ]).then(([encounter, instructions, pre_consultation]) => {
      setEndConsultationTestData({
        encounter,
        instructions,
        pre_consultation,
        store: storeSnapshot,
      });
    }).catch(() => setEndConsultationTestData({ store: storeSnapshot, encounter: null, instructions: null, pre_consultation: null }))
      .finally(() => setLoadingTestData(false));
  }, [showEndConsultationConfirm, encounterId]);

  const handleTypeChange = (nextType: ConsultationWorkflowType) => {
    if (nextType !== consultationType) {
      setConsultationType(nextType);
    }
  };

  const handleEndConsultation = async () => {
    const id = encounterId;
    if (!id) {
      toast.error("Encounter not found. Refresh the page or go back to the consultation.");
      return;
    }
    setIsEndingConsultation(true);
    try {
      const store = useConsultationStore.getState();
      const res = await backendAxiosClient.post<{ redirect_url?: string }>(
        `/consultations/encounter/${id}/consultation/complete/`,
        {
          symptoms: store.symptoms,
          findings: draftFindingsToEndConsultationPayload(store.draftFindings),
        }
      );
      const url = res.data?.redirect_url || "/doctor-dashboard";
      useConsultationStore.getState().reset();
      router.push(url);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to end consultation.";
      toast.error(msg);
    } finally {
      setIsEndingConsultation(false);
      setShowEndConsultationConfirm(false);
    }
  };

  const handleStartNewVisit = async () => {
    if (!selectedPatient?.id) {
      toast.error("Select a patient first.");
      return;
    }
    setIsStartingNewVisit(true);
    try {
      const res = await backendAxiosClient.post<{ redirect_url?: string }>(
        "/consultations/entry/start-new-visit/",
        { patient_profile_id: selectedPatient.id }
      );
      const url = res.data?.redirect_url || "/consultations/pre-consultation";
      useConsultationStore.getState().reset();
      router.push(url);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to start new visit.";
      toast.error(msg);
    } finally {
      setIsStartingNewVisit(false);
      setShowStartNewVisitConfirm(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex h-12 min-h-12 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[#eee] bg-white px-3 sm:px-4 md:px-5 shadow-sm dark:border-border dark:bg-background">
        <div className="flex shrink-0 items-center gap-2 md:gap-3 min-h-0">
          <Button
            variant="outline"
            size="sm"
            aria-label="Back to appointments"
            onClick={() => setShowCancelConfirm(true)}
            className="gap-1.5 h-8 shrink-0 rounded-lg border-border/80 bg-muted/60 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted hover:border-muted-foreground/30 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Back</span>
          </Button>
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight sm:text-base truncate min-w-0">
            <Stethoscope className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
            <span className="hidden sm:inline">Consultation</span>
            <span className="sm:hidden">Consultation</span>
          </span>
          {encounterId && (
            <div className="flex items-center gap-1.5 shrink-0 rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1">
              <span className="text-xs font-medium text-muted-foreground">PNR:</span>
              <span className="text-xs font-mono text-foreground truncate max-w-[140px] sm:max-w-[200px]" title={visitPnr ?? undefined}>
                {visitPnr ?? "…"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 rounded"
                onClick={copyPnrToClipboard}
                disabled={!visitPnr}
                aria-label="Copy visit PNR"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex min-w-0 shrink items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_button]:shrink-0">
          {/* Consultation type dropdown (before Templates) */}
          <div className="shrink-0">
            <Select
              value={consultationType || "FULL"}
              onValueChange={(v) => handleTypeChange(v as ConsultationWorkflowType)}
            >
              <SelectTrigger
                className="w-[200px] min-h-[40px] rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700 text-sm font-semibold text-foreground shadow-sm transition-colors focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:border-violet-400 dark:focus:border-violet-500 data-[state=open]:border-violet-400 dark:data-[state=open]:border-violet-500 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/30 shrink-0 gap-2 pl-3"
                aria-label="Consultation type"
              >
                <LayoutList className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
                <SelectValue placeholder="Full Consultation" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 shadow-lg min-w-[200px]">
                <SelectItem
                  value="FULL"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.FULL}
                </SelectItem>
                <SelectItem
                  value="QUICK_RX"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.QUICK_RX}
                </SelectItem>
                <SelectItem
                  value="TEST_ONLY"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.TEST_ONLY}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* 1. Templates */}
          <div className="hidden md:block">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Templates
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          {/* 2. View Pre Consultation */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg min-h-[44px] touch-manipulation md:min-h-0"
            onClick={() => setShowViewPre(true)}
            disabled={!encounterId}
          >
            <FileText className="h-4 w-4" />
            View Pre
          </Button>
          {/* Start New Visit – on consultation page only (not on pre-consultation) */}
          {/* <Button
            size="sm"
            variant="secondary"
            className="gap-1.5 rounded-lg min-h-[44px] touch-manipulation md:min-h-0"
            onClick={() => setShowStartNewVisitConfirm(true)}
          >
            {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start New Visit
          </Button> */}
          {/* 3. Preview Rx */}
          <div className="hidden md:block">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg border-violet-200 dark:border-violet-800 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 hover:text-violet-800 dark:hover:text-violet-200"
            >
              <Eye className="h-4 w-4" />
              Preview Rx
            </Button>
          </div>
          {/* 4. End Consultation */}
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] touch-manipulation md:min-h-0 border-0"
            onClick={() => setShowEndConsultationConfirm(true)}
          >
            {isEndingConsultation ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            End Consultation
          </Button>
          {/* Mobile: Actions dropdown (Templates, Preview Rx – View Pre & End Consultation are buttons above) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg md:hidden min-h-[44px] touch-manipulation">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2 py-3">
                <FileText className="h-4 w-4" />
                Templates
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-3">
                <Eye className="h-4 w-4" />
                Preview Rx
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            {/* Cancel button – uncomment to show in header */}
            {/* <Button
              size="sm"
              className="gap-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 min-h-[44px] touch-manipulation md:min-h-0 border-0"
              onClick={() => setShowCancelConfirm(true)}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button> */}
        </div>
      </div>

      <AlertDialog open={showCancelConfirm} onOpenChange={(open) => !isCancelling && setShowCancelConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes will be lost. This visit will be marked as cancelled and you can start a new one. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Stay</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={async () => {
                const id = encounterId;
                if (!id) {
                  toast.error("Cannot cancel: no encounter. Refresh the page or go back to the dashboard.");
                  return;
                }
                setIsCancelling(true);
                try {
                  await backendAxiosClient.post(`/consultations/encounter/${id}/cancel/`);
                } catch (err: unknown) {
                  const ax = err as { response?: { data?: { detail?: string }; status?: number } };
                  const msg = ax.response?.data?.detail ?? "Failed to cancel visit.";
                  toast.error(String(msg));
                  setIsCancelling(false);
                  return;
                }
                useConsultationStore.getState().reset();
                setShowCancelConfirm(false);
                setIsCancelling(false);
                toast.success("Visit cancelled. You can start a new visit from the dashboard.");
                // Defer navigation to next tick so React can commit state and avoid hook-order issues during transition
                setTimeout(() => {
                  router.replace("/doctor-dashboard");
                }, 0);
              }}
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancel consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFollowUpConfirm} onOpenChange={setShowFollowUpConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No follow-up scheduled</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to continue without scheduling a follow-up visit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFollowUpConfirm(false)}>
              Continue
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFollowUpConfirm(false);
                setSelectedDetail({ section: "follow_up" });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Follow-Up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEndConsultationConfirm} onOpenChange={setShowEndConsultationConfirm}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>End consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end this consultation? This will lock the encounter.
              {!isFollowUpSet(useConsultationStore.getState()) && " You have not set a follow-up; you can still end the consultation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/30 p-2 my-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Testing: all data (encounter, instructions, store snapshot)</p>
            {loadingTestData ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : endConsultationTestData ? (
              <pre className="text-xs overflow-auto max-h-[40vh] p-2 rounded bg-background border whitespace-pre-wrap break-words">
                {JSON.stringify(endConsultationTestData, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No data (missing encounter_id?)</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEndingConsultation}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndConsultation} disabled={isEndingConsultation} className="bg-blue-600 hover:bg-blue-700">
              {isEndingConsultation ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              End Consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showStartNewVisitConfirm} onOpenChange={setShowStartNewVisitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start new visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This visit is still active. End this visit and start a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStartingNewVisit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartNewVisit} disabled={isStartingNewVisit} className="bg-blue-600 hover:bg-blue-700">
              {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              End & Start New Visit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {encounterId && (
        <ViewPreDrawer
          open={showViewPre}
          onOpenChange={setShowViewPre}
          encounterId={encounterId}
        />
      )}
    </>
  );
}
