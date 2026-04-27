"use client";

import { QueueCard } from "./QueueCard";
import { HelpdeskQueueDesktopTable } from "./HelpdeskQueueDesktopTable";
import { useFilteredQueueEntries } from "@/lib/helpdeskQueueStore";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveQueueListProps {
  selectedId: string | null;
  highlightedId?: string | null;
  onSelectRow: (id: string) => void;
  onVitals: (id: string) => void;
  onUrgent: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  isLoading?: boolean;
}

export function ActiveQueueList({
  selectedId,
  highlightedId = null,
  onSelectRow,
  onVitals,
  onUrgent,
  onRemove,
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
    <>
      <div className="hidden space-y-3 lg:block">
        <HelpdeskQueueDesktopTable
          entries={list}
          selectedId={selectedId}
          highlightedId={highlightedId}
          onSelectRow={onSelectRow}
          onVitals={onVitals}
          onUrgent={onUrgent}
          onRemove={onRemove}
        />
      </div>
      <div className="space-y-3 lg:hidden">
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
              onOpen={() => onSelectRow(entry.id)}
              onVitals={() => onVitals(entry.id)}
              onUrgent={() => onUrgent(entry.id)}
              onRemove={() => onRemove(entry.id)}
            />
          </div>
        ))}
      </div>
    </>
  );
}
