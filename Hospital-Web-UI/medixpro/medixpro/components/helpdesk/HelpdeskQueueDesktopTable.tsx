"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QueueEntry, QueueStatus } from "@/lib/helpdeskQueueStore";
import { isQueueEntryDraggable, maskMobile, vitalsPreviewLine } from "@/lib/helpdeskQueueStore";
import { cn } from "@/lib/utils";
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowDown,
  ArrowUp,
  GripVertical,
  MoreVertical,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";

function statusBadge(status: QueueStatus): { label: string; className: string } {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting",
        className:
          "border-muted-foreground/25 bg-muted text-muted-foreground dark:bg-muted/80",
      };
    case "vitals_done":
      return {
        label: "Pre-consult in progress",
        className:
          "border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-50",
      };
    case "in_consultation":
      return {
        label: "In consultation",
        className:
          "border-sky-300/80 bg-sky-50 text-sky-950 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-50",
      };
    case "completed":
      return {
        label: "Completed",
        className:
          "border-emerald-300/80 bg-emerald-50 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-50",
      };
  }
}

function ageGender(entry: QueueEntry): string {
  const age = entry.age != null ? `${entry.age}y` : "—";
  const g = entry.gender?.trim() || "—";
  return `${age} / ${g}`;
}

interface HelpdeskQueueDesktopTableProps {
  entries: QueueEntry[];
  selectedId: string | null;
  highlightedId: string | null;
  onSelectRow: (id: string) => void;
  onVitals: (id: string) => void;
  onUrgent: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onReorder: (activeId: string, overId: string) => void | Promise<void>;
  onMove: (id: string, direction: "top" | "up" | "down" | "bottom") => void | Promise<void>;
  reorderDisabled: boolean;
  changedIds?: Set<string>;
  onDragStateChange?: (isDragging: boolean) => void;
}

export function HelpdeskQueueDesktopTable({
  entries,
  selectedId,
  highlightedId,
  onSelectRow,
  onVitals,
  onUrgent,
  onRemove,
  onReorder,
  onMove,
  reorderDisabled,
  changedIds,
  onDragStateChange,
}: HelpdeskQueueDesktopTableProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    })
  );
  const activeDragEntry = entries.find((entry) => entry.id === activeDragId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    onDragStateChange?.(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    onDragStateChange?.(false);
    const activeId = String(event.active.id);
    const targetId = event.over ? String(event.over.id) : null;
    setActiveDragId(null);
    setOverId(null);
    if (!targetId || targetId === activeId || reorderDisabled) return;
    await onReorder(activeId, targetId);
  };

  return (
    <div className="rounded-xl border border-border/80">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={(event) => setOverId(event.over ? String(event.over.id) : null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          onDragStateChange?.(false);
          setActiveDragId(null);
          setOverId(null);
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[4%]"></TableHead>
              <TableHead className="w-[14%]">Patient</TableHead>
              <TableHead className="w-[10%]">Age / gender</TableHead>
              <TableHead className="w-[9%]">Position</TableHead>
              <TableHead className="w-[8%]">Token</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[18%]">Vitals</TableHead>
              <TableHead className="text-right w-[25%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={entries.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
              {entries.map((entry, index) => {
                const canFlow = entry.status === "waiting" || entry.status === "vitals_done";
                const isDraggable = isQueueEntryDraggable(entry.status) && !reorderDisabled;
                const isFirst = index === 0;
                const isLast = index === entries.length - 1;
                const rowChanged = changedIds?.has(entry.id) ?? false;
                return (
                  <SortableQueueRow
                    key={entry.id}
                    entry={entry}
                    index={index}
                    selectedId={selectedId}
                    highlightedId={highlightedId}
                    isDropTarget={!!overId && overId === entry.id && activeDragId !== entry.id}
                    rowChanged={rowChanged}
                    canFlow={canFlow}
                    isDraggable={isDraggable}
                    isFirst={isFirst}
                    isLast={isLast}
                    reorderDisabled={reorderDisabled}
                    onSelectRow={onSelectRow}
                    onVitals={onVitals}
                    onUrgent={onUrgent}
                    onRemove={onRemove}
                    onMove={onMove}
                  />
                );
              })}
            </SortableContext>
          </TableBody>
        </Table>
        <DragOverlay>
          {activeDragEntry ? (
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
              Reordering: {activeDragEntry.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

type SortableQueueRowProps = {
  entry: QueueEntry;
  index: number;
  selectedId: string | null;
  highlightedId: string | null;
  isDropTarget: boolean;
  rowChanged: boolean;
  canFlow: boolean;
  isDraggable: boolean;
  isFirst: boolean;
  isLast: boolean;
  reorderDisabled: boolean;
  onSelectRow: (id: string) => void;
  onVitals: (id: string) => void;
  onUrgent: (id: string) => void | Promise<void>;
  onRemove: (id: string) => void | Promise<void>;
  onMove: (id: string, direction: "top" | "up" | "down" | "bottom") => void | Promise<void>;
};

function SortableQueueRow({
  entry,
  index,
  selectedId,
  highlightedId,
  isDropTarget,
  rowChanged,
  canFlow,
  isDraggable,
  isFirst,
  isLast,
  reorderDisabled,
  onSelectRow,
  onVitals,
  onUrgent,
  onRemove,
  onMove,
}: SortableQueueRowProps) {
  const badge = statusBadge(entry.status);
  const preview = vitalsPreviewLine(entry.vitals);
  const token = entry.token?.trim() || `#${index + 1}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: !isDraggable,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-queue-entry-id={entry.id}
      className={cn(
        "cursor-pointer hover:bg-muted/30",
        selectedId === entry.id && "bg-primary/5",
        highlightedId === entry.id && "bg-primary/10",
        isDragging && "opacity-70 shadow-lg",
        isDropTarget && "border-t-2 border-primary",
        !isDraggable && "bg-muted/35",
        rowChanged && "animate-pulse"
      )}
      onClick={() => onSelectRow(entry.id)}
    >
      <TableCell className="align-middle">
        {isDraggable ? (
          <button
            type="button"
            aria-label={`Drag ${entry.name}`}
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:opacity-40"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
            disabled={reorderDisabled}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span
            aria-hidden
            className="inline-flex rounded p-1 text-muted-foreground/40"
            title="Reordering disabled for this status"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}
      </TableCell>
      <TableCell className="align-middle font-medium">{entry.name}</TableCell>
      <TableCell className="align-middle text-sm text-muted-foreground">{ageGender(entry)}</TableCell>
      <TableCell className="align-middle text-sm tabular-nums">#{index + 1}</TableCell>
      <TableCell className="align-middle tabular-nums text-sm">{token}</TableCell>
      <TableCell className="align-middle">
        <Badge variant="outline" className={cn("border font-medium", badge.className)}>
          {badge.label}
        </Badge>
      </TableCell>
      <TableCell className="align-middle text-sm text-muted-foreground">{preview ?? "—"}</TableCell>
      <TableCell className="align-middle text-right">
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Move to top"
            onClick={() => onMove(entry.id, "top")}
            disabled={!isDraggable || reorderDisabled || isFirst}
          >
            <ArrowBigUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Move up"
            onClick={() => onMove(entry.id, "up")}
            disabled={!isDraggable || reorderDisabled || isFirst}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Move down"
            onClick={() => onMove(entry.id, "down")}
            disabled={!isDraggable || reorderDisabled || isLast}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            title="Move to bottom"
            onClick={() => onMove(entry.id, "bottom")}
            disabled={!isDraggable || reorderDisabled || isLast}
          >
            <ArrowBigDown className="h-3.5 w-3.5" />
          </Button>
          {canFlow ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1 rounded-lg px-2"
              onClick={() => onVitals(entry.id)}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Vitals
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <p className="px-2 py-1.5 text-xs text-muted-foreground">{maskMobile(entry.mobile)}</p>
              {canFlow ? (
                <DropdownMenuItem onClick={() => onUrgent(entry.id)}>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Urgent
                </DropdownMenuItem>
              ) : null}
              {entry.status !== "completed" ? (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemove(entry.id)}>
                  Remove
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
