"use client";

import { QueueCard } from "./QueueCard";
import { HelpdeskQueueDesktopTable } from "./HelpdeskQueueDesktopTable";
import { isQueueEntryDraggable, useFilteredQueueEntries } from "@/lib/helpdeskQueueStore";
import { Skeleton } from "@/components/ui/skeleton";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

interface ActiveQueueListProps {
  selectedId: string | null;
  highlightedId?: string | null;
  onSelectRow: (id: string) => void;
  onVitals: (id: string) => void;
  onUrgent: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onReorder: (activeId: string, overId: string) => void | Promise<void>;
  onMove: (id: string, direction: "top" | "up" | "down" | "bottom") => void | Promise<void>;
  reorderDisabled: boolean;
  changedIds?: Set<string>;
  onDragStateChange?: (isDragging: boolean) => void;
  isLoading?: boolean;
}

export function ActiveQueueList({
  selectedId,
  highlightedId = null,
  onSelectRow,
  onVitals,
  onUrgent,
  onRemove,
  onReorder,
  onMove,
  reorderDisabled,
  changedIds,
  onDragStateChange,
  isLoading = false,
}: ActiveQueueListProps) {
  const list = useFilteredQueueEntries();
  const mobileSensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 220,
        tolerance: 8,
      },
    })
  );

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
          onReorder={onReorder}
          onMove={onMove}
          reorderDisabled={reorderDisabled}
          changedIds={changedIds}
          onDragStateChange={onDragStateChange}
        />
      </div>
      <div className="space-y-2 lg:hidden">
        <DndContext
          sensors={mobileSensors}
          collisionDetection={closestCenter}
          onDragStart={() => onDragStateChange?.(true)}
          onDragCancel={() => onDragStateChange?.(false)}
          onDragEnd={async (event: DragEndEvent) => {
            onDragStateChange?.(false);
            const activeId = String(event.active.id);
            const targetId = event.over ? String(event.over.id) : null;
            if (!targetId || activeId === targetId || reorderDisabled) return;
            await onReorder(activeId, targetId);
          }}
        >
          <SortableContext items={list.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
            {list.map((entry, index) => (
              <MobileSortableCard
                key={entry.id}
                entryId={entry.id}
                dragEnabled={isQueueEntryDraggable(entry.status) && !reorderDisabled}
                selected={selectedId === entry.id}
                highlighted={highlightedId === entry.id}
              >
                <QueueCard
                  entry={entry}
                  position={index + 1}
                  compact
                  onOpen={() => onSelectRow(entry.id)}
                  onVitals={() => onVitals(entry.id)}
                  onUrgent={() => onUrgent(entry.id)}
                  onRemove={() => onRemove(entry.id)}
                  onMove={(direction) => onMove(entry.id, direction)}
                  canMove={isQueueEntryDraggable(entry.status)}
                  disableMove={reorderDisabled}
                  isFirst={index === 0}
                  isLast={index === list.length - 1}
                />
              </MobileSortableCard>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}

function MobileSortableCard({
  entryId,
  dragEnabled,
  selected,
  highlighted,
  children,
}: {
  entryId: string;
  dragEnabled: boolean;
  selected: boolean;
  highlighted: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entryId,
    disabled: !dragEnabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-queue-entry-id={entryId}
      className={[
        selected ? "rounded-xl ring-2 ring-primary ring-offset-2" : "",
        highlighted ? "rounded-xl bg-primary/10 transition-colors duration-300" : "",
        isDragging ? "opacity-75 shadow-lg" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
