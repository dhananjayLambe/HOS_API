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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QueueEntry, QueueStatus } from "@/lib/helpdeskQueueStore";
import { maskMobile, vitalsPreviewLine } from "@/lib/helpdeskQueueStore";
import { cn } from "@/lib/utils";
import { ArrowUp, MoreVertical, Stethoscope } from "lucide-react";

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
}

export function HelpdeskQueueDesktopTable({
  entries,
  selectedId,
  highlightedId,
  onSelectRow,
  onVitals,
  onUrgent,
  onRemove,
}: HelpdeskQueueDesktopTableProps) {
  return (
    <div className="rounded-xl border border-border/80">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[14%]">Patient</TableHead>
            <TableHead className="w-[10%]">Age / gender</TableHead>
            <TableHead className="w-[8%]">Token</TableHead>
            <TableHead className="w-[12%]">Status</TableHead>
            <TableHead className="w-[22%]">Vitals</TableHead>
            <TableHead className="text-right w-[34%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            const badge = statusBadge(entry.status);
            const preview = vitalsPreviewLine(entry.vitals);
            const token = entry.token?.trim() || `#${index + 1}`;
            const canFlow = entry.status === "waiting" || entry.status === "vitals_done";
            return (
              <TableRow
                key={entry.id}
                data-queue-entry-id={entry.id}
                className={cn(
                  "cursor-pointer",
                  selectedId === entry.id && "bg-primary/5",
                  highlightedId === entry.id && "bg-primary/10"
                )}
                onClick={() => onSelectRow(entry.id)}
              >
                <TableCell className="align-middle font-medium">{entry.name}</TableCell>
                <TableCell className="align-middle text-sm text-muted-foreground">{ageGender(entry)}</TableCell>
                <TableCell className="align-middle tabular-nums text-sm">{token}</TableCell>
                <TableCell className="align-middle">
                  <Badge variant="outline" className={cn("border font-medium", badge.className)}>
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell className="align-middle text-sm text-muted-foreground">
                  {preview ?? "—"}
                </TableCell>
                <TableCell className="align-middle text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {canFlow ? (
                      <>
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
                      </>
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
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onRemove(entry.id)}
                          >
                            Remove
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
