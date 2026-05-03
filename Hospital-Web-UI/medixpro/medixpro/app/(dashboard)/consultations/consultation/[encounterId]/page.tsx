"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { backendAxiosClient } from "@/lib/axiosClient";
import { syncQueueAfterConsultationStart } from "@/lib/syncQueueAfterConsultationStart";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { useEncounterMultiTabLeader } from "@/hooks/useEncounterMultiTabLeader";
import { useEncounter } from "@/lib/encounterContext";

type EncounterStatus =
  | "CREATED"
  | "PRE_CONSULTATION_IN_PROGRESS"
  | "PRE_CONSULTATION_COMPLETED"
  | "CONSULTATION_IN_PROGRESS"
  | "CONSULTATION_COMPLETED"
  | "CLOSED"
  | "CANCELLED";

interface EncounterDetail {
  id: string;
  visit_pnr: string;
  status: EncounterStatus;
  cancelled?: boolean;
  check_in_time: string | null;
  consultation_start_time: string | null;
  consultation_end_time: string | null;
  closed_at: string | null;
  created_at: string;
}

export default function ConsultationByEncounterPage() {
  const router = useRouter();
  const params = useParams();
  const encounterId = params?.encounterId as string | undefined;
  const toast = useToastNotification();
  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const redirectedForCancelledRef = useRef(false);

  const { isSecondaryTab } = useEncounterMultiTabLeader(encounterId);
  const { invalidateEncounterById } = useEncounter();

  const fetchEncounter = async () => {
    if (!encounterId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const response = await backendAxiosClient.get<EncounterDetail>(
        `/consultations/encounter/${encounterId}/`
      );
      const data = response.data;
      const statusNorm = (data.status ?? "").toUpperCase().replace(/ /g, "_");
      if (statusNorm === "CANCELLED" || data.cancelled) {
        if (!redirectedForCancelledRef.current) {
          redirectedForCancelledRef.current = true;
          toast.error("Visit already cancelled. Please start a new visit.");
          router.replace("/doctor-dashboard");
        }
        setLoading(true); // keep loading until redirect
        return;
      }
      setEncounter(data);
    } catch (error: any) {
      const isNetworkError = !error.response;
      const msg = isNetworkError
        ? "Could not reach the server. Check that the backend is running and try again."
        : error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Failed to load encounter.";
      setFetchError(msg);
      toast.error(msg);
      if (error.response?.status === 404) {
        router.replace("/doctor-dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!encounterId) {
      setLoading(false);
      return;
    }
    fetchEncounter();
  }, [encounterId]);

  // Redirect to start-consultation when status is CONSULTATION_IN_PROGRESS (must run unconditionally for Rules of Hooks)
  const statusNormalized = encounter ? (encounter.status || "").toUpperCase().replace(/ /g, "_") : "";
  const openConsultationDirectly = statusNormalized === "CONSULTATION_IN_PROGRESS";
  const readyToAutoStart =
    statusNormalized === "PRE_CONSULTATION_COMPLETED" || statusNormalized === "CREATED";
  const autoStartDoneRef = useRef(false);

  useEffect(() => {
    if (encounterId && openConsultationDirectly) {
      invalidateEncounterById(encounterId);
      router.replace(
        `/consultations/start-consultation?encounter_id=${encounterId}`
      );
    }
  }, [encounterId, openConsultationDirectly, router, invalidateEncounterById]);

  // Auto-start consultation when pre-consultation is completed (no extra click). Run once per encounter.
  useEffect(() => {
    if (!encounterId || !encounter || !readyToAutoStart || autoStartDoneRef.current) return;
    if (isSecondaryTab) return;
    autoStartDoneRef.current = true;
    setStarting(true);
    toast.success("Starting consultation...");
    backendAxiosClient
      .post<{ redirect_url?: string }>(`/consultations/encounter/${encounterId}/consultation/start/`)
      .then(async (response) => {
        await syncQueueAfterConsultationStart(encounterId);
        invalidateEncounterById(encounterId);
        const redirectUrl =
          response.data?.redirect_url || `/consultations/start-consultation?encounter_id=${encounterId}`;
        router.push(redirectUrl);
      })
      .catch((error: any) => {
        setStarting(false);
        const msg =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Failed to start consultation.";
        toast.error(msg);
      });
    // Intentionally depend only on encounterId and readyToAutoStart so we run once when encounter is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId, encounter?.id, readyToAutoStart, isSecondaryTab]);

  const handleStartConsultation = async () => {
    if (!encounterId) return;
    if (isSecondaryTab) {
      toast.error("This patient is open in another tab. Use that tab to continue.");
      return;
    }
    setStarting(true);
    try {
      const response = await backendAxiosClient.post<{
        redirect_url?: string;
        status?: string;
        detail?: string;
      }>(`/consultations/encounter/${encounterId}/consultation/start/`);
      await syncQueueAfterConsultationStart(encounterId);
      invalidateEncounterById(encounterId);
      const redirectUrl =
        response.data?.redirect_url || `/consultations/start-consultation?encounter_id=${encounterId}`;
      router.push(redirectUrl);
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Failed to start consultation.";
      toast.error(msg);
    } finally {
      setStarting(false);
    }
  };

  if (loading && !encounter && !fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading encounter...</p>
      </div>
    );
  }

  if (fetchError && !encounter) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 max-w-md mx-auto px-4">
        <p className="text-sm text-destructive text-center">{fetchError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchEncounter()}>
            Retry
          </Button>
          <Button variant="default" onClick={() => router.push("/doctor-dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!encounter) {
    return null;
  }

  const status = statusNormalized;
  const multiTabLocked = Boolean(encounterId && isSecondaryTab);
  const showStartButton =
    (status === "PRE_CONSULTATION_COMPLETED" || status === "CREATED") && !starting;

  // Show loading while redirecting (CONSULTATION_IN_PROGRESS) or while auto-starting
  if (openConsultationDirectly || (readyToAutoStart && starting)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">
          {readyToAutoStart ? "Starting consultation..." : "Opening consultation..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8 max-w-2xl mx-auto">
      {multiTabLocked && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
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
      <div className="flex items-center gap-4">
        <Link href="/doctor-dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultation</h1>
          <p className="text-muted-foreground">
            Visit {encounter.visit_pnr || encounter.id}
          </p>
        </div>
      </div>

      <div
        className={`rounded-lg border bg-card p-6 space-y-4 ${multiTabLocked ? "pointer-events-none opacity-60" : ""}`}
      >
        <p className="text-sm text-muted-foreground">
          Status: <span className="font-medium text-foreground">{status}</span>
        </p>

        {showStartButton && (
          <Button
            onClick={handleStartConsultation}
            disabled={starting || multiTabLocked}
            className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Stethoscope className="h-4 w-4" />
            )}
            Start Consultation
          </Button>
        )}

        {!showStartButton && status !== "CONSULTATION_IN_PROGRESS" && (
          <p className="text-sm text-muted-foreground">
            This encounter is not in a state that allows starting consultation.
            Return to dashboard or pre-consultation as needed.
          </p>
        )}
      </div>
    </div>
  );
}
