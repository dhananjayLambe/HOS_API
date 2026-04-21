"use client";

import { QueueCard } from "./QueueCard";
import { useFilteredQueueEntries } from "@/lib/helpdeskQueueStore";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveQueueListProps {
  selectedId: string | null;
  highlightedId?: string | null;
  onSelect: (id: string) => void;
  onCheckIn: (id: string) => void;
  onOpenVitals: (id: string) => void;
  onUrgent: (id: string) => void;
  /** Phase 1: instant — reserved for future fetch */
  isLoading?: boolean;
}

export function ActiveQueueList({
  selectedId,
  highlightedId = null,
  onSelect,
  onCheckIn,
  onOpenVitals,
  onUrgent,
  isLoading = false,
}: ActiveQueueListProps) {
  const list = useFilteredQueueEntries();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center">
        <p className="text-sm font-medium text-foreground">No patients in queue</p>
        <p className="mt-1 text-sm text-muted-foreground">Add a patient from search or Patients tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((entry, index) => (
        <div
          key={entry.id}
          data-queue-entry-id={entry.id}
          className={[
            selectedId === entry.id ? "rounded-xl ring-2 ring-primary ring-offset-2" : "",
            highlightedId === entry.id ? "rounded-xl bg-primary/10 transition-colors duration-300" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <QueueCard
            entry={entry}
            position={index + 1}
            onOpen={() => onSelect(entry.id)}
            onCheckIn={() => onCheckIn(entry.id)}
            onOpenVitals={() => onOpenVitals(entry.id)}
            onUrgent={() => onUrgent(entry.id)}
          />
        </div>
      ))}
    </div>
  );
}
