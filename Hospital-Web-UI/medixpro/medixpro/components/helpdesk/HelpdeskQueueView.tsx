"use client";

import { ActiveQueueList } from "./ActiveQueueList";
import { HelpdeskQueueVitalsForm } from "./HelpdeskQueueVitalsForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  isHelpdeskQueueCalendarDayStale,
  mapVisitVitalsApiResponse,
  maskMobile,
  useFilteredQueueEntries,
  useHelpdeskQueueStore,
  vitalsPreviewLine,
  type HelpdeskVitalsPayload,
  type QueueEntry,
  type QueueStatus,
} from "@/lib/helpdeskQueueStore";
import { useIsMobile } from "@/components/ui/use-mobile";
import axiosClient from "@/lib/axiosClient";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Stethoscope } from "lucide-react";

const statusLabel: Record<QueueStatus, string> = {
  waiting: "Waiting",
  vitals_done: "Pre-consultation in progress",
  in_consultation: "In consultation",
  completed: "Completed",
};

function ageGenderLine(entry: QueueEntry): string | undefined {
  const age = entry.age != null ? `${entry.age}y` : null;
  const g = entry.gender?.trim();
  if (!age && !g) return undefined;
  if (age && g) return `${age} · ${g}`;
  return age ?? g ?? undefined;
}

function QueuePatientPanel({
  entry,
  onOpenVitals,
  onUrgent,
}: {
  entry: QueueEntry;
  onOpenVitals: () => void;
  onUrgent: () => void;
}) {
  const preview = vitalsPreviewLine(entry.vitals);
  const canOpenVitals = entry.status === "waiting" || entry.status === "vitals_done";

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{entry.name}</h3>
          <Badge variant="secondary">{statusLabel[entry.status]}</Badge>
        </div>
        {ageGenderLine(entry) ? (
          <p className="text-sm text-muted-foreground">{ageGenderLine(entry)}</p>
        ) : null}
        <p className="text-sm text-muted-foreground tabular-nums">{maskMobile(entry.mobile)}</p>
        {entry.visitPnr || entry.visitId ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">Visit {entry.visitPnr ?? entry.visitId}</p>
        ) : null}
        {preview ? <p className="mt-2 text-sm text-muted-foreground">{preview}</p> : null}
      </div>

      {canOpenVitals ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="gap-2" onClick={onOpenVitals} disabled={!canOpenVitals}>
            <Stethoscope className="h-4 w-4" />
            Vitals
          </Button>
          <Button type="button" variant="outline" onClick={onUrgent}>
            Urgent
          </Button>
        </div>
      ) : null}

      {entry.status === "vitals_done" && (
        <p className="text-sm text-muted-foreground">Ready for doctor pre-consult review.</p>
      )}
      {entry.status === "in_consultation" && (
        <p className="text-sm text-muted-foreground">Patient is in consultation.</p>
      )}
      {entry.status === "completed" && (
        <p className="text-sm text-muted-foreground">Visit completed.</p>
      )}
    </div>
  );
}

export function HelpdeskQueueView() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const list = useFilteredQueueEntries();
  const entries = useHelpdeskQueueStore((s) => s.entries);
  const saveVitals = useHelpdeskQueueStore((s) => s.saveVitals);
  const moveToTop = useHelpdeskQueueStore((s) => s.moveToTop);
  const removeFromQueue = useHelpdeskQueueStore((s) => s.removeFromQueue);
  const fetchTodayQueue = useHelpdeskQueueStore((s) => s.fetchTodayQueue);
  const highlightQueueEntryId = useHelpdeskQueueStore((s) => s.highlightQueueEntryId);
  const setHighlightQueueEntryId = useHelpdeskQueueStore((s) => s.setHighlightQueueEntryId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetMode, setMobileSheetMode] = useState<"patient" | "vitals">("patient");
  const [vitalsDialogOpen, setVitalsDialogOpen] = useState(false);
  const [vitalsEntryId, setVitalsEntryId] = useState<string | null>(null);
  const [vitalsFormInitial, setVitalsFormInitial] = useState<HelpdeskVitalsPayload | null>(null);
  const [vitalsFormLoading, setVitalsFormLoading] = useState(false);
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);

  const selected = useMemo(() => entries.find((e) => e.id === selectedId) ?? null, [entries, selectedId]);
  const vitalsEntry = useMemo(() => entries.find((e) => e.id === vitalsEntryId) ?? null, [entries, vitalsEntryId]);

  useEffect(() => {
    if (!vitalsEntryId) {
      setVitalsFormInitial(null);
      setVitalsFormLoading(false);
      return;
    }
    const entry = useHelpdeskQueueStore.getState().entries.find((e) => e.id === vitalsEntryId);
    if (!entry?.visitId) {
      setVitalsFormInitial(null);
      setVitalsFormLoading(false);
      return;
    }
    setVitalsFormLoading(true);
    setVitalsFormInitial(null);
    const visitId = entry.visitId;
    const fallback = entry.vitals;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosClient.get<Record<string, unknown>>(`/visits/${visitId}/vitals/`);
        if (cancelled) return;
        setVitalsFormInitial(mapVisitVitalsApiResponse(data) ?? fallback ?? null);
      } catch {
        if (cancelled) return;
        setVitalsFormInitial(fallback ?? null);
      } finally {
        if (!cancelled) setVitalsFormLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vitalsEntryId]);

  useEffect(() => {
    if (selectedId && !entries.some((e) => e.id === selectedId)) {
      setSelectedId(null);
    }
    if (vitalsEntryId && !entries.some((e) => e.id === vitalsEntryId)) {
      setVitalsEntryId(null);
      setVitalsDialogOpen(false);
      setMobileSheetOpen(false);
    }
  }, [entries, selectedId, vitalsEntryId]);

  useEffect(() => {
    if (!highlightQueueEntryId) return;
    setSelectedId(highlightQueueEntryId);
    setHighlightedId(highlightQueueEntryId);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const el = document.querySelector(`[data-queue-entry-id="${highlightQueueEntryId}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    if (isMobile) {
      setMobileSheetMode("patient");
      setMobileSheetOpen(true);
    }
    setHighlightQueueEntryId(null);
  }, [highlightQueueEntryId, isMobile, setHighlightQueueEntryId]);

  useEffect(() => {
    if (!highlightedId) return;
    const timer = window.setTimeout(() => setHighlightedId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);

  useEffect(() => {
    let cancelled = false;
    const runFetch = async () => {
      try {
        await fetchTodayQueue();
      } catch {
        if (!cancelled) toast.error("Could not load queue — check clinic assignment or try again.");
      } finally {
        if (!cancelled) setQueueLoading(false);
      }
    };
    void runFetch();
    const poll = window.setInterval(() => {
      void fetchTodayQueue().catch(() => undefined);
    }, 45_000);
    /** Catch midnight while the tab stays open without waiting for the next poll. */
    const dayWatch = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (!isHelpdeskQueueCalendarDayStale()) return;
      void fetchTodayQueue().catch(() => undefined);
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!isHelpdeskQueueCalendarDayStale()) return;
      void fetchTodayQueue().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(dayWatch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchTodayQueue]);

  const openVitalsFor = useCallback(
    (id: string) => {
      setSelectedId(id);
      setVitalsEntryId(id);
      if (isMobile) {
        setMobileSheetMode("vitals");
        setMobileSheetOpen(true);
      } else {
        setVitalsDialogOpen(true);
      }
    },
    [isMobile]
  );

  const handleSelectRow = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (isMobile) {
        setMobileSheetMode("patient");
        setMobileSheetOpen(true);
      }
    },
    [isMobile]
  );

  const handleUrgent = useCallback(
    async (id: string) => {
      try {
        await moveToTop(id);
        toast.success("Moved to top");
      } catch {
        toast.error("Could not prioritize patient");
      }
    },
    [moveToTop]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await removeFromQueue(id);
        toast.message("Removed from queue");
        if (selectedId === id) setSelectedId(null);
        if (vitalsEntryId === id) {
          setVitalsEntryId(null);
          setVitalsDialogOpen(false);
        }
        setMobileSheetOpen(false);
      } catch {
        toast.error("Could not remove from queue");
      }
    },
    [removeFromQueue, selectedId, vitalsEntryId]
  );

  const persistVitals = useCallback(
    async (entry: QueueEntry, payload: HelpdeskVitalsPayload): Promise<boolean> => {
      if (!entry.visitId) {
        toast.error("Visit ID is missing. Please refresh queue and retry.");
        return false;
      }
      try {
        const { data } = await axiosClient.post<Record<string, unknown>>(`/visits/${entry.visitId}/vitals/`, {
          bp_systolic: payload.bp_systolic,
          bp_diastolic: payload.bp_diastolic,
          weight: payload.weight,
          height: payload.height,
          temperature: payload.temperature,
          temperature_unit: payload.temperature != null ? "f" : undefined,
        });
        saveVitals(entry.id, {
          bp_systolic: (data.bp_systolic as number | undefined) ?? payload.bp_systolic,
          bp_diastolic: (data.bp_diastolic as number | undefined) ?? payload.bp_diastolic,
          weight: (data.weight as number | undefined) ?? payload.weight,
          height: (data.height as number | undefined) ?? payload.height,
          temperature: (data.temperature as number | undefined) ?? payload.temperature,
        });
        void fetchTodayQueue().catch(() => undefined);
        return true;
      } catch (err) {
        let message = "Vitals were not saved to server. Please retry.";
        if (isAxiosError(err) && err.response?.data) {
          const d = err.response.data as { detail?: unknown; message?: string };
          if (typeof d.detail === "string") message = d.detail;
          else if (typeof d.message === "string") message = d.message;
        }
        toast.error(message);
        return false;
      }
    },
    [saveVitals, fetchTodayQueue]
  );

  const handleVitalsSave = useCallback(
    async (payload: HelpdeskVitalsPayload) => {
      if (!vitalsEntry) return;
      setVitalsSubmitting(true);
      try {
        const saved = await persistVitals(vitalsEntry, payload);
        if (!saved) return;
        toast.success("Vitals saved to server");
        if (isMobile) {
          setMobileSheetOpen(false);
        } else {
          setVitalsDialogOpen(false);
        }
        setVitalsEntryId(null);
      } finally {
        setVitalsSubmitting(false);
      }
    },
    [vitalsEntry, persistVitals, isMobile]
  );

  const welcomeName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "there";

  const activeInView = list.filter((e) => e.status !== "completed").length;
  const totalActive = entries.filter((e) => e.status !== "completed").length;

  const queueHeading = (
    <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-border/60 pb-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Active Queue</h2>
      <span className="text-sm tabular-nums text-muted-foreground">
        {activeInView} / {totalActive} active
      </span>
    </div>
  );

  const welcomeBlock = (
    <div className="space-y-1 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome, {welcomeName}</h1>
      <p className="text-sm text-muted-foreground">Manage ongoing patient flow.</p>
    </div>
  );

  const queueCard = (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      {queueHeading}
      <ActiveQueueList
        selectedId={selectedId}
        highlightedId={highlightedId}
        onSelectRow={handleSelectRow}
        onVitals={openVitalsFor}
        onUrgent={handleUrgent}
        onRemove={handleRemove}
        isLoading={queueLoading}
      />
    </div>
  );

  const rightPanel =
    selected && (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <QueuePatientPanel
          entry={selected}
          onOpenVitals={() => openVitalsFor(selected.id)}
          onUrgent={() => handleUrgent(selected.id)}
        />
      </div>
    );

  const vitalsFormNode =
    vitalsEntry && !vitalsFormLoading ? (
      <HelpdeskQueueVitalsForm
        key={vitalsEntry.id}
        patientName={vitalsEntry.name}
        ageGenderLine={ageGenderLine(vitalsEntry)}
        visitLabel={vitalsEntry.visitPnr ?? vitalsEntry.visitId}
        initial={vitalsFormInitial}
        isSubmitting={vitalsSubmitting}
        onCancel={() => {
          setVitalsDialogOpen(false);
          setMobileSheetOpen(false);
          setVitalsEntryId(null);
        }}
        onSave={handleVitalsSave}
      />
    ) : vitalsEntry && vitalsFormLoading ? (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Loading current vitals…
      </p>
    ) : null;

  return (
    <>
      <div className="hidden min-h-0 flex-1 flex-col gap-4 lg:flex">
        {welcomeBlock}
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[calc(100dvh-12rem)] rounded-xl border border-border/80 bg-muted/20"
        >
          <ResizablePanel defaultSize={42} minSize={32} className="min-h-0 p-4">
            <div className="h-full overflow-y-auto pr-1">{queueCard}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={58} className="min-h-0 p-4">
            <div className="h-full overflow-y-auto">
              {selected ? (
                rightPanel
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Select a patient for details and actions
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="min-h-0 flex-1 space-y-4 lg:hidden">
        {welcomeBlock}
        {queueCard}
      </div>

      <Sheet
        open={mobileSheetOpen}
        onOpenChange={(open) => {
          setMobileSheetOpen(open);
          if (!open) setVitalsEntryId(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>{mobileSheetMode === "vitals" ? "Vitals" : "Patient"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {mobileSheetMode === "patient" && selected ? (
              <QueuePatientPanel
                entry={selected}
                onOpenVitals={() => {
                  setVitalsEntryId(selected.id);
                  setMobileSheetMode("vitals");
                }}
                onUrgent={() => handleUrgent(selected.id)}
              />
            ) : null}
            {mobileSheetMode === "vitals" && vitalsEntry ? vitalsFormNode : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={vitalsDialogOpen}
        onOpenChange={(open) => {
          setVitalsDialogOpen(open);
          if (!open) setVitalsEntryId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vitals</DialogTitle>
            <DialogDescription>
              Review and update patient vitals before starting consultation.
            </DialogDescription>
          </DialogHeader>
          {vitalsFormNode}
        </DialogContent>
      </Dialog>
    </>
  );
}
