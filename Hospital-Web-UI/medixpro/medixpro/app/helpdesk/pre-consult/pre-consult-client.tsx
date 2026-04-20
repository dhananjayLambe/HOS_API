"use client";

import { PreConsultVitalsForm } from "@/components/helpdesk/PreConsultVitalsForm";
import { Button } from "@/components/ui/button";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

export function HelpdeskPreConsultFallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const entries = useHelpdeskQueueStore((s) => s.entries);
  const updateVitals = useHelpdeskQueueStore((s) => s.updateVitals);

  const entry = useMemo(() => entries.find((e) => e.id === (id ?? "")) ?? null, [entries, id]);

  if (!id || !entry) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">Open pre-consult from the queue, or pick a patient first.</p>
        <Button type="button" asChild variant="secondary">
          <Link href="/helpdesk/queue">Back to queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Pre-consult</h1>
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/helpdesk/queue">Queue</Link>
        </Button>
      </div>
      <PreConsultVitalsForm
        patientName={entry.name}
        initial={entry.vitals}
        onSave={(v, sendToDoctor) => {
          updateVitals(entry.id, v, sendToDoctor);
          toast.success(sendToDoctor ? "Sent to doctor" : "Saved");
          router.push("/helpdesk/queue");
        }}
        onSkip={() => {
          toast.message("Skipped");
          router.push("/helpdesk/queue");
        }}
      />
    </div>
  );
}
