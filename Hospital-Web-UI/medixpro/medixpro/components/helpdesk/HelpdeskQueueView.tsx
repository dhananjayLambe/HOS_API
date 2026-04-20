"use client";

import { ActiveQueueList } from "./ActiveQueueList";
import { PreConsultVitalsForm } from "./PreConsultVitalsForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  maskMobile,
  useFilteredQueueEntries,
  useHelpdeskQueueStore,
  type QueueEntry,
  type QueueStatus,
} from "@/lib/helpdeskQueueStore";
import { useIsMobile } from "@/components/ui/use-mobile";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/authContext";

const statusLabel: Record<QueueStatus, string> = {
  waiting: "Waiting",
  pre_consult: "Pre-Consult",
  with_doctor: "With Doctor",
};

function PanelBody({
  entry,
  onCheckIn,
  onUrgent,
  onVitalsSaved,
}: {
  entry: QueueEntry;
  onCheckIn: () => void;
  onUrgent: () => void;
  onVitalsSaved: (send: boolean) => void;
}) {
  const updateVitals = useHelpdeskQueueStore((s) => s.updateVitals);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{entry.name}</h3>
          <Badge variant="secondary">{statusLabel[entry.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">{maskMobile(entry.mobile)}</p>
      </div>

      {entry.status === "waiting" && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onCheckIn}>
            Check-in
          </Button>
          <Button type="button" variant="secondary" onClick={onUrgent}>
            ↑ Urgent
          </Button>
        </div>
      )}

      {entry.status === "pre_consult" && (
        <PreConsultVitalsForm
          patientName={entry.name}
          initial={entry.vitals}
          onSave={(v, sendToDoctor) => {
            updateVitals(entry.id, v, sendToDoctor);
            toast.success(sendToDoctor ? "Sent to doctor" : "Draft saved");
            onVitalsSaved(!!sendToDoctor);
          }}
          onSkip={() => {
            toast.message("Skipped vitals");
            onVitalsSaved(false);
          }}
        />
      )}

      {entry.status === "with_doctor" && (
        <p className="text-sm text-muted-foreground">Patient is with the doctor.</p>
      )}
    </div>
  );
}

export function HelpdeskQueueView() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const list = useFilteredQueueEntries();
  const entries = useHelpdeskQueueStore((s) => s.entries);
  const checkIn = useHelpdeskQueueStore((s) => s.checkIn);
  const moveToTop = useHelpdeskQueueStore((s) => s.moveToTop);
  const preConsultTargetId = useHelpdeskQueueStore((s) => s.preConsultTargetId);
  const setPreConsultTargetId = useHelpdeskQueueStore((s) => s.setPreConsultTargetId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selected = useMemo(() => entries.find((e) => e.id === selectedId) ?? null, [entries, selectedId]);

  useEffect(() => {
    if (!preConsultTargetId) return;
    setSelectedId(preConsultTargetId);
    if (isMobile) setSheetOpen(true);
    setPreConsultTargetId(null);
  }, [preConsultTargetId, isMobile, setPreConsultTargetId]);

  const handleCheckIn = (id: string) => {
    checkIn(id);
    setSelectedId(id);
    if (isMobile) setSheetOpen(true);
  };

  const handleOpenVitals = (id: string) => {
    setSelectedId(id);
    if (isMobile) setSheetOpen(true);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setSheetOpen(true);
  };

  const handleUrgent = (id: string) => {
    moveToTop(id);
    toast.success("Moved to top");
  };

  const welcomeName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "there";

  const queueHeading = (
    <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-border/60 pb-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Active Queue</h2>
      <span className="text-sm tabular-nums text-muted-foreground">
        {list.length} / {entries.length} active
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
        onSelect={handleSelect}
        onCheckIn={handleCheckIn}
        onOpenVitals={handleOpenVitals}
        onUrgent={handleUrgent}
      />
    </div>
  );

  const listElMobile = (
    <>
      {welcomeBlock}
      {queueCard}
    </>
  );

  const rightPanel =
    selected && (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PanelBody
          entry={selected}
          onCheckIn={() => handleCheckIn(selected.id)}
          onUrgent={() => handleUrgent(selected.id)}
          onVitalsSaved={() => {}}
        />
      </div>
    );

  return (
    <>
      {/* Desktop split */}
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
                  Click a patient to open details and vitals
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile stack */}
      <div className="min-h-0 flex-1 space-y-4 lg:hidden">{listElMobile}</div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Patient</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4">
              <PanelBody
                entry={selected}
                onCheckIn={() => handleCheckIn(selected.id)}
                onUrgent={() => handleUrgent(selected.id)}
                onVitalsSaved={(sent) => {
                  if (sent) setSheetOpen(false);
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
